import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [contactCount, simSessions, referrals, rdvCount, simCount, certCount] = await Promise.all([
    db.contact.count({ where: { userId } }),
    db.simSession.findMany({
      where: { userId, score: { not: null }, createdAt: { gte: thirtyDaysAgo } },
      select: { score: true },
    }),
    db.atlineReferral.findMany({
      where: { referrerId: userId, level: 1 },
      select: { referredId: true },
    }),
    db.appointment.count({ where: { userId } }),
    db.simSession.count({ where: { userId } }),
    db.certificate.count({ where: { userId } }),
  ])

  // Score ARIA : moyenne sur 30 jours
  const ariaScore = simSessions.length > 0
    ? Math.round(simSessions.reduce((sum, s) => sum + (s.score ?? 0), 0) / simSessions.length)
    : null

  // Partenaires actifs : filleuls N1 avec plan actif
  const referredIds = referrals.map((r) => r.referredId)
  const activePartners = referredIds.length > 0
    ? await db.user.count({
        where: { id: { in: referredIds }, plan: { not: 'FREE' } },
      })
    : 0

  return NextResponse.json({
    contacts: contactCount,
    ariaScore,
    activePartners,
    totalPartners: referredIds.length,
    rdv: rdvCount,
    simCount,
    certificates: certCount,
  })
}
