import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

function toStage(c: { kind: string; prospectStage: string | null; clientStage: string | null; partnerStage: string | null }) {
  if (c.kind === 'CLIENT') return 'client'
  if (c.kind === 'PARTENAIRE') return 'partenaire'
  if (c.prospectStage === 'CLOSING') return 'closing'
  if (c.prospectStage === 'INVITATION' || c.prospectStage === 'PRESENTATION' || c.prospectStage === 'SUIVI') return 'prospect'
  return 'nouveau'
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const businessId = searchParams.get('businessId')
  const search = searchParams.get('q') ?? ''

  const business = businessId
    ? await db.userMlmBusiness.findFirst({ where: { id: businessId, userId: session.user.id } })
    : await db.userMlmBusiness.findFirst({ where: { userId: session.user.id, active: true } })

  if (!business) return NextResponse.json([])

  const rows = await db.contact.findMany({
    where: {
      userId: session.user.id,
      mlmBusinessId: business.id,
      ...(search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { city: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
        ]
      } : {}),
    },
    orderBy: { updatedAt: 'desc' },
    take: 200,
  })

  const contacts = rows.map(c => ({
    id: c.id,
    name: c.name,
    initials: c.initials ?? c.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase(),
    accent: c.accent ?? '#F97316',
    stage: toStage(c),
    kind: c.kind,
    // Double-track : le marché (proximité) + les stades des deux tunnels, séparés.
    market: c.market,
    prospectStage: c.prospectStage,
    partnerStage: c.partnerStage,
    isClient: c.kind === 'CLIENT' || c.clientStage != null,
    isPartner: c.kind === 'PARTENAIRE' || c.partnerStage != null,
    source: c.source?.toLowerCase() ?? 'manuel',
    city: c.city ?? '',
    phone: c.phone ?? '',
    email: c.email ?? '',
    personality: c.personality ?? null,
    score: c.score ?? null,
    lastContact: c.lastContact?.toISOString() ?? null,
    note: c.note ?? '',
    tags: c.tags,
    createdAt: c.createdAt.toISOString(),
    businessId: c.mlmBusinessId,
  }))

  return NextResponse.json(contacts)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, firstName, lastName, gender, profession, education, phone, phone2, email, address, address2, postal, city, country, source, stage, kind, note, businessId } = body

  // Nom : composé du prénom+nom si fournis (aligné profil), sinon le name brut
  const composedName = (firstName || lastName)
    ? `${(firstName ?? '').trim()} ${(lastName ?? '').trim()}`.trim()
    : (name ?? '').trim()
  if (!composedName) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const business = businessId
    ? await db.userMlmBusiness.findFirst({ where: { id: businessId, userId: session.user.id } })
    : await db.userMlmBusiness.findFirst({ where: { userId: session.user.id, active: true } })
  if (!business) return NextResponse.json({ error: 'No active business' }, { status: 400 })

  // Derive kind and stage from front-end stage string
  let dbKind: string
  let prospectStage: string | null = null
  let clientStage: string | null = null
  let partnerStage: string | null = null

  const s = stage ?? 'nouveau'
  if (s === 'client') { dbKind = 'CLIENT'; clientStage = 'C_NOUVEAU' }
  else if (s === 'partenaire') { dbKind = 'PARTENAIRE'; partnerStage = 'DEMARRAGE' }
  else {
    dbKind = 'PROSPECT'
    if (s === 'closing') prospectStage = 'CLOSING'
    else if (s === 'prospect') prospectStage = 'SUIVI'
    else prospectStage = 'NOUVEAU'
  }

  const initials = composedName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
  const accents = ['#F97316','#14B8A6','#8B5CF6','#3B82F6','#22C55E','#EF4444']
  const accent = accents[Math.floor(Math.random() * accents.length)]

  const contact = await db.contact.create({
    data: {
      userId: session.user.id,
      mlmBusinessId: business.id,
      name: composedName,
      firstName: firstName?.trim() || null,
      lastName: lastName?.trim() || null,
      gender: gender?.trim() || null,
      profession: profession?.trim() || null,
      education: education?.trim() || null,
      initials,
      accent,
      phone: phone ?? null,
      phone2: phone2 ?? null,
      email: email ?? null,
      address: address ?? null,
      address2: address2 ?? null,
      postal: postal ?? null,
      city: city ?? null,
      country: country ?? null,
      source: source?.toUpperCase() ?? 'MANUEL',
      kind: dbKind as any,
      prospectStage: prospectStage as any,
      clientStage: clientStage as any,
      partnerStage: partnerStage as any,
      note: note ?? null,
    },
  })

  return NextResponse.json({ id: contact.id, name: contact.name }, { status: 201 })
}
