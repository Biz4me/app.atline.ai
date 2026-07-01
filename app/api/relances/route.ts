import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const contactId = searchParams.get('contactId')

  const rows = await db.relance.findMany({
    where: {
      userId: session.user.id,
      status: 'PENDING',
      ...(contactId ? { contactId } : {}),
    },
    orderBy: { dueAt: 'asc' },
    take: 50,
  })
  return NextResponse.json(rows.map(r => ({
    id: r.id,
    channel: r.channel,
    dueAt: r.dueAt.toISOString(),
    message: r.message,
    status: r.status,
    contactId: r.contactId,
  })))
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { contactId, dueAt, channel, message } = await req.json()
  if (!contactId || !dueAt) return NextResponse.json({ error: 'contactId and dueAt required' }, { status: 400 })

  const c = await db.contact.findFirst({ where: { id: contactId, userId: session.user.id } })
  if (!c) return NextResponse.json({ error: 'Contact not found' }, { status: 404 })

  const relance = await db.relance.create({
    data: {
      userId: session.user.id,
      contactId,
      channel: channel ?? 'email',
      dueAt: new Date(dueAt),
      message: message ?? null,
    },
  })
  return NextResponse.json({ id: relance.id }, { status: 201 })
}
