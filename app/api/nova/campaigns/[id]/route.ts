import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

async function currentUserId() {
  const session = await getServerSession(authOptions)
  return session?.user?.id ?? null
}

// Champs éditables par le wizard (cloisonnés : userId/mlmBusinessId jamais patchables).
const ALLOWED = [
  'name',
  'goal',
  'audience',
  'offerPitch',
  'meetingFormat',
  'meetingConfig',
  'channels',
  'contentMode',
  'cadence',
  'status',
] as const

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await currentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await ctx.params
  const campaign = await db.campaign.findFirst({ where: { id, userId } })
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ campaign })
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await currentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await ctx.params
  const owned = await db.campaign.findFirst({ where: { id, userId }, select: { id: true } })
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const data: Record<string, unknown> = {}
  for (const key of ALLOWED) {
    if (key in body) data[key] = body[key]
  }
  const campaign = await db.campaign.update({ where: { id }, data })
  return NextResponse.json({ campaign })
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await currentUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await ctx.params
  const owned = await db.campaign.findFirst({ where: { id, userId }, select: { id: true } })
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await db.campaign.delete({ where: { id } }) // Lead en cascade ; ContentPost.campaignId → null
  return NextResponse.json({ ok: true })
}
