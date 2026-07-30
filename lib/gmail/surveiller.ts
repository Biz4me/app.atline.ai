/**
 * DEMANDER À GMAIL DE NOUS PRÉVENIR — et ne jamais oublier de le redemander.
 *
 * Google n'accepte de surveiller une boîte que sept jours d'affilée. Passé ce
 * délai, la surveillance s'arrête, et c'est la panne la plus vicieuse du
 * canal : rien ne casse, aucune erreur n'apparaît, le distributeur cesse
 * simplement de recevoir les réponses de ses prospects. Il croit que personne
 * ne lui répond. Le renouvellement quotidien n'est donc pas une optimisation,
 * c'est ce qui empêche le produit de mentir en silence.
 *
 * ── DEUX LIMITATIONS VOLONTAIRES ───────────────────────────────────────────
 *
 * `labelIds: ['INBOX']` : on ne demande à être prévenu que pour ce qui arrive
 * en boîte de réception. Ni les brouillons, ni les envois, ni les spams, ni
 * les archives. C'est le périmètre le plus étroit que l'API permette de
 * déclarer, et c'est ce qu'on a écrit à Google dans la justification de
 * gmail.readonly.
 *
 * La notification elle-même ne transporte QUE l'adresse du compte et un
 * numéro d'historique. Jamais un sujet, jamais un expéditeur, jamais un
 * contenu. Tout ce qui circule chez Pub/Sub est donc inexploitable pour qui
 * l'intercepterait.
 *
 * ── LE CURSEUR ─────────────────────────────────────────────────────────────
 *
 * `historyId` est notre point de reprise, et il n'avance qu'après un
 * traitement réussi. L'historique Gmail étant cumulatif depuis ce point, une
 * notification perdue, un serveur redémarré au mauvais moment ou une erreur
 * passagère se rattrapent d'eux-mêmes à la notification suivante. On préfère
 * relire deux fois que rater une fois.
 */

import { db } from '@/lib/db'
import { connexionDe, jetonFrais, journaliser } from '@/lib/google/connexion'

const SCOPE_LECTURE = 'https://www.googleapis.com/auth/gmail.readonly'
const WATCH = 'https://gmail.googleapis.com/gmail/v1/users/me/watch'
const STOP = 'https://gmail.googleapis.com/gmail/v1/users/me/stop'

/** On renouvelle bien avant l'échéance : une surveillance morte est invisible. */
const RENOUVELER_SI_MOINS_DE_H = 48

function sujet(): string | null {
  return process.env.GMAIL_PUBSUB_TOPIC || null
}

export type Surveillance =
  | { ok: true; expireLe: Date; historyId: string }
  | { ok: false; raison: string }

/**
 * Démarre (ou prolonge) la surveillance de la boîte. Idempotent : rappeler
 * `watch` sur une boîte déjà surveillée ne fait que repousser l'échéance,
 * c'est même la façon recommandée de renouveler.
 */
export async function surveiller(userId: string): Promise<Surveillance> {
  const topic = sujet()
  if (!topic) return { ok: false, raison: 'GMAIL_PUBSUB_TOPIC absent de la configuration' }

  const conn = await connexionDe(userId)
  if (!conn?.email) return { ok: false, raison: 'aucun compte Google connecté' }
  if (!(conn.scope ?? '').split(' ').includes(SCOPE_LECTURE)) {
    return { ok: false, raison: 'la permission de lecture n’a pas été accordée' }
  }

  const jeton = await jetonFrais(userId)
  if (!jeton) return { ok: false, raison: 'jeton indisponible' }

  try {
    const r = await fetch(WATCH, {
      method: 'POST',
      headers: { Authorization: `Bearer ${jeton}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topicName: topic,
        // Le périmètre le plus étroit que l'API permette de déclarer.
        labelIds: ['INBOX'],
        labelFilterBehavior: 'INCLUDE',
      }),
      signal: AbortSignal.timeout(15_000),
    })
    if (!r.ok) {
      const detail = (await r.text().catch(() => '')).slice(0, 250)
      await journaliser({
        userId,
        action: 'ERREUR',
        adresse: conn.email,
        detail: `surveillance refusée (${r.status}) ${detail}`,
      })
      // L'erreur la plus fréquente, et la moins explicite : le compte de
      // service de Gmail n'a pas le droit de publier dans le sujet.
      return { ok: false, raison: `Google refuse la surveillance (${r.status})` }
    }

    const rep = (await r.json()) as { historyId?: string; expiration?: string }
    const expireLe = new Date(Number(rep.expiration ?? Date.now() + 6 * 86400_000))

    await db.googleConnection.update({
      where: { userId },
      data: {
        watchExpiration: expireLe,
        // Premier démarrage seulement : on ne réécrit pas un curseur existant,
        // ce serait sauter tout ce qui n'a pas encore été traité.
        ...(conn.historyId ? {} : { historyId: rep.historyId ?? null }),
      },
    })

    await journaliser({
      userId,
      action: 'SURVEILLANCE',
      adresse: conn.email,
      ressource: rep.historyId ?? null,
      detail: `boîte de réception surveillée jusqu’au ${expireLe.toISOString()}`,
    })

    return { ok: true, expireLe, historyId: rep.historyId ?? conn.historyId ?? '' }
  } catch (e) {
    return { ok: false, raison: `Google injoignable : ${e instanceof Error ? e.message : 'inconnu'}` }
  }
}

/** Coupe la surveillance. Appelé à la révocation, ou si le distributeur éteint le canal. */
export async function cesserDeSurveiller(userId: string): Promise<boolean> {
  const conn = await connexionDe(userId)
  const jeton = conn ? await jetonFrais(userId) : null
  if (!jeton) return false

  try {
    await fetch(STOP, { method: 'POST', headers: { Authorization: `Bearer ${jeton}` } })
  } catch {
    // Une surveillance qu'on n'arrive pas à couper expirera d'elle-même.
  }
  await db.googleConnection.update({ where: { userId }, data: { watchExpiration: null } })
  await journaliser({ userId, action: 'SURVEILLANCE', adresse: conn?.email, detail: 'surveillance arrêtée' })
  return true
}

/**
 * Le passage quotidien. Google recommande d'appeler `watch` une fois par jour
 * plutôt que d'attendre l'échéance : on suit la recommandation, avec une marge
 * de deux jours pour absorber une panne de cron sans perdre la surveillance.
 */
export async function renouvelerLesSurveillances(): Promise<{
  renouvelees: number
  echecs: number
  ignorees: number
}> {
  const limite = new Date(Date.now() + RENOUVELER_SI_MOINS_DE_H * 3600_000)

  const candidats = await db.googleConnection.findMany({
    where: {
      revokedAt: null,
      scope: { contains: SCOPE_LECTURE },
      OR: [{ watchExpiration: null }, { watchExpiration: { lt: limite } }],
    },
    select: { userId: true },
  })

  let renouvelees = 0
  let echecs = 0
  for (const c of candidats) {
    const r = await surveiller(c.userId)
    if (r.ok) renouvelees++
    else echecs++
  }
  return { renouvelees, echecs, ignorees: 0 }
}
