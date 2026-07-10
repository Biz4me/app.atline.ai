import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Endpoint INTERNE (outil memory_search d'Atlas) : cherche dans les faits retenus
// de l'utilisateur (AtlasFact) les entrées qui matchent la requête. Protégé par secret.
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret')
  if (!process.env.INTERNAL_API_SECRET || secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const body = await req.json().catch(() => null)
  const userId = typeof body?.userId === 'string' ? body.userId : ''
  const query = typeof body?.query === 'string' ? body.query : ''
  if (!userId || !query.trim()) return NextResponse.json({ facts: [] })

  const terms = query.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((t) => t.length >= 3).slice(0, 6)
  if (!terms.length) return NextResponse.json({ facts: [] })

  const facts = await db.atlasFact.findMany({
    where: {
      userId,
      status: 'active',
      OR: terms.flatMap((t) => [
        { object: { contains: t, mode: 'insensitive' as const } },
        { predicate: { contains: t, mode: 'insensitive' as const } },
        { category: { contains: t, mode: 'insensitive' as const } },
      ]),
    },
    orderBy: [{ importance: 'desc' }, { lastSeenAt: 'desc' }],
    take: 15,
    select: { predicate: true, object: true, category: true, contactId: true },
  })

  return NextResponse.json({
    facts: facts.map(
      (f) => `${f.predicate.replace(/_/g, ' ')} : ${f.object} (${f.category}${f.contactId ? ', à propos d’un contact' : ''})`,
    ),
  })
}
