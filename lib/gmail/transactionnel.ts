/**
 * ENVOYER UN COURRIER TRANSACTIONNEL AU NOM DU DISTRIBUTEUR.
 *
 * ── POURQUOI UN FICHIER, ET PAS UN DRAPEAU DANS `envoyer.ts` ───────────────
 *
 * `envoyerMail` porte six freins, et ils sont tous bons — pour la PROSPECTION.
 * Une confirmation de rendez-vous n'est pas de la prospection : la personne
 * vient de la demander, elle attend la réponse, et rien ne justifie de la
 * retenir. Or trois de ces freins la jetteraient, en silence :
 *
 *   · `issue-atteinte`    Orion pose `issue = RDV` et FERME le fil au moment
 *                         où le prospect dit vouloir un rendez-vous. La
 *                         confirmation serait donc refusée juste après, c'est
 *                         à dire précisément quand elle compte le plus.
 *   · `trop-rapide`       trois minutes d'écart entre deux envois.
 *   · `plafond-du-jour`   soixante envois automatiques.
 *
 * Un garde-fou calé sur un usage devient une panne muette dès qu'un second
 * usage passe par la même porte. D'où cette porte-ci.
 *
 * ── CE QU'ON GARDE ────────────────────────────────────────────────────────
 *
 * Les freins d'IDENTITÉ, entiers : sans compte Google raccordé, ou sans la
 * permission d'envoi, on n'écrit pas. Ce ne sont pas des précautions, ce sont
 * des impossibilités — et le distributeur doit alors être prévenu que son
 * prospect n'a rien reçu.
 *
 * ── CE QU'ON N'OUVRE PAS ──────────────────────────────────────────────────
 *
 * Aucun `EmailFil`. Une confirmation n'est pas un tour de parole : elle
 * n'ouvre pas de conversation, ne compte pas dans les huit échanges, et ne
 * doit réveiller aucune séquence de relance. Si le prospect répond, c'est la
 * surveillance Gmail qui le verra, comme pour n'importe quel message entrant.
 *
 * ── MAIS ON COMPTE ────────────────────────────────────────────────────────
 *
 * L'envoi est journalisé `ENVOI` comme les autres, donc il PÈSE sur le
 * plafond du jour de la prospection. C'est voulu : le compteur de Google, lui,
 * ne fait aucune différence entre un courrier transactionnel et un autre.
 */

import { connexionDe, jetonFrais, journaliser as tracerAcces } from '@/lib/google/connexion'
import { journaliser as journalAgent } from '@/lib/agents/journal'
import { construireMessage, base64url } from '@/lib/gmail/message'

const SCOPE_ENVOI = 'https://www.googleapis.com/auth/gmail.send'
const API = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send'

export type MotifRefusTransactionnel = 'non-connecte' | 'sans-permission' | 'refus-de-google'

export type EnvoiTransactionnel =
  | { ok: true; messageId: string; adresseEnvoi: string }
  | { ok: false; motif: MotifRefusTransactionnel; message: string }

export async function envoyerTransactionnel(args: {
  userId: string
  destinataire: string
  sujet: string
  corps: string
  contactId?: string | null
  /** Ce qui a déclenché l'envoi, pour le journal. Ex. « cal:BOOKING_CREATED ». */
  origine: string
}): Promise<EnvoiTransactionnel> {
  const { userId, destinataire, sujet, corps, origine } = args

  const conn = await connexionDe(userId)
  if (!conn?.email) {
    return {
      ok: false,
      motif: 'non-connecte',
      message: "aucun compte Google raccordé : impossible d'écrire en son nom",
    }
  }
  if (!(conn.scope ?? '').split(' ').includes(SCOPE_ENVOI)) {
    return {
      ok: false,
      motif: 'sans-permission',
      message: "la permission d'envoi n'a pas été accordée",
    }
  }

  const jeton = await jetonFrais(userId)
  if (!jeton) {
    return { ok: false, motif: 'non-connecte', message: 'jeton Google indisponible' }
  }

  const { db } = await import('@/lib/db')
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { firstName: true, lastName: true },
  })
  const nomAffiche = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || conn.email

  const brut = construireMessage({
    nomAffiche,
    adresseEnvoi: conn.email,
    destinataire,
    sujet,
    corps,
  })

  let reponse: { id?: string; threadId?: string }
  try {
    const r = await fetch(API, {
      method: 'POST',
      headers: { Authorization: `Bearer ${jeton}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: base64url(brut) }),
      signal: AbortSignal.timeout(20_000),
    })
    if (!r.ok) {
      const detail = (await r.text().catch(() => '')).slice(0, 300)
      await tracerAcces({
        userId,
        action: 'ERREUR',
        adresse: conn.email,
        detail: `${origine} : envoi refusé par Google (${r.status}) ${detail}`,
      })
      return { ok: false, motif: 'refus-de-google', message: `Google a refusé l'envoi (${r.status})` }
    }
    reponse = await r.json()
  } catch (e) {
    await tracerAcces({
      userId,
      action: 'ERREUR',
      adresse: conn.email,
      detail: `${origine} : envoi impossible — ${e instanceof Error ? e.message : 'inconnu'}`,
    })
    return { ok: false, motif: 'refus-de-google', message: 'Google injoignable' }
  }

  await tracerAcces({
    userId,
    action: 'ENVOI',
    adresse: conn.email,
    ressource: reponse.id ?? null,
    detail: `${origine} → ${destinataire}`,
  })

  // Le même journal que tout le reste : la boucle de résultat mesure ces
  // courriers comme les autres, sans système parallèle.
  await journalAgent({
    userId,
    agent: 'ORION',
    type: 'MESSAGE',
    contactId: args.contactId ?? undefined,
    canal: 'email',
    sourceId: reponse.id,
    contenu: corps,
    contexte: { adresseEnvoi: conn.email, origine, transactionnel: true },
  })

  return { ok: true, messageId: reponse.id ?? '', adresseEnvoi: conn.email }
}
