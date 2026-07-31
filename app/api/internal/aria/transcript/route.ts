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

  // La consommation relevée chez les fournisseurs : une entrée par modèle sollicité.
  // On la garde telle quelle (le fournisseur et le modèle sont DANS la mesure), en se
  // bornant à écarter ce qui n'a pas la forme attendue et à plafonner le volume.
  const consommation = (Array.isArray(body?.usage) ? body.usage : [])
    .filter((u: unknown): u is Record<string, unknown> =>
      typeof u === 'object' && u !== null && typeof (u as { type?: unknown }).type === 'string')
    .slice(0, 20)
  const duree = typeof body?.duree_secondes === 'number' && Number.isFinite(body.duree_secondes)
    ? body.duree_secondes
    : null

  // Un appel raccroché aussitôt n'a pas de transcript mais a bien coûté quelque chose :
  // on accepte donc une remontée qui n'apporte QUE la consommation.
  if (!sessionId || (!messages.length && !consommation.length)) {
    return NextResponse.json({ ok: false, saved: 0 })
  }

  const sim = await db.simSession.findUnique({ where: { id: sessionId }, select: { id: true } })
  if (!sim) return NextResponse.json({ error: 'session inconnue' }, { status: 404 })

  // Idempotent : si l'agent repose le transcript (retry), on remplace proprement.
  // Mais un envoi sans messages ne doit PAS effacer un transcript déjà en place.
  if (messages.length) await db.simMessage.deleteMany({ where: { sessionId } })
  const rows = messages
    .filter((m: { role?: string; text?: string }) => typeof m?.text === 'string' && m.text.trim() && (m.role === 'user' || m.role === 'assistant'))
    .slice(0, 200)
    .map((m: { role: string; text: string }) => ({
      sessionId,
      role: (m.role === 'user' ? 'USER' : 'ARIA') as 'USER' | 'ARIA',
      content: m.text.slice(0, 2000),
    }))
  if (rows.length) await db.simMessage.createMany({ data: rows })
  await db.simSession.update({
    where: { id: sessionId },
    data: {
      completedAt: new Date(),
      // On n'écrase pas une mesure existante par du vide (cas du retry sans consommation).
      ...(consommation.length ? { consommation } : {}),
      ...(duree !== null ? { dureeSecondes: duree } : {}),
    },
  })

  return NextResponse.json({ ok: true, saved: rows.length, mesures: consommation.length })
}
