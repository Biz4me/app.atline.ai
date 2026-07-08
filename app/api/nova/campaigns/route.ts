import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// Contexte : user connecté + activité MLM active (cloisonnement).
async function ctx() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  const prefs = await db.userPreferences.findUnique({ where: { userId: session.user.id } })
  return { userId: session.user.id, mlmBusinessId: prefs?.activeCompanyId ?? null }
}

export async function GET() {
  const c = await ctx()
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const campaigns = await db.campaign.findMany({
    where: { userId: c.userId, ...(c.mlmBusinessId ? { mlmBusinessId: c.mlmBusinessId } : {}) },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { leads: true, posts: true } } },
  })
  return NextResponse.json({ campaigns })
}

export async function POST(req: Request) {
  const c = await ctx()
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!c.mlmBusinessId) return NextResponse.json({ error: 'Aucune activité MLM active' }, { status: 400 })
  const body = await req.json().catch(() => ({}))
  const goal = body?.goal === 'CLIENTS' ? 'CLIENTS' : 'PARTENAIRES'
  const campaign = await db.campaign.create({
    data: { userId: c.userId, mlmBusinessId: c.mlmBusinessId, goal, status: 'BROUILLON' },
  })
  return NextResponse.json({ campaign })
}
