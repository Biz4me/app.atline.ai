import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  const existing = await db.appointment.findFirst({ where: { id, userId: session.user.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { title, startAt, type, done } = await req.json()
  const updated = await db.appointment.update({
    where: { id },
    data: {
      ...(title !== undefined && { title: String(title).trim() }),
      ...(startAt !== undefined && { startAt: new Date(startAt) }),
      ...(type !== undefined && { type: type as any }),
      ...(done !== undefined && { done: Boolean(done) }),
    },
  })
  return NextResponse.json({ id: updated.id })
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  const existing = await db.appointment.findFirst({ where: { id, userId: session.user.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.appointment.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
