import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

function toStage(c: { kind: string; prospectStage: string | null; clientStage: string | null; partnerStage: string | null }) {
  if (c.kind === 'CLIENT') return 'client'
  if (c.kind === 'PARTENAIRE') return 'partenaire'
  if (c.prospectStage === 'CHAUD') return 'chaud'
  if (c.prospectStage === 'QUALIFIE' || c.prospectStage === 'CONTACTE') return 'prospect'
  return 'nouveau'
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const c = await db.contact.findFirst({ where: { id: params.id, userId: session.user.id } })
  if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    id: c.id,
    name: c.name,
    initials: c.initials ?? c.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase(),
    accent: c.accent ?? '#F97316',
    stage: toStage(c),
    kind: c.kind,
    source: c.source?.toLowerCase() ?? 'manuel',
    city: c.city ?? '',
    phone: c.phone ?? '',
    email: c.email ?? '',
    address: c.address ?? '',
    personality: c.personality ?? null,
    score: c.score ?? null,
    lastContact: c.lastContact?.toISOString() ?? null,
    note: c.note ?? '',
    tags: c.tags,
    createdAt: c.createdAt.toISOString(),
    businessId: c.mlmBusinessId,
  })
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await db.contact.findFirst({ where: { id: params.id, userId: session.user.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const { name, phone, email, city, address, note, stage, personality, score, lastContact, tags } = body

  let kindUpdate: any = {}
  if (stage !== undefined) {
    if (stage === 'client') {
      kindUpdate = { kind: 'CLIENT', prospectStage: null, clientStage: existing.clientStage ?? 'C_NOUVEAU', partnerStage: null }
    } else if (stage === 'partenaire') {
      kindUpdate = { kind: 'PARTENAIRE', prospectStage: null, clientStage: null, partnerStage: existing.partnerStage ?? 'INTEGRATION' }
    } else {
      const ps = stage === 'chaud' ? 'CHAUD' : stage === 'prospect' ? 'QUALIFIE' : 'NOUVEAU'
      kindUpdate = { kind: 'PROSPECT', prospectStage: ps, clientStage: null, partnerStage: null }
    }
  }

  const updated = await db.contact.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(phone !== undefined && { phone }),
      ...(email !== undefined && { email }),
      ...(city !== undefined && { city }),
      ...(address !== undefined && { address }),
      ...(note !== undefined && { note }),
      ...(personality !== undefined && { personality }),
      ...(score !== undefined && { score }),
      ...(lastContact !== undefined && { lastContact: lastContact ? new Date(lastContact) : null }),
      ...(tags !== undefined && { tags }),
      ...kindUpdate,
    },
  })

  return NextResponse.json({ id: updated.id })
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await db.contact.findFirst({ where: { id: params.id, userId: session.user.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.contact.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
