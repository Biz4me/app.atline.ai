import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { db } from '@/lib/db'
import { buildContactSnapshot } from '@/lib/contact-snapshot'
import { buildAtlasSnapshot } from '@/lib/atlas-snapshot'
import { buildUserModel, contactFactLines, reflectUserMemory, reflectContactMemory } from '@/lib/atlas-memory'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Cerveau Atlas : FastAPI atline-ai-service, même serveur Hetzner (RAG Qdrant + Mem0 + Opus).
const ATLAS_URL = process.env.ATLAS_URL || 'http://127.0.0.1:8100'

// Titre lisible pour l'historique : les prompts internes (session, plan) ne doivent pas s'afficher bruts.
function convTitle(query: string): string {
  if (query.startsWith('[SESSION_POURQUOI]')) return 'Mon pourquoi'
  if (query.startsWith('[SESSION_RENCONTRE]')) return 'Ma rencontre'
  if (query.startsWith('[SESSION_MINDSET]')) return 'Mon état d’esprit'
  if (query.startsWith('[SESSION_OBJECTIFS]')) return 'Mes objectifs'
  if (query.startsWith('[SESSION_AUDIENCE]')) return 'Mon audience cible'
  if (query.startsWith('[SESSION_PARCOURS]')) return 'Mon parcours'
  if (query.startsWith('[SESSION_PRODUIT]')) return 'Mon offre phare'
  if (query.startsWith('[SESSION')) return 'Session Atlas'
  if (query.startsWith('Voici mes priorités') || query.startsWith('Avant de courir après les contacts') || query.startsWith("Je n'ai aucune priorité")) return 'Mon plan du jour'
  if (query.startsWith('Tu es Atlas, coach en marketing de réseau. Rédige')) return 'Message rédigé'
  return query.slice(0, 60)
}

// Compaction : fenêtre de messages envoyée au service + résumé roulant pour l'au-delà.
const HISTORY_WINDOW = 24
// On régénère le résumé quand ce retard (messages non couverts, hors fenêtre) est atteint.
const SUMMARY_LAG = 12

// Société active de l'utilisateur → envoyée comme mlm_actif pour scoper le RAG par société
// (atlas.py filtre atlas_mlm sur `societe` = mlm_actif slugifié). On prend le NOM (mlmName),
// robuste même si le slug stocké est incohérent. Défaut 'Atline' = pas de filtre (générique).
async function activeMlmName(userId: string): Promise<string> {
  const prefs = await db.userPreferences.findUnique({ where: { userId }, select: { activeCompanyId: true } })
  if (prefs?.activeCompanyId) {
    const b = await db.userMlmBusiness.findFirst({ where: { id: prefs.activeCompanyId, userId }, select: { mlmName: true } })
    if (b?.mlmName) return b.mlmName
  }
  const first = await db.userMlmBusiness.findFirst({ where: { userId }, orderBy: { position: 'asc' }, select: { mlmName: true } })
  return first?.mlmName || 'Atline'
}

export async function POST(req: NextRequest) {
  // user_id réel depuis la session NextAuth — jamais fourni par le client.
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const userId = token?.id as string | undefined
  if (!userId) return NextResponse.json({ error: 'non authentifié' }, { status: 401 })

  let body: { query?: string; conversationId?: string; mlm_actif?: string; contactId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 })
  }
  const query = (body.query ?? '').trim()
  if (!query) return NextResponse.json({ error: 'query vide' }, { status: 400 })

  // Résoudre / créer la conversation (propriété vérifiée)
  let conversationId = body.conversationId
  if (conversationId) {
    const owned = await db.atlasConversation.findFirst({
      where: { id: conversationId, userId },
      select: { id: true },
    })
    if (!owned) conversationId = undefined
  }
  if (!conversationId) {
    const conv = await db.atlasConversation.create({
      data: { userId, title: convTitle(query), context: body.contactId ? 'contact' : 'parcours', ...(body.contactId ? { contactId: body.contactId } : {}) },
      select: { id: true },
    })
    conversationId = conv.id
  }
  const cid = conversationId

  // Historique BORNÉ, ANCRÉ sur le résumé : on envoie tout ce que le résumé ne couvre pas
  // (préfixe stable entre deux régénérations → le cache prompt sert à ~0,1x), avec un
  // garde-fou glissant si la régénération échoue en boucle.
  const WINDOW_CAP = HISTORY_WINDOW + 2 * SUMMARY_LAG // 48 messages max envoyés
  const [totalPrior, convMeta] = await Promise.all([
    db.atlasMessage.count({ where: { conversationId: cid } }),
    db.atlasConversation.findFirst({ where: { id: cid }, select: { summary: true, summarizedCount: true } }),
  ])
  const covered = convMeta?.summarizedCount ?? 0
  const skip = totalPrior - covered > WINDOW_CAP ? totalPrior - WINDOW_CAP : covered
  const lastMsgs = await db.atlasMessage.findMany({
    where: { conversationId: cid },
    orderBy: { createdAt: 'asc' },
    skip,
    select: { role: true, content: true },
  })
  // Les messages [[ACTION]] sont des cartes UI, pas du dialogue : jamais envoyés au modèle.
  const conversation_history = lastMsgs.filter((m) => !m.content.startsWith('[[ACTION')).map((m) => ({
    role: m.role === 'USER' ? 'user' : 'assistant',
    content: m.content,
  }))
  const history_summary = skip > 0 ? (convMeta?.summary ?? '') : ''

  // Sauver le message utilisateur
  await db.atlasMessage.create({
    data: { conversationId: cid, role: 'USER', content: query, qdrantChunks: [] },
  })

  // Instantané données user + mémoire vivante — uniquement en chat normal (pas en session/rédaction).
  const isSession = query.startsWith('[SESSION')
  const isDraft = query.includes('Rédige UN message prêt à envoyer') || query.startsWith('Tu es Atlas, coach en marketing de réseau. Rédige')
  const [user_snapshot, user_model] = isSession || isDraft
    ? ['', '']
    : await Promise.all([buildAtlasSnapshot(userId), buildUserModel(userId)])
  // Contexte contact : snapshot + faits atomiques retenus sur lui.
  let contact_snapshot = ''
  if (body.contactId && !isSession && !isDraft) {
    const [snap, factLines] = await Promise.all([
      buildContactSnapshot(userId, body.contactId),
      contactFactLines(userId, body.contactId),
    ])
    contact_snapshot = factLines ? `${snap}\n\nFaits retenus sur ce contact :\n${factLines}` : snap
  }

  // Société active réelle (le client envoie 'Atline' en dur → on le remplace côté serveur
  // pour activer le filtrage RAG par société). Le nom contourne un éventuel slug incohérent.
  const mlmActif = await activeMlmName(userId)

  // Existe-t-il une fiche société PUBLIÉE pour cette société ? Le service s'en sert pour
  // l'ancrage : sans fiche validée, Atlas ne doit pas inventer et demande un PDF/lien.
  const brandSlug = mlmActif.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const company = mlmActif.toLowerCase() !== 'atline'
    ? await db.mlmCompany.findFirst({ where: { brandSlug, status: 'PUBLISHED' }, select: { id: true } })
    : null
  const hasFiche = !!company

  // Catalogue produit STRUCTURÉ (prix exacts) → injecté dans la requête pour qu'Atlas lise
  // le prix de façon déterministe, sans dépendre du RAG.
  let productsCatalog = ''
  if (company) {
    const prods = await db.mlmProduct.findMany({
      where: { companyId: company.id, status: 'PUBLISHED' },
      orderBy: { position: 'asc' },
      select: { name: true, price: true, currency: true, format: true },
      take: 250,
    })
    productsCatalog = prods
      .map((p) => `- ${p.name}${p.price != null ? ` — ${Number(p.price).toFixed(2)} ${p.currency}` : ''}${p.format ? ` (${p.format})` : ''}`)
      .join('\n')
  }

  // Appel FastAPI
  let resp: Response
  try {
    resp = await fetch(`${ATLAS_URL}/api/atlas/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        user_id: userId,
        mlm_actif: mlmActif,
        has_fiche: hasFiche,
        products_catalog: productsCatalog,
        conversation_history,
        history_summary,
        user_model,
        user_snapshot,
        contact_snapshot,
      }),
    })
  } catch {
    return NextResponse.json({ error: 'Atlas indisponible' }, { status: 502 })
  }
  if (!resp.ok || !resp.body) {
    return NextResponse.json({ error: 'Atlas indisponible' }, { status: 502 })
  }

  // tee : une branche pour le client, une branche consommée côté serveur.
  // La sauvegarde ne dépend PAS du client → si l'utilisateur quitte en plein streaming,
  // la réponse d'Atlas est quand même persistée (le fetch FastAPI continue côté serveur).
  const [toClient, toSave] = resp.body.tee()

  void (async () => {
    const decoder = new TextDecoder()
    let raw = ''
    const reader = toSave.getReader()
    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        raw += decoder.decode(value, { stream: true })
      }
    } catch {
      /* flux interrompu : on sauvegarde ce qu'on a */
    }
    let full = ''
    const resolved: string[] = []
    const proposals: unknown[] = []
    for (const line of raw.split('\n')) {
      if (!line.startsWith('data: ')) continue
      const p = line.slice(6).trim()
      if (!p || p === '[DONE]') continue
      try {
        const d = JSON.parse(p)
        if (d.text) full += d.text
        else if (Array.isArray(d.resolved_contacts)) resolved.push(...d.resolved_contacts.filter((x: unknown): x is string => typeof x === 'string'))
        else if (d.action_proposal?.kind) proposals.push(d.action_proposal)
      } catch {
        /* ligne SSE partielle, ignorée */
      }
    }
    try {
      if (full) {
        await db.atlasMessage.create({
          data: { conversationId: cid, role: 'ASSISTANT', content: full, qdrantChunks: [] },
        })
      }
      // Les PROPOSITIONS d'action survivent au refresh : persistées en messages [[ACTION]]{json},
      // rendues en cartes par les chargeurs de fil, marquées [[ACTION_DONE]] à la confirmation.
      for (const a of proposals) {
        await db.atlasMessage.create({
          data: { conversationId: cid, role: 'ASSISTANT', content: `[[ACTION]]${JSON.stringify(a)}`, qdrantChunks: [] },
        })
      }
      await db.atlasConversation.update({ where: { id: cid }, data: { updatedAt: new Date() } })
    } catch {
      /* persistance best-effort */
    }

    // Write-back mémoire (tâche de fond) :
    // 1) contacts concernés (fiche = contactId explicite ; accueil = contacts résolus par l'outil)
    // 2) mémoire vivante de l'UTILISATEUR (profil dialectique + faits atomiques)
    const answer = full.replace(/\s*\[\[[A-Z]+\]\][\s\S]*$/, '').trim()
    if (answer) {
      const toReflect = [...new Set([body.contactId, ...resolved].filter((x): x is string => !!x))]
      for (const cid2 of toReflect) await reflectContactMemory(userId, cid2, query, answer)
      if (!isSession && !isDraft) await reflectUserMemory(userId, query, answer)
    }

    // 3) résumé roulant : quand assez de messages sont sortis de la fenêtre, on compacte.
    try {
      const total = await db.atlasMessage.count({ where: { conversationId: cid } })
      const covered = convMeta?.summarizedCount ?? 0
      const target = total - HISTORY_WINDOW // on résume tout ce qui est hors fenêtre
      if (target - covered >= SUMMARY_LAG) {
        const older = await db.atlasMessage.findMany({
          where: { conversationId: cid },
          orderBy: { createdAt: 'asc' },
          skip: covered,
          take: target - covered,
          select: { role: true, content: true },
        })
        const sr = await fetch(`${ATLAS_URL}/api/atlas/summarize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prior_summary: convMeta?.summary ?? '',
            messages: older.filter((m) => !m.content.startsWith('[[ACTION')).map((m) => ({ role: m.role === 'USER' ? 'user' : 'assistant', content: m.content })),
          }),
          signal: AbortSignal.timeout(30000),
        })
        if (sr.ok) {
          const { summary } = await sr.json()
          if (typeof summary === 'string' && summary.trim()) {
            await db.atlasConversation.update({
              where: { id: cid },
              data: { summary: summary.trim(), summarizedCount: target },
            })
          }
        }
      }
    } catch {
      /* compaction best-effort */
    }
  })()

  return new Response(toClient, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
      'X-Conversation-Id': cid,
    },
  })
}
