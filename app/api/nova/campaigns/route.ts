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

  // KPI de résultats par campagne : inscrits (à une réunion) et convertis.
  const ids = campaigns.map((c) => c.id)
  const inscrits: Record<string, number> = {}
  const convertis: Record<string, number> = {}
  if (ids.length) {
    const [insc, conv] = await Promise.all([
      db.lead.groupBy({ by: ['campaignId'], where: { campaignId: { in: ids }, meetingStatus: { not: null } }, _count: { _all: true } }),
      db.lead.groupBy({ by: ['campaignId'], where: { campaignId: { in: ids }, outcome: 'CONVERTI' }, _count: { _all: true } }),
    ])
    insc.forEach((r) => (inscrits[r.campaignId] = r._count._all))
    conv.forEach((r) => (convertis[r.campaignId] = r._count._all))
  }

  const out = campaigns.map((c) => ({
    ...c,
    stats: {
      posts: c._count.posts,
      leads: c._count.leads,
      inscrits: inscrits[c.id] ?? 0,
      convertis: convertis[c.id] ?? 0,
    },
  }))
  return NextResponse.json({ campaigns: out })
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
