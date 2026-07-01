import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const contactId = searchParams.get('contactId')

  const rows = await db.appointment.findMany({
    where: {
      userId: session.user.id,
      // fiche contact = uniquement les RDV à venir ; agenda (sans contactId) = tout
      ...(contactId ? { contactId, done: false } : {}),
    },
    orderBy: { startAt: 'asc' },
    take: 200,
    include: { contact: { select: { name: true, city: true } } },
  })
  return NextResponse.json(rows.map(a => ({
    id: a.id,
    title: a.title,
    startAt: a.startAt.toISOString(),
    type: a.type,
    done: a.done,
    contactId: a.contactId,
    contactName: a.contact?.name ?? null,
    contactCity: a.contact?.city ?? null,
  })))
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { contactId, title, startAt, type } = await req.json()
  if (!title?.trim() || !startAt) return NextResponse.json({ error: 'title and startAt required' }, { status: 400 })

  // Si lié à un contact, vérifier la propriété + récupérer le business
  let mlmBusinessId: string | null = null
  if (contactId) {
    const c = await db.contact.findFirst({ where: { id: contactId, userId: session.user.id } })
    if (!c) return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    mlmBusinessId = c.mlmBusinessId
  }

  const appt = await db.appointment.create({
    data: {
      userId: session.user.id,
      contactId: contactId ?? null,
      mlmBusinessId,
      title: title.trim(),
      startAt: new Date(startAt),
      type: (type ?? 'AUTRE') as any,
    },
  })
  return NextResponse.json({ id: appt.id }, { status: 201 })
}
