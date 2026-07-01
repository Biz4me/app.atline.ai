import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { slotsForDay } from '@/lib/availability'

// PUBLIC — info distributeur
export async function GET(_: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const user = await db.user.findUnique({ where: { username: slug }, select: { firstName: true, lastName: true } })
  if (!user) return NextResponse.json({ found: false }, { status: 404 })
  return NextResponse.json({ found: true, firstName: user.firstName, lastName: user.lastName })
}

// PUBLIC — réservation d'un créneau par un prospect
export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const user = await db.user.findUnique({ where: { username: slug }, select: { id: true } })
  if (!user) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const { name, email, slot } = await req.json()
  if (!name?.trim() || !slot) return NextResponse.json({ error: 'name and slot required' }, { status: 400 })

  const startAt = new Date(slot)
  if (isNaN(startAt.getTime()) || startAt.getTime() < Date.now()) return NextResponse.json({ error: 'invalid slot' }, { status: 400 })

  // Anti double-booking : le créneau doit toujours être libre
  const free = await slotsForDay(user.id, startAt.toISOString())
  if (!free.includes(startAt.toISOString())) return NextResponse.json({ error: 'slot taken' }, { status: 409 })

  // Crée le prospect (sous l'activité active) + le RDV
  const business = await db.userMlmBusiness.findFirst({ where: { userId: user.id, active: true } })
  let contactId: string | null = null
  if (business) {
    const parts = String(name).trim().split(/\s+/)
    const firstName = parts[0] ?? ''
    const lastName = parts.slice(1).join(' ')
    const c = await db.contact.create({
      data: {
        userId: user.id, mlmBusinessId: business.id, kind: 'PROSPECT',
        name: name.trim(), firstName: firstName || null, lastName: lastName || null,
        initials: ((firstName[0] ?? '?') + (lastName[0] ?? '')).toUpperCase(),
        accent: '#F97316',
        email: typeof email === 'string' && email.trim() ? email.trim() : null,
        source: 'RDV_INBOUND', prospectStage: 'PRESENTATION',
      },
    })
    contactId = c.id
  }

  await db.appointment.create({
    data: { userId: user.id, mlmBusinessId: business?.id ?? null, contactId, title: `RDV — ${name.trim()}`, startAt, type: 'AUTRE' },
  })

  return NextResponse.json({ ok: true }, { status: 201 })
}
