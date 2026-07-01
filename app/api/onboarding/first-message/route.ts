import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ATLAS_URL = process.env.ATLAS_URL || 'http://127.0.0.1:8100'

// Proxy SSE vers le service IA : génère (Opus) le 1er message de prise de contact.
export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.id) return NextResponse.json({ error: 'non authentifié' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }

  let resp: Response
  try {
    resp = await fetch(`${ATLAS_URL}/api/onboarding/first-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    return NextResponse.json({ error: 'service indisponible' }, { status: 502 })
  }

  if (!resp.ok || !resp.body) return NextResponse.json({ error: 'service indisponible' }, { status: 502 })

  return new NextResponse(resp.body, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  })
}
