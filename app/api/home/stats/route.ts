import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const [contactCount, simSessions, referrals, rdvCount, simCount, certCount,
    relancesDues, rdvWeek, tunnel, contactsWeek, lessonsTotal, lessonsDone, campaignCount, leadCount] = await Promise.all([
    db.contact.count({ where: { userId } }),
    db.simSession.findMany({
      where: { userId, score: { not: null }, startedAt: { gte: thirtyDaysAgo } },
      select: { score: true },
    }),
    db.atlineReferral.findMany({
      where: { referrerId: userId, level: 1 },
      select: { referredId: true },
    }),
    db.appointment.count({ where: { userId } }),
    db.simSession.count({ where: { userId } }),
    db.certificate.count({ where: { userId } }),
    // Tableau de bord : le reste du réel
    db.relance.count({ where: { userId, status: 'PENDING', dueAt: { lte: now } } }),
    db.appointment.count({ where: { userId, done: false, startAt: { gte: now, lte: inSevenDays } } }),
    db.contact.groupBy({ by: ['prospectStage'], where: { userId, kind: 'PROSPECT' }, _count: { _all: true } }),
    db.contact.count({ where: { userId, createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } } }),
    db.lmsLesson.count(),
    db.userLessonProgress.count({ where: { userId, done: true } }),
    db.campaign.count({ where: { userId } }),
    db.lead.count({ where: { campaign: { userId } } }),
  ])

  // Score ARIA : moyenne sur 30 jours
  const ariaScore = simSessions.length > 0
    ? Math.round(simSessions.reduce((sum, s) => sum + (s.score ?? 0), 0) / simSessions.length)
    : null

  // Partenaires actifs : filleuls N1 avec plan actif
  const referredIds = referrals.map((r) => r.referredId)
  const activePartners = referredIds.length > 0
    ? await db.user.count({
        // Actif = abonnement Stripe en cours (le plan seul ne dit pas si c'est payé)
        where: { id: { in: referredIds }, subscription: { is: { status: { in: ['ACTIVE', 'TRIALING'] } } } },
      })
    : 0

  // Tunnel prospect condensé en 4 segments (couleurs charte côté front)
  const stageCount = (stages: string[]) =>
    tunnel.filter((t) => t.prospectStage && stages.includes(t.prospectStage)).reduce((s, t) => s + t._count._all, 0)

  return NextResponse.json({
    contacts: contactCount,
    ariaScore,
    activePartners,
    totalPartners: referredIds.length,
    rdv: rdvCount,
    simCount,
    certificates: certCount,
    relancesDues,
    rdvWeek,
    contactsWeek,
    tunnel: {
      nouveau: stageCount(['NOUVEAU']),
      invitation: stageCount(['INVITATION', 'PRESENTATION']),
      suivi: stageCount(['SUIVI']),
      closing: stageCount(['CLOSING']),
    },
    formationPct: lessonsTotal > 0 ? Math.round((lessonsDone / lessonsTotal) * 100) : 0,
    nova: { campaigns: campaignCount, leads: leadCount },
  })
}
