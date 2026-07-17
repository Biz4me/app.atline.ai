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
  const [lastAtlas, lastSim, lastIdea, lastForum, nextRdv, simToday, contacts] = await Promise.all([
    db.atlasMessage.findFirst({
      where: { conversation: { userId, contactId: null, agent: 'atlas' } },
      orderBy: { createdAt: 'desc' },
      select: { content: true, role: true, createdAt: true },
    }).catch(() => null),
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
  ])

  const clip = (s: string, n = 90) => (s.length > n ? `${s.slice(0, n).trimEnd()}…` : s)

  const agents = [
    {
      id: 'atlas',
      name: 'Atlas',
      role: 'coach',
      line: lastAtlas ? clip(lastAtlas.content.replace(/\s+/g, ' ')) : 'Ton coach — dis-lui bonjour',
      at: lastAtlas?.createdAt ?? null,
    },
    {
      id: 'aria',
      name: 'Aria',
      role: 'simulateur',
      // Veille de RDV : Aria propose l'échauffement d'avant-match (badge), sauf si déjà entraîné aujourd'hui.
      line: nextRdv && !simToday
        ? `Tu vois ${nextRdv.contact?.firstName ?? nextRdv.contact?.name ?? "quelqu'un"} ${nextRdv.startAt.toDateString() === now.toDateString() ? "aujourd'hui" : 'demain'} — on s'échauffe avant ?`
        : lastSim
          ? `Simulation « ${lastSim.characterId.replace(/_/g, ' ')} » : ${lastSim.score}/100`
          : "Ton sparring-partner — entraîne-toi avant d'appeler",
      at: (nextRdv && !simToday ? now : lastSim?.startedAt) ?? null,
      badge: nextRdv && !simToday ? 1 : 0,
    },
    {
      id: 'nova',
      name: 'Nova',
      role: 'social',
      line: lastIdea ? `Idée de post : ${clip(lastIdea.title, 70)}` : 'Ta community manager — bientôt tes idées de posts',
      at: lastIdea?.createdAt ?? null,
    },
    {
      id: 'communaute',
      name: 'Communauté',
      role: 'groupe',
      line: lastForum ? `${lastForum.author?.firstName ?? 'Un membre'} : ${clip(lastForum.content.replace(/\s+/g, ' '), 70)}` : 'Les distributeurs Atline échangent ici',
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
    // « ✍️ Brouillon : … » — seulement si plus récent que le dernier échange (sinon il a été envoyé/dépassé)
    draft: c.lastDraft && (!c.lastContact || !c.lastDraftAt || c.lastDraftAt > c.lastContact) ? clip(c.lastDraft, 80) : null,
    birthdayToday: c.birthDate
      ? new Date(c.birthDate).getMonth() === new Date().getMonth() && new Date(c.birthDate).getDate() === new Date().getDate()
      : false,
    signedAt: c.signedAt,
  }))

  return NextResponse.json({ agents, threads })
}
