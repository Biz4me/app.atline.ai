import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ATLAS_URL = process.env.ATLAS_URL || 'http://127.0.0.1:8100'

// Un tour de simulation Aria à l'écrit : proxy SSE vers le service (/api/aria/simulate,
// mode bibliothèque) + sauvegarde du tour dans SimMessage (même transcript que le vocal).
export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const userId = token?.id as string | undefined
  if (!userId) return NextResponse.json({ error: 'non authentifié' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : ''
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  if (!sessionId || !message) return NextResponse.json({ error: 'sessionId et message requis' }, { status: 400 })

  const sim = await db.simSession.findFirst({
    where: { id: sessionId, userId },
    select: { id: true, characterId: true, pipelineContactId: true },
  })
  if (!sim) return NextResponse.json({ error: 'session introuvable' }, { status: 404 })

  // Couleur Big Al : celle du contact lié, sinon défaut
  let color = 'bleu'
  let nom = 'le prospect'
  if (sim.pipelineContactId) {
    const c = await db.contact.findFirst({
      where: { id: sim.pipelineContactId, userId },
      select: { personality: true, name: true },
    })
    if (c?.personality) color = c.personality.toLowerCase()
    if (c?.name) nom = c.name.split(/\s+/)[0]
  }

  // Historique = transcript déjà en base (borné)
  const prior = await db.simMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
    take: 40,
    select: { role: true, content: true },
  })
  const conversation_history = prior.map((m) => ({
    role: m.role === 'USER' ? 'user' : 'assistant',
    content: m.content,
  }))

  await db.simMessage.create({ data: { sessionId, role: 'USER', content: message.slice(0, 2000) } })

  let resp: Response
  try {
    resp = await fetch(`${ATLAS_URL}/api/aria/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenario: sim.characterId,
        color,
        prospect_profile: { nom },
        user_message: message,
        user_id: userId,
        conversation_history,
      }),
    })
  } catch {
    return NextResponse.json({ error: 'Aria indisponible' }, { status: 502 })
  }
  if (!resp.ok || !resp.body) return NextResponse.json({ error: 'Aria indisponible' }, { status: 502 })

  // tee : le client streame, le serveur sauvegarde la réplique complète (comme le chat Atlas)
  const [toClient, toSave] = resp.body.tee()
  void (async () => {
    const reader = toSave.getReader()
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
      try {
        const d = JSON.parse(p)
        if (d.text) full += d.text
      } catch { /* partiel */ }
    }
    if (full.trim()) {
      await db.simMessage.create({ data: { sessionId, role: 'ARIA', content: full.trim().slice(0, 2000) } }).catch(() => {})
    }
  })()

  return new Response(toClient, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no' },
  })
}
