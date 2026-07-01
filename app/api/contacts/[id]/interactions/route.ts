import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { logInteraction, type InteractionType } from '@/lib/interactions'

async function ownedContact(id: string, userId: string) {
  return db.contact.findFirst({ where: { id, userId } })
}

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  if (!(await ownedContact(id, session.user.id))) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const rows = await db.interaction.findMany({ where: { contactId: id }, orderBy: { createdAt: 'desc' }, take: 100 })
  return NextResponse.json(rows.map(r => ({
    id: r.id,
    type: r.type,
    direction: r.direction,
    outcome: r.outcome,
    body: r.body,
    isExposure: r.isExposure,
    createdAt: r.createdAt.toISOString(),
  })))
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  if (!(await ownedContact(id, session.user.id))) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  if (!body?.type) return NextResponse.json({ error: 'type required' }, { status: 400 })

  const interaction = await logInteraction({
    contactId: id,
    userId: session.user.id,
    type: body.type as InteractionType,
    direction: body.direction === 'IN' ? 'IN' : 'OUT',
    outcome: body.outcome ?? null,
    body: body.body ?? null,
    isExposure: body.isExposure ?? undefined,
  })

  return NextResponse.json({ id: interaction.id }, { status: 201 })
}
