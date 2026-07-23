import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Chat Orion : proxy vers l'endpoint dédié du service IA (persona prospection honnête).
// Phase 1 : conseil + rédaction de messages. Conversation tenue en mémoire côté client.
const ATLAS_URL = process.env.ATLAS_URL || 'http://127.0.0.1:8100'

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const userId = token?.id as string | undefined
  if (!userId) return NextResponse.json({ error: 'non authentifié' }, { status: 401 })

  let body: { query?: string; history?: { role: string; content: string }[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 })
  }
  const query = (body.query ?? '').trim()
  if (!query) return NextResponse.json({ error: 'query vide' }, { status: 400 })

  let resp: Response
  try {
    resp = await fetch(`${ATLAS_URL}/api/orion/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        user_id: userId,
        conversation_history: Array.isArray(body.history) ? body.history : [],
      }),
    })
  } catch {
    return NextResponse.json({ error: 'Orion indisponible' }, { status: 502 })
  }
  if (!resp.ok || !resp.body) return NextResponse.json({ error: 'Orion indisponible' }, { status: 502 })

  return new Response(resp.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  })
}
