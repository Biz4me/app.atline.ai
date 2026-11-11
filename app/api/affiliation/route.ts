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

  /**
   * 🔴 `null`, ET PAS ZÉRO, DEPUIS LE 11 NOVEMBRE 2026. `AtlineCommission`
   * n'a **aucun écrivain dans les quatre dépôts** : cette boucle parcourait
   * toujours un tableau vide et l'écran annonçait « 0 € ce mois » à quelqu'un
   * dont les commissions ne sont calculées par rien.
   * 🧭 Zéro est un résultat — « tu n'as rien gagné ». `null` dit qu'il n'y a
   * pas de mécanisme. Les confondre fait passer une fonction manquante pour
   * une contre-performance, et c'est la pire des deux lectures.
   */
  let commissionsMonth: number | null = commissions.length ? 0 : null
  let commissionsPending: number | null = commissions.length ? 0 : null
  let commissionsPaid: number | null = commissions.length ? 0 : null
  for (const c of commissions) {
    if (c.status === 'CANCELLED' || c.status === 'BLOCKED') continue
    if (c.status === 'PAID') commissionsPaid = (commissionsPaid ?? 0) + c.amount
    if (c.status === 'ELIGIBLE' && !c.paidAt) commissionsPending = (commissionsPending ?? 0) + c.amount
    if (new Date(c.month) >= monthStart) commissionsMonth = (commissionsMonth ?? 0) + c.amount
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
