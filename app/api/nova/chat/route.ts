import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { reflectUserMemory } from '@/lib/atlas-memory'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Chat Nova : endpoint dédié du service IA (persona Nova + doctrine campagne), PAS Atlas.
// Le wizard tient la conversation en mémoire ; seule la campagne est sauvegardée (/api/nova/campaigns).
const ATLAS_URL = process.env.ATLAS_URL || 'http://127.0.0.1:8100'

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const userId = token?.id as string | undefined
  if (!userId) return NextResponse.json({ error: 'non authentifié' }, { status: 401 })

  let body: {
    query?: string
    history?: { role: string; content: string }[]
    mlm_actif?: string
    model?: string
    temperature?: number
    max_tokens?: number
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 })
  }
  const query = (body.query ?? '').trim()
  if (!query) return NextResponse.json({ error: 'query vide' }, { status: 400 })

  let resp: Response
  try {
    resp = await fetch(`${ATLAS_URL}/api/nova/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        user_id: userId,
        conversation_history: Array.isArray(body.history) ? body.history : [],
        // Overrides par prompt (modèle + paramètres définis en admin)
        ...(body.model ? { model: body.model } : {}),
        ...(typeof body.temperature === 'number' ? { temperature: body.temperature } : {}),
        ...(body.max_tokens ? { max_tokens: body.max_tokens } : {}),
      }),
    })
  } catch {
    return NextResponse.json({ error: 'Nova indisponible' }, { status: 502 })
  }
  if (!resp.ok || !resp.body) return NextResponse.json({ error: 'Nova indisponible' }, { status: 502 })

  // tee : le client streame, le serveur reflète l'échange dans la MÉMOIRE PARTAGÉE (source nova)
  const [toClient, toReflect] = resp.body.tee()
  void (async () => {
    const reader = toReflect.getReader()
    const decoder = new TextDecoder()
    let raw = ''
    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        raw += decoder.decode(value, { stream: true })
      }
    } catch { /* flux interrompu */ }
    let full = ''
    for (const line of raw.split('\n')) {
      if (!line.startsWith('data: ')) continue
      const p = line.slice(6).trim()
      if (!p || p === '[DONE]') continue
      try { const d = JSON.parse(p); if (d.text) full += d.text } catch { /* partiel */ }
    }
    if (full.trim()) await reflectUserMemory(userId, query, full.trim(), 'nova')
  })()

  return new Response(toClient, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  })
}
