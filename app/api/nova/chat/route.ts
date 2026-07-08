import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Chat Nova : réutilise le cerveau d'Atlas (FastAPI :8100) avec une consigne « tu es Nova »
// passée en premier tour. On ne persiste PAS dans l'historique Atlas — le wizard tient la
// conversation en mémoire ; seule la campagne est sauvegardée (via /api/nova/campaigns).
const ATLAS_URL = process.env.ATLAS_URL || 'http://127.0.0.1:8100'

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const userId = token?.id as string | undefined
  if (!userId) return NextResponse.json({ error: 'non authentifié' }, { status: 401 })

  let body: { query?: string; history?: { role: string; content: string }[]; mlm_actif?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 })
  }
  const query = (body.query ?? '').trim()
  if (!query) return NextResponse.json({ error: 'query vide' }, { status: 400 })

  let resp: Response
  try {
    resp = await fetch(`${ATLAS_URL}/api/atlas/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        user_id: userId,
        mlm_actif: body.mlm_actif ?? 'Atline',
        conversation_history: Array.isArray(body.history) ? body.history : [],
        user_snapshot: '',
        contact_snapshot: '',
      }),
    })
  } catch {
    return NextResponse.json({ error: 'Nova indisponible' }, { status: 502 })
  }
  if (!resp.ok || !resp.body) return NextResponse.json({ error: 'Nova indisponible' }, { status: 502 })

  return new Response(resp.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  })
}
