import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { reflectUserMemory } from '@/lib/atlas-memory'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ATLAS_URL = process.env.ATLAS_URL || 'http://127.0.0.1:8100'

// Coach d'appel Aria (chat) : proxy SSE vers le service (/api/aria/coach, persona coach terrain)
// + reflet de l'échange dans la MÉMOIRE PARTAGÉE (source aria). Distinct de la simulation.
export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const userId = token?.id as string | undefined
  if (!userId) return NextResponse.json({ error: 'non authentifié' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const query = typeof body.query === 'string' ? body.query.trim() : ''
  if (!query) return NextResponse.json({ error: 'query vide' }, { status: 400 })

  let resp: Response
  try {
    resp = await fetch(`${ATLAS_URL}/api/aria/coach`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, user_id: userId, conversation_history: Array.isArray(body.history) ? body.history : [] }),
    })
  } catch {
    return NextResponse.json({ error: 'Aria indisponible' }, { status: 502 })
  }
  if (!resp.ok || !resp.body) return NextResponse.json({ error: 'Aria indisponible' }, { status: 502 })

  const [toClient, toReflect] = resp.body.tee()
  void (async () => {
    const reader = toReflect.getReader()
    const decoder = new TextDecoder()
    let raw = ''
    try { for (;;) { const { done, value } = await reader.read(); if (done) break; raw += decoder.decode(value, { stream: true }) } } catch { /* interrompu */ }
    let full = ''
    for (const line of raw.split('\n')) {
      if (!line.startsWith('data: ')) continue
      const p = line.slice(6).trim()
      if (!p || p === '[DONE]') continue
      try { const d = JSON.parse(p); if (d.text) full += d.text } catch { /* partiel */ }
    }
    if (full.trim()) await reflectUserMemory(userId, query, full.trim(), 'aria')
  })()

  return new Response(toClient, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no' },
  })
}
