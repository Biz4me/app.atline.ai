import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { traiterChangements } from '@/lib/gmail/lire'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * L'OREILLE DU CANAL E-MAIL — ce que Google nous pousse quand une boîte bouge.
 *
 * Le message reçu ne contient QUE l'adresse du compte et un numéro
 * d'historique. Ni sujet, ni expéditeur, ni contenu. C'est l'argument central
 * qu'on a donné à Google : ce qui circule par Pub/Sub est inexploitable pour
 * qui l'intercepterait, et le contenu n'est cherché qu'ensuite, à la demande,
 * uniquement pour ce qui a changé et uniquement dans nos propres fils.
 *
 * ── LES CODES DE RETOUR SONT DES DÉCISIONS, PAS DE LA POLITESSE ────────────
 *
 * Pub/Sub considère 2xx comme un accusé de réception et réessaie sur tout le
 * reste. Chaque réponse est donc un choix :
 *
 *   • jeton absent ou faux      → 401, et Google réessaiera : c'est une erreur
 *                                 de configuration de notre côté, pas un
 *                                 message à jeter.
 *   • charge illisible          → 204. Réessayer un message malformé ne le
 *                                 rendra pas lisible.
 *   • adresse inconnue          → 204. Rien à faire, ce n'est pas une panne.
 *   • échec de traitement       → 500, pour que Google réessaie. Notre curseur
 *                                 n'ayant pas avancé, la reprise repartira du
 *                                 bon endroit sans rien dupliquer.
 *
 * ── POURQUOI LE TRAVAIL EST FAIT ICI, EN DIRECT ────────────────────────────
 *
 * Le traitement se limite à un appel d'historique et à quelques lectures de
 * fils : c'est court, borné, et sans appel à un modèle. Le faire tout de suite
 * évite une table d'événements de plus.
 *
 * ⚠️ Cela changera à la phase 5. Dès qu'Orion rédigera une réponse, la
 * génération devra passer en traitement différé : un modèle qui réfléchit dix
 * secondes ferait expirer l'accusé de réception, Google réessaierait, et le
 * prospect recevrait deux réponses.
 */

type Enveloppe = {
  message?: { data?: string; messageId?: string; publishTime?: string }
  subscription?: string
}

export async function POST(req: NextRequest) {
  // Le jeton voyage dans l'URL de l'abonnement : c'est ce que Pub/Sub permet
  // de plus simple, et la charge utile ne contient de toute façon aucun secret.
  const attendu = process.env.GMAIL_PUSH_TOKEN
  const recu = new URL(req.url).searchParams.get('token')
  if (!attendu || recu !== attendu) {
    return NextResponse.json({ error: 'forbidden' }, { status: 401 })
  }

  let adresse: string | undefined
  let historyId: string | undefined
  try {
    const env = (await req.json()) as Enveloppe
    const brut = Buffer.from(env.message?.data ?? '', 'base64').toString('utf8')
    const charge = JSON.parse(brut) as { emailAddress?: string; historyId?: string | number }
    adresse = charge.emailAddress
    historyId = charge.historyId != null ? String(charge.historyId) : undefined
  } catch {
    return new NextResponse(null, { status: 204 })
  }

  if (!adresse) return new NextResponse(null, { status: 204 })

  const conn = await db.googleConnection.findFirst({
    where: { email: adresse, revokedAt: null },
    select: { userId: true },
  })
  // Une boîte qu'on ne surveille plus : la notification est légitime mais sans
  // objet. On l'accuse pour que Google cesse de l'envoyer.
  if (!conn) return new NextResponse(null, { status: 204 })

  try {
    const r = await traiterChangements(conn.userId, historyId)
    if (!r.ok) {
      console.error('[gmail/push] traitement en échec', adresse, r.raison)
      return NextResponse.json({ error: r.raison ?? 'echec' }, { status: 500 })
    }
    return new NextResponse(null, { status: 204 })
  } catch (e) {
    console.error('[gmail/push] exception', adresse, e)
    return NextResponse.json({ error: 'exception' }, { status: 500 })
  }
}
