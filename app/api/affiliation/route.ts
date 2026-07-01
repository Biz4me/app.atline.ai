import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Dashboard parrainage MONONIVEAU : filleuls directs (level 1) + commissions à plat.
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  const [me, referrals, commissions] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { username: true } }),
    db.atlineReferral.findMany({
      where: { referrerId: userId, level: 1 },
      orderBy: { createdAt: 'desc' },
      select: {
        createdAt: true,
        referred: { select: { firstName: true, lastName: true, photoUrl: true, plan: true } },
      },
    }),
    db.atlineCommission.findMany({
      where: { userId },
      select: { amount: true, status: true, month: true, paidAt: true },
    }),
  ])

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  let commissionsMonth = 0
  let commissionsPending = 0
  let commissionsPaid = 0
  for (const c of commissions) {
    if (c.status === 'CANCELLED' || c.status === 'BLOCKED') continue
    if (c.status === 'PAID') commissionsPaid += c.amount
    if (c.status === 'ELIGIBLE' && !c.paidAt) commissionsPending += c.amount
    if (new Date(c.month) >= monthStart) commissionsMonth += c.amount
  }

  const list = referrals.map((r) => {
    const fn = r.referred.firstName ?? ''
    const ln = r.referred.lastName ?? ''
    return {
      name: `${fn} ${ln}`.trim(),
      initials: `${fn[0] ?? ''}${ln[0] ?? ''}`.toUpperCase(),
      photoUrl: r.referred.photoUrl,
      plan: r.referred.plan,
      createdAt: r.createdAt,
    }
  })

  return NextResponse.json({
    code: me?.username ?? '',
    directCount: referrals.length,
    commissionsMonth,
    commissionsPending,
    commissionsPaid,
    referrals: list,
  })
}
