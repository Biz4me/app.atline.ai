import { NextRequest, NextResponse, after } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Où vit l'app qui sait fabriquer un bilan. La bascule bleu-vert la déplacera. */
const V2_URL = process.env.V2_URL || 'http://127.0.0.1:3055'

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
  const raisonFin = typeof body?.raison_fin === 'string' && body.raison_fin
    ? body.raison_fin.slice(0, 40)
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
      ...(raisonFin ? { raisonFin } : {}),
    },
  })

  /**
   * 🔴 LE BILAN PART D'ICI, ET PLUS DU NAVIGATEUR.
   *
   * Jusqu'au 20 octobre, seul l'écran de simulation déclenchait le débrief —
   * et seulement si l'utilisateur RESTAIT dessus une demi-minute après avoir
   * raccroché. Or on raccroche en fermant l'écran. Neuf sessions avaient un
   * vrai transcript et aucun bilan, `SimScore` était vide sur TOUTE la base,
   * et les niveaux n'avaient pas bougé depuis le 16 octobre. Tout ce qui en
   * dépend — le point faible, la leçon recommandée, le barreau d'aide —
   * reposait donc sur des mesures qui n'arrivaient jamais.
   *
   * Le transcript qui atterrit ici EST le moment où le bilan devient
   * possible : c'est donc d'ici qu'il part, sans dépendre de personne.
   *
   * `after()` et non `void` : le travail s'exécute APRÈS la réponse, sans
   * faire attendre l'agent qui est en train de se fermer, et sans risquer
   * d'être coupé comme le serait une promesse abandonnée.
   */
  if (rows.length) {
    after(async () => {
      try {
        const r = await fetch(`${V2_URL}/api/simulation/${sessionId}`, {
          method: 'POST',
          headers: { 'x-atline-internal': process.env.INTERNAL_API_SECRET ?? '' },
          signal: AbortSignal.timeout(90_000),
        })
        if (!r.ok) console.error(`[transcript ${sessionId}] bilan refusé : ${r.status}`)
      } catch (e) {
        // On le DIT. Un bilan perdu en silence est ce qu'on vient de réparer.
        console.error(`[transcript ${sessionId}] bilan non déclenché :`, e)
      }
    })
  }

  return NextResponse.json({ ok: true, saved: rows.length, mesures: consommation.length })
}
