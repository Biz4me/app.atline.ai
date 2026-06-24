import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const business = await db.userMlmBusiness.findFirst({
    where: { userId: session.user.id, active: true },
    select: { id: true },
  })
  if (!business) return NextResponse.json({ plan: null })

  const plan = await db.dailyPlan.findUnique({
    where: { userId_mlmBusinessId_date: { userId: session.user.id, mlmBusinessId: business.id, date: today } },
    include: { tasks: { orderBy: { position: 'asc' } } },
  })

  return NextResponse.json({ plan })
}
