import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Nav messagerie T7 — le journal d'entraînement d'Aria : les simulations débriefées,
// en ordre chronologique (le fil se lit comme une progression).
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await db.simSession.findMany({
    where: { userId: session.user.id, score: { not: null } },
    orderBy: { startedAt: 'asc' },
    take: 40,
    select: { id: true, characterId: true, phase: true, difficulty: true, score: true, feedback: true, startedAt: true },
  })
  return NextResponse.json(rows)
}
