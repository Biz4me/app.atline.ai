import { NextRequest, NextResponse } from 'next/server'
import { buildContactSnapshot, resolveContacts } from '@/lib/contact-snapshot'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Endpoint INTERNE appelé par le service Atlas (tool get_contact, option C).
// Pas de session : protégé par secret partagé. Le userId est fourni par le service
// (qui l'a lui-même reçu du proxy chat authentifié) — jamais de confiance sans le secret.
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret')
  if (!process.env.INTERNAL_API_SECRET || secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const body = await req.json().catch(() => null)
  const userId = typeof body?.userId === 'string' ? body.userId : ''
  const query = typeof body?.query === 'string' ? body.query : ''
  if (!userId || !query.trim()) return NextResponse.json({ matches: [] })

  const matches = await resolveContacts(userId, query)
  // 1 seul match → snapshot complet (contact confirmé) ; sinon on renvoie la liste pour désambiguïser.
  if (matches.length === 1) {
    const snapshot = await buildContactSnapshot(userId, matches[0].id)
    return NextResponse.json({ matches, snapshot })
  }
  return NextResponse.json({ matches })
}
