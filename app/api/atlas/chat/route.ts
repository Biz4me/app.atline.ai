import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { db } from '@/lib/db'

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

// Instantané compact des données de l'utilisateur → Atlas répond avec la vraie valeur
// (objectif, offre, relances…) au lieu d'inventer. Une ligne par info renseignée, sinon omise.
async function buildAtlasSnapshot(userId: string): Promise<string> {
  try {
    const prefs = await db.userPreferences.findUnique({ where: { userId }, select: { activeCompanyId: true } })
    const biz = prefs?.activeCompanyId
      ? await db.userMlmBusiness.findFirst({ where: { id: prefs.activeCompanyId, userId } })
      : await db.userMlmBusiness.findFirst({ where: { userId }, orderBy: { position: 'asc' } })

    const now = new Date()
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
    const [contactsCount, relancesDue, lessonsTotal, lessonsDone, nextRdv] = await Promise.all([
      db.contact.count({ where: { userId } }),
      db.relance.count({ where: { userId, status: 'PENDING', dueAt: { lte: endOfDay } } }),
      db.lmsLesson.count(),
      db.userLessonProgress.count({ where: { userId, done: true } }),
      db.appointment.findFirst({
        where: { userId, done: false, startAt: { gte: now } },
        orderBy: { startAt: 'asc' },
        select: { title: true, startAt: true, contact: { select: { firstName: true, lastName: true } } },
      }),
    ])

    const lines: string[] = []
    if (biz) {
      let head = `Activité active : ${biz.mlmName}`
      if (biz.rank) head += ` · rang ${biz.rank}`
      if (biz.startDate) head += ` · démarrage ${biz.startDate}`
      lines.push(head)
      if (biz.produit) lines.push(`Offre phare : ${biz.produit}`)
      if (biz.audience) lines.push(`Audience cible : ${biz.audience}`)
      const o = (biz.objectif ?? null) as { mensuel?: string; m3?: string; m6?: string; m12?: string } | null
      if (o && (o.mensuel || o.m3 || o.m6 || o.m12)) {
        const seg = [o.mensuel && `${o.mensuel}/mois`, o.m3 && `${o.m3} à 3 mois`, o.m6 && `${o.m6} à 6 mois`, o.m12 && `${o.m12} à 12 mois`].filter(Boolean).join(', ')
        lines.push(`Objectif de recrutement : ${seg} (partenaires)`)
      }
      // Structure de départ logguée dans Atline (les ventes/commissions réelles vivent dans le back-office du MLM, pas ici).
      const st = (biz.structure ?? null) as { directs?: string; total?: string; clients?: string } | null
      if (st && (Number(st.directs) || Number(st.total) || Number(st.clients))) {
        const seg = [Number(st.directs) && `${st.directs} partenaires directs`, Number(st.total) && `${st.total} dans l'organisation`, Number(st.clients) && `${st.clients} clients`].filter(Boolean).join(', ')
        lines.push(`Structure de départ (déclarée) : ${seg}`)
      }
    }
    lines.push(`Contacts : ${contactsCount} au total`)
    if (relancesDue > 0) lines.push(`Relances à faire (échéance ≤ aujourd'hui) : ${relancesDue}`)
    if (lessonsTotal > 0) lines.push(`Formation : ${Math.round((lessonsDone / lessonsTotal) * 100)}% des leçons (${lessonsDone}/${lessonsTotal})`)
    if (nextRdv) {
      const when = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(nextRdv.startAt)
      const who = nextRdv.contact ? ` avec ${[nextRdv.contact.firstName, nextRdv.contact.lastName].filter(Boolean).join(' ')}` : ''
      lines.push(`Prochain rendez-vous : ${nextRdv.title}${who} — ${when}`)
    }
    return lines.join('\n')
  } catch {
    return ''
  }
}

// Snapshot d'UN contact (fiche) → Atlas connaît la personne : faits durs + qualification
// (modèle explicite) + note + sa mémoire auto-éditée + dernières interactions.
async function buildContactSnapshot(userId: string, contactId: string): Promise<string> {
  try {
    const c = await db.contact.findFirst({ where: { id: contactId, userId } })
    if (!c) return ''
    const q = (c.qualification ?? null) as Record<string, string> | null
    const interactions = await db.interaction.findMany({
      where: { contactId, userId }, orderBy: { createdAt: 'desc' }, take: 3,
      select: { type: true, outcome: true, createdAt: true },
    })
    const lines: string[] = [`Contact : ${c.name}`]
    const kindLabel = c.kind === 'CLIENT' ? 'Client' : c.kind === 'PARTENAIRE' ? 'Partenaire' : 'Prospect'
    let statut = kindLabel
    if (c.prospectStage) statut += ` · tunnel : ${c.prospectStage}`
    if (c.partnerStage) statut += ` · partenaire : ${c.partnerStage}`
    lines.push(`Statut : ${statut}`)
    if (c.market) lines.push(`Marché (proximité) : ${({ CHAUD: 'chaud', TIEDE: 'tiède', FROID: 'froid' } as Record<string, string>)[c.market] ?? c.market}`)
    if (c.personality) lines.push(`Couleur (Big Al) : ${c.personality}`)
    if (q) {
      const ql = [q.situation && `situation: ${q.situation}`, q.interests && `intérêts: ${q.interests}`, q.motivation && `motivation: ${q.motivation}`, q.insatisfaction && `insatisfaction: ${q.insatisfaction}`, q.reseau && `réseau: ${q.reseau}`, q.ouverture && `ouverture: ${q.ouverture}`].filter(Boolean).join(' · ')
      if (ql) lines.push(`Qualification : ${ql}`)
    }
    if (typeof c.exposures === 'number' && c.exposures > 0) lines.push(`Expositions : ${c.exposures}`)
    if (c.note) lines.push(`Note : ${c.note}`)
    if (c.atlasMemory) lines.push(`Ta mémoire sur lui : ${c.atlasMemory}`)
    if (interactions.length) {
      const il = interactions.map((i) => `${i.type.toLowerCase()}${i.outcome ? ` (${i.outcome.toLowerCase()})` : ''} le ${i.createdAt.toLocaleDateString('fr-FR')}`).join(' · ')
      lines.push(`Dernières interactions : ${il}`)
    }
    return lines.join('\n')
  } catch {
    return ''
  }
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
      data: { userId, title: convTitle(query), context: 'parcours' },
      select: { id: true },
    })
    conversationId = conv.id
  }
  const cid = conversationId

  // Historique DB (avant d'ajouter le message courant) → contexte conversationnel
  const prior = await db.atlasMessage.findMany({
    where: { conversationId: cid },
    orderBy: { createdAt: 'asc' },
    select: { role: true, content: true },
  })
  const conversation_history = prior.map((m) => ({
    role: m.role === 'USER' ? 'user' : 'assistant',
    content: m.content,
  }))

  // Sauver le message utilisateur
  await db.atlasMessage.create({
    data: { conversationId: cid, role: 'USER', content: query, qdrantChunks: [] },
  })

  // Instantané données user — uniquement en chat normal (pas en session ni en rédaction de message).
  const isSession = query.startsWith('[SESSION')
  const isDraft = query.includes('Rédige UN message prêt à envoyer') || query.startsWith('Tu es Atlas, coach en marketing de réseau. Rédige')
  const user_snapshot = isSession || isDraft ? '' : await buildAtlasSnapshot(userId)
  // Contexte contact : uniquement si la fiche passe un contactId (composeur scopé).
  const contact_snapshot = body.contactId && !isSession && !isDraft ? await buildContactSnapshot(userId, body.contactId) : ''

  // Appel FastAPI
  let resp: Response
  try {
    resp = await fetch(`${ATLAS_URL}/api/atlas/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        user_id: userId,
        mlm_actif: body.mlm_actif ?? 'Atline',
        conversation_history,
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
    for (const line of raw.split('\n')) {
      if (!line.startsWith('data: ')) continue
      const p = line.slice(6).trim()
      if (!p || p === '[DONE]') continue
      try {
        const d = JSON.parse(p)
        if (d.text) full += d.text
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
      await db.atlasConversation.update({ where: { id: cid }, data: { updatedAt: new Date() } })
    } catch {
      /* persistance best-effort */
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
