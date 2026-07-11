import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { db } from '@/lib/db'
import { buildContactSnapshot } from '@/lib/contact-snapshot'
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
    const [contactsCount, relancesDue, lessonsTotal, lessonsDone, nextRdv, sims] = await Promise.all([
      db.contact.count({ where: { userId } }),
      db.relance.count({ where: { userId, status: 'PENDING', dueAt: { lte: endOfDay } } }),
      db.lmsLesson.count(),
      db.userLessonProgress.count({ where: { userId, done: true } }),
      db.appointment.findFirst({
        where: { userId, done: false, startAt: { gte: now } },
        orderBy: { startAt: 'asc' },
        select: { title: true, startAt: true, contact: { select: { firstName: true, lastName: true } } },
      }),
      db.simSession.findMany({
        where: { userId, score: { not: null }, startedAt: { gte: new Date(now.getTime() - 30 * 86400000) } },
        orderBy: { startedAt: 'asc' },
        select: { characterId: true, score: true, startedAt: true, phase: true },
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
    // Entraînements Aria (30 j) : dernier score + PROGRESSION par scénario rejoué —
    // c'est ce qui permet à Atlas de dire « tu es passé de 45 à 70 sur l'objection pyramide ».
    if (sims.length) {
      const last = sims[sims.length - 1]
      lines.push(`Entraînements Aria (30 j) : ${sims.length} simulation${sims.length > 1 ? 's' : ''}, dernière : ${last.characterId.replace(/_/g, ' ')} — ${last.score}/100`)
      const byScenario = new Map<string, number[]>()
      for (const s of sims) {
        const arr = byScenario.get(s.characterId) ?? []
        arr.push(s.score!)
        byScenario.set(s.characterId, arr)
      }
      const prog = [...byScenario.entries()]
        .filter(([, scores]) => scores.length >= 2)
        .map(([sc, scores]) => `${sc.replace(/_/g, ' ')} : ${scores[0]} → ${scores[scores.length - 1]}/100 (${scores.length} essais)`)
      if (prog.length) lines.push(`Progression par scénario : ${prog.join(' · ')}`)
    }
    return lines.join('\n')
  } catch {
    return ''
  }
}

// Compaction : fenêtre de messages envoyée au service + résumé roulant pour l'au-delà.
const HISTORY_WINDOW = 24
// On régénère le résumé quand ce retard (messages non couverts, hors fenêtre) est atteint.
const SUMMARY_LAG = 12

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

  // Historique BORNÉ : fenêtre des derniers messages + résumé roulant pour le plus ancien
  // (la fenêtre ne grossit plus avec la conversation → latence et coût stables).
  const [totalPrior, lastMsgs, convMeta] = await Promise.all([
    db.atlasMessage.count({ where: { conversationId: cid } }),
    db.atlasMessage.findMany({
      where: { conversationId: cid },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_WINDOW,
      select: { role: true, content: true },
    }),
    db.atlasConversation.findFirst({ where: { id: cid }, select: { summary: true, summarizedCount: true } }),
  ])
  const conversation_history = lastMsgs.reverse().map((m) => ({
    role: m.role === 'USER' ? 'user' : 'assistant',
    content: m.content,
  }))
  const history_summary = totalPrior > HISTORY_WINDOW ? (convMeta?.summary ?? '') : ''

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
    for (const line of raw.split('\n')) {
      if (!line.startsWith('data: ')) continue
      const p = line.slice(6).trim()
      if (!p || p === '[DONE]') continue
      try {
        const d = JSON.parse(p)
        if (d.text) full += d.text
        else if (Array.isArray(d.resolved_contacts)) resolved.push(...d.resolved_contacts.filter((x: unknown): x is string => typeof x === 'string'))
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
            messages: older.map((m) => ({ role: m.role === 'USER' ? 'user' : 'assistant', content: m.content })),
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
