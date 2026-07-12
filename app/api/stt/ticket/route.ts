import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { createHmac } from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Ticket court signé (HMAC) pour ouvrir le WebSocket STT (validé côté service).
// Le WS lui-même est authentifié par ce ticket, pas par le cookie (origine tierce Traefik).
export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.id) return NextResponse.json({ error: 'non authentifié' }, { status: 401 })

  const secret = process.env.INTERNAL_API_SECRET
  if (!secret) return NextResponse.json({ error: 'STT indisponible' }, { status: 503 })

  const payload = Buffer.from(JSON.stringify({ uid: token.id, exp: Math.floor(Date.now() / 1000) + 120 }))
    .toString('base64url')
  const sig = createHmac('sha256', secret).update(payload).digest('hex')
  return NextResponse.json({ ticket: `${payload}.${sig}` })
}
