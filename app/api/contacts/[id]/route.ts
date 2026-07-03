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

// Score d'opportunité DYNAMIQUE (calculé, jamais saisi) : stage + fraîcheur + température
function computeScore(c: {
  kind: string; prospectStage: string | null; partnerStage: string | null
  market: string | null; lastContact: Date | null
}): number {
  let base = 15
  if (c.kind === 'PARTENAIRE') {
    base = ({ DEMARRAGE: 55, FORMATION: 70, ACTIF: 85, LEADER: 95 } as Record<string, number>)[c.partnerStage ?? ''] ?? 55
  } else if (c.kind === 'CLIENT') {
    base = 55
  } else {
    base = ({ NOUVEAU: 15, INVITATION: 30, PRESENTATION: 50, SUIVI: 65, CLOSING: 80 } as Record<string, number>)[c.prospectStage ?? ''] ?? 15
  }
  let fresh = 0
  if (c.lastContact) {
    const days = (Date.now() - new Date(c.lastContact).getTime()) / 86_400_000
    fresh = days < 7 ? 0 : days < 14 ? -5 : days < 30 ? -15 : -25
  }
  const temp = c.market === 'CHAUD' ? 5 : c.market === 'FROID' ? -5 : 0
  return Math.max(0, Math.min(100, Math.round(base + fresh + temp)))
}

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  const c = await db.contact.findFirst({ where: { id, userId: session.user.id } })
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
    firstName: c.firstName ?? '',
    lastName: c.lastName ?? '',
    gender: c.gender ?? '',
    profession: c.profession ?? '',
    education: c.education ?? '',
    birthDate: c.birthDate ? c.birthDate.toISOString().slice(0, 10) : '',
    phone2: c.phone2 ?? '',
    address2: c.address2 ?? '',
    postal: c.postal ?? '',
    country: c.country ?? '',
    convertedUserId: c.convertedUserId ?? null,
    personality: c.personality ?? null,
    market: c.market ?? null,
    qualification: (c.qualification && typeof c.qualification === 'object' && !Array.isArray(c.qualification)) ? c.qualification : {},
    prospectStage: c.prospectStage ?? null,
    partnerStage: c.partnerStage ?? null,
    score: computeScore(c),
    exposures: c.exposures,
    lastContact: c.lastContact?.toISOString() ?? null,
    note: c.note ?? '',
    tags: c.tags,
    createdAt: c.createdAt.toISOString(),
    businessId: c.mlmBusinessId,
  })
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  const existing = await db.contact.findFirst({ where: { id, userId: session.user.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const { name, firstName, lastName, gender, profession, education, birthDate, phone, phone2, email, address, address2, postal, city, country, note, stage, market, prospectStage, partnerStage, convert, personality, qualification, score, lastContact, tags } = body

  // Synchroniser name si prénom/nom changent (aligné profil)
  const nameUpdate: Record<string, string> = {}
  if (firstName !== undefined || lastName !== undefined) {
    const f = (firstName !== undefined ? firstName : existing.firstName) ?? ''
    const l = (lastName !== undefined ? lastName : existing.lastName) ?? ''
    const composed = `${f} ${l}`.trim()
    if (composed) nameUpdate.name = composed
  } else if (name !== undefined) {
    nameUpdate.name = name
  }

  let kindUpdate: any = {}
  if (stage !== undefined) {
    if (stage === 'client') {
      kindUpdate = { kind: 'CLIENT', prospectStage: null, clientStage: existing.clientStage ?? 'C_NOUVEAU', partnerStage: null }
    } else if (stage === 'partenaire') {
      kindUpdate = { kind: 'PARTENAIRE', prospectStage: null, clientStage: null, partnerStage: existing.partnerStage ?? 'DEMARRAGE' }
    } else {
      const ps = stage === 'closing' ? 'CLOSING' : stage === 'prospect' ? 'SUIVI' : 'NOUVEAU'
      kindUpdate = { kind: 'PROSPECT', prospectStage: ps, clientStage: null, partnerStage: null }
    }
  }

  // Pipeline explicite (nouveau modèle) : conversions + stages directs
  let pipelineUpdate: any = {}
  if (convert === 'client') {
    pipelineUpdate = { kind: 'CLIENT', prospectStage: null, partnerStage: null }
  } else if (convert === 'partenaire') {
    pipelineUpdate = { kind: 'PARTENAIRE', prospectStage: null, partnerStage: existing.partnerStage ?? 'DEMARRAGE' }
  } else if (convert === 'prospect') {
    pipelineUpdate = { kind: 'PROSPECT', prospectStage: existing.prospectStage ?? 'NOUVEAU', partnerStage: null }
  } else if (prospectStage !== undefined) {
    // Double-track : un CLIENT re-sollicité garde son statut client (+ clientStage) et gagne un stade opportunité.
    pipelineUpdate = existing.kind === 'CLIENT'
      ? { prospectStage }
      : { kind: 'PROSPECT', prospectStage, clientStage: null, partnerStage: null }
  } else if (partnerStage !== undefined) {
    pipelineUpdate = { kind: 'PARTENAIRE', partnerStage }
  }

  const updated = await db.contact.update({
    where: { id },
    data: {
      ...nameUpdate,
      ...(firstName !== undefined && { firstName: firstName || null }),
      ...(lastName !== undefined && { lastName: lastName || null }),
      ...(gender !== undefined && { gender: gender || null }),
      ...(profession !== undefined && { profession: profession || null }),
      ...(education !== undefined && { education: education || null }),
      ...(birthDate !== undefined && { birthDate: birthDate ? new Date(birthDate) : null }),
      ...(phone !== undefined && { phone }),
      ...(phone2 !== undefined && { phone2: phone2 || null }),
      ...(email !== undefined && { email }),
      ...(address !== undefined && { address }),
      ...(address2 !== undefined && { address2: address2 || null }),
      ...(postal !== undefined && { postal: postal || null }),
      ...(city !== undefined && { city }),
      ...(country !== undefined && { country: country || null }),
      ...(note !== undefined && { note }),
      ...(market !== undefined && { market: market || null }),
      ...(personality !== undefined && { personality }),
      ...(qualification !== undefined && qualification && typeof qualification === 'object' && !Array.isArray(qualification) && {
        qualification: Object.fromEntries(Object.entries(qualification as Record<string, unknown>).filter(([, v]) => typeof v === 'string' && v.trim()).map(([k, v]) => [k, (v as string).trim()])),
      }),
      ...(score !== undefined && { score }),
      ...(lastContact !== undefined && { lastContact: lastContact ? new Date(lastContact) : null }),
      ...(tags !== undefined && { tags }),
      ...kindUpdate,
      ...pipelineUpdate,
    },
  })

  return NextResponse.json({ id: updated.id })
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  const existing = await db.contact.findFirst({ where: { id, userId: session.user.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.contact.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
