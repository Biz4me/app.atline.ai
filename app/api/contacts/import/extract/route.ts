import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { readAtlas } from '@/lib/atlas'

const digits = (s: string) => (s ?? '').replace(/\D/g, '')

// Phase C1 — Atlas extrait les contacts d'une liste collée / CSV, et marque les doublons.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const business = await db.userMlmBusiness.findFirst({ where: { userId: session.user.id, active: true } })
  if (!business) return NextResponse.json({ error: 'No active business' }, { status: 400 })

  const { text } = await req.json()
  const src = String(text ?? '').slice(0, 8000).trim()
  if (!src) return NextResponse.json({ error: 'text required' }, { status: 400 })

  const raw = await readAtlas(
    `Extrais les contacts de ce texte (liste ou CSV). Pour chaque personne : prénom, nom, téléphone, email (mets "" si absent).
Texte :
"""
${src}
"""
Réponds UNIQUEMENT avec un tableau JSON strict, sans aucun texte autour :
[{"firstName":"","lastName":"","phone":"","email":""}]`,
    session.user.id, business.mlmName,
  )

  let parsed: Array<{ firstName?: string; lastName?: string; phone?: string; email?: string }> = []
  const match = raw.match(/\[[\s\S]*\]/)
  if (match) { try { parsed = JSON.parse(match[0]) } catch {} }

  // Dédup contre l'existant
  const existing = await db.contact.findMany({ where: { userId: session.user.id, mlmBusinessId: business.id }, select: { name: true, phone: true, email: true } })
  const phoneSet = new Set(existing.map((c) => digits(c.phone ?? '')).filter(Boolean))
  const emailSet = new Set(existing.map((c) => (c.email ?? '').toLowerCase()).filter(Boolean))
  const nameSet = new Set(existing.map((c) => (c.name ?? '').toLowerCase().trim()).filter(Boolean))

  const contacts = parsed
    .map((p) => ({
      firstName: String(p.firstName ?? '').trim(),
      lastName: String(p.lastName ?? '').trim(),
      phone: String(p.phone ?? '').trim(),
      email: String(p.email ?? '').trim(),
    }))
    .filter((p) => p.firstName || p.lastName || p.phone || p.email)
    .map((p) => {
      const fullname = `${p.firstName} ${p.lastName}`.trim().toLowerCase()
      const dup = (p.phone && phoneSet.has(digits(p.phone))) || (p.email && emailSet.has(p.email.toLowerCase())) || (fullname && nameSet.has(fullname))
      return { ...p, duplicate: Boolean(dup) }
    })

  return NextResponse.json({ contacts })
}
