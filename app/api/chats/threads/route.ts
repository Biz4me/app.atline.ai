import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Nav messagerie (tranche 0) — la liste des fils : agents épinglés + contacts de
// l'activité active triés par dernier échange. Les badges (= plan du jour) arrivent en T1.

async function activeBusinessId(userId: string): Promise<string | null> {
  const prefs = await db.userPreferences.findUnique({ where: { userId }, select: { activeCompanyId: true } })
  if (prefs?.activeCompanyId) {
    const b = await db.userMlmBusiness.findFirst({ where: { id: prefs.activeCompanyId, userId }, select: { id: true } })
    if (b) return b.id
  }
  const first = await db.userMlmBusiness.findFirst({ where: { userId }, orderBy: { position: 'asc' }, select: { id: true } })
  return first?.id ?? null
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  const bizId = await activeBusinessId(userId)

  // ── Agents épinglés : la dernière trace de chacun (best-effort, jamais bloquant) ──
  const now = new Date()
  const [atlasMsgs, lastSim, lastIdea, lastForum, nextRdv, simToday, contacts, contactChats] = await Promise.all([
    db.atlasMessage.findMany({
      where: { conversation: { userId, contactId: null, agent: 'atlas' } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { content: true, role: true, createdAt: true },
    }).catch(() => [] as { content: string; role: string; createdAt: Date }[]),
    db.simSession.findFirst({
      where: { userId, score: { not: null } },
      orderBy: { startedAt: 'desc' },
      select: { characterId: true, score: true, startedAt: true },
    }).catch(() => null),
    db.contentIdea.findFirst({
      where: { userId, ...(bizId ? { mlmBusinessId: bizId } : {}) },
      orderBy: { createdAt: 'desc' },
      select: { title: true, createdAt: true },
    }).catch(() => null),
    db.forumPost.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { content: true, createdAt: true, author: { select: { firstName: true } } },
    }).catch(() => null),
    // Aria proactive : un vrai RDV dans les 36 h → « on s'échauffe ? » (sauf si déjà entraîné aujourd'hui)
    db.appointment.findFirst({
      where: { userId, done: false, startAt: { gte: now, lte: new Date(now.getTime() + 36 * 3_600_000) } },
      orderBy: { startAt: 'asc' },
      select: { startAt: true, contact: { select: { firstName: true, name: true } } },
    }).catch(() => null),
    db.simSession.findFirst({
      where: { userId, score: { not: null }, startedAt: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) } },
      select: { id: true },
    }).catch(() => null),
    bizId
      ? db.contact.findMany({
          where: { userId, mlmBusinessId: bizId },
          orderBy: [{ lastContact: { sort: 'desc', nulls: 'last' } }, { updatedAt: 'desc' }],
          select: {
            id: true, name: true, firstName: true, initials: true, accent: true, kind: true,
            prospectStage: true, partnerStage: true, market: true, personality: true,
            lastContact: true, lastDraft: true, lastDraftAt: true, birthDate: true, signedAt: true,
          },
        })
      : Promise.resolve([]),
    // Activité de MESSAGERIE par contact : la liste vit au rythme des conversations, pas seulement du terrain
    db.atlasConversation.findMany({
      where: { userId, contactId: { not: null } },
      orderBy: { updatedAt: 'desc' },
      take: 300,
      select: { contactId: true, updatedAt: true },
    }).catch(() => [] as { contactId: string | null; updatedAt: Date }[]),
  ])

  const chatAt = new Map<string, Date>()
  for (const cv of contactChats) { if (cv.contactId && !chatAt.has(cv.contactId)) chatAt.set(cv.contactId, cv.updatedAt) }

  const clip = (s: string, n = 90) => (s.length > n ? `${s.slice(0, n).trimEnd()}…` : s)

  // Atlas : aperçu = dernier message VISIBLE d'Atlas. On saute les messages injectés côté user
  // (cadres [SESSION_…], prompt du plan) et les cartes [[ACTION]], et on coupe les marqueurs [[SAVE]]/[[OPEN]].
  // Le nombre d'actions du jour vit dans la pastille, pas dans cette ligne (aperçu calme, jamais un ordre).
  const cleanPreview = (s: string) => s.split('[[')[0].replace(/\s+/g, ' ').trim()
  const atlasVisible = atlasMsgs.find((m) => m.role !== 'USER' && !m.content.startsWith('[[ACTION') && cleanPreview(m.content))
  const atlasLine = atlasVisible ? clip(cleanPreview(atlasVisible.content)) : 'Ton coach, chaque jour'

  const agents = [
    {
      id: 'atlas',
      name: 'Atlas',
      role: 'coach',
      line: atlasLine,
      at: atlasVisible?.createdAt ?? atlasMsgs[0]?.createdAt ?? null,
    },
    {
      id: 'aria',
      name: 'Aria',
      role: 'simulateur',
      // Aperçu calme : un RDV approche (état, pas un ordre — la pastille signale « à faire »), sinon dernière simu.
      line: nextRdv && !simToday
        ? `RDV avec ${nextRdv.contact?.firstName ?? nextRdv.contact?.name ?? 'un contact'} ${nextRdv.startAt.toDateString() === now.toDateString() ? "aujourd'hui" : 'demain'}`
        : lastSim
          ? `Dernière simu : ${lastSim.characterId.replace(/_/g, ' ')} · ${lastSim.score}/100`
          : "Ton simulateur d'appels",
      at: (nextRdv && !simToday ? now : lastSim?.startedAt) ?? null,
      badge: nextRdv && !simToday ? 1 : 0,
    },
    {
      id: 'nova',
      name: 'Nova',
      role: 'social',
      line: lastIdea ? `Dernière idée : ${clip(lastIdea.title, 70)}` : 'Tes idées de contenu',
      at: lastIdea?.createdAt ?? null,
    },
    {
      id: 'communaute',
      name: 'Communauté',
      role: 'groupe',
      line: lastForum ? `${lastForum.author?.firstName ?? 'Un membre'} : ${clip(lastForum.content.replace(/\s+/g, ' '), 70)}` : 'Le fil des distributeurs',
      at: lastForum?.createdAt ?? null,
    },
  ]

  const threads = contacts.map((c) => ({
    contactId: c.id,
    name: c.name,
    prenom: c.firstName || c.name.split(' ')[0],
    initials: c.initials ?? c.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase(),
    accent: c.accent ?? '#F97316',
    kind: c.kind,
    stage: c.prospectStage ?? c.partnerStage ?? null,
    recruiting: c.kind === 'CLIENT' && !!c.prospectStage,
    market: c.market,
    personality: c.personality,
    lastContact: c.lastContact,
    lastChatAt: chatAt.get(c.id) ?? null,
    // « ✍️ Brouillon : … » — seulement si plus récent que le dernier échange (sinon il a été envoyé/dépassé)
    draft: c.lastDraft && (!c.lastContact || !c.lastDraftAt || c.lastDraftAt > c.lastContact) ? clip(c.lastDraft, 80) : null,
    birthdayToday: c.birthDate
      ? new Date(c.birthDate).getMonth() === new Date().getMonth() && new Date(c.birthDate).getDate() === new Date().getDate()
      : false,
    signedAt: c.signedAt,
  }))

  return NextResponse.json({ agents, threads })
}
