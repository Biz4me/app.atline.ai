import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

const ACCENTS = ['#F97316', '#14B8A6', '#8B5CF6', '#3B82F6', '#22C55E', '#EF4444']

// Phase C1 — création en masse des contacts validés (source IMPORT, prospects nouveaux).
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const business = await db.userMlmBusiness.findFirst({ where: { userId: session.user.id, active: true } })
  if (!business) return NextResponse.json({ error: 'No active business' }, { status: 400 })

  const { contacts } = await req.json()
  if (!Array.isArray(contacts) || contacts.length === 0) return NextResponse.json({ error: 'contacts required' }, { status: 400 })

  const rows = contacts.slice(0, 500).map((c: { firstName?: string; lastName?: string; phone?: string; email?: string }) => {
    const firstName = String(c.firstName ?? '').trim()
    const lastName = String(c.lastName ?? '').trim()
    const name = `${firstName} ${lastName}`.trim() || 'Contact'
    const initials = (name.split(' ').map((w) => w[0]).join('').slice(0, 2) || '?').toUpperCase()
    return {
      userId: session.user.id,
      mlmBusinessId: business.id,
      kind: 'PROSPECT' as const,
      name,
      firstName: firstName || null,
      lastName: lastName || null,
      initials,
      accent: ACCENTS[Math.floor(Math.random() * ACCENTS.length)],
      phone: String(c.phone ?? '').trim() || null,
      email: String(c.email ?? '').trim() || null,
      source: 'IMPORT' as const,
      prospectStage: 'NOUVEAU' as const,
    }
  })

  const res = await db.contact.createMany({ data: rows })
  return NextResponse.json({ created: res.count }, { status: 201 })
}
