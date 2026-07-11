import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Endpoint INTERNE : l'agent vocal LiveKit dépose le transcript en fin de session.
// La room s'appelle aria-<simSessionId> → on retrouve la session créée par /api/livekit-token.
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret')
  if (!process.env.INTERNAL_API_SECRET || secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const room = typeof body?.room === 'string' ? body.room : ''
  const messages = Array.isArray(body?.messages) ? body.messages : []
  const sessionId = room.startsWith('aria-') ? room.slice(5) : ''
  if (!sessionId || !messages.length) return NextResponse.json({ ok: false, saved: 0 })

  const sim = await db.simSession.findUnique({ where: { id: sessionId }, select: { id: true } })
  if (!sim) return NextResponse.json({ error: 'session inconnue' }, { status: 404 })

  // Idempotent : si l'agent repose le transcript (retry), on remplace proprement.
  await db.simMessage.deleteMany({ where: { sessionId } })
  const rows = messages
    .filter((m: { role?: string; text?: string }) => typeof m?.text === 'string' && m.text.trim() && (m.role === 'user' || m.role === 'assistant'))
    .slice(0, 200)
    .map((m: { role: string; text: string }) => ({
      sessionId,
      role: (m.role === 'user' ? 'USER' : 'ARIA') as 'USER' | 'ARIA',
      content: m.text.slice(0, 2000),
    }))
  if (rows.length) await db.simMessage.createMany({ data: rows })
  await db.simSession.update({ where: { id: sessionId }, data: { completedAt: new Date() } })

  return NextResponse.json({ ok: true, saved: rows.length })
}
