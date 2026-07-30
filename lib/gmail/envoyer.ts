/**
 * ENVOYER UN E-MAIL AU NOM DU DISTRIBUTEUR — et savoir s'arrêter.
 *
 * Le code qui appelle Google tient en dix lignes. Tout le reste de ce fichier,
 * ce sont les freins, et c'est volontaire : envoyer est facile, c'est
 * s'arrêter à temps qui est difficile, et c'est ce qui décide si le compte
 * Gmail d'un distributeur survit à sa première semaine de prospection.
 *
 * ── SIX RAISONS DE NE PAS ENVOYER, DANS CET ORDRE ──────────────────────────
 *
 *   1. Le distributeur a repris la main sur ce fil. Rien ne part, jamais.
 *   2. La conversation a atteint son issue (RDV, inscription, achat, refus).
 *   3. Huit allers-retours sans issue : on passe la main à l'humain.
 *   4. Le fil appartient à une AUTRE boîte que celle connectée aujourd'hui.
 *   5. Le plafond du jour est atteint.
 *   6. Le dernier envoi est trop récent.
 *
 * Les raisons 1, 2 et 3 sont des arrêts définitifs : la conversation ne doit
 * pas continuer, point. Les raisons 4, 5 et 6 sont des empêchements du moment,
 * et seule la 5 justifie de passer par Brevo — les autres veulent dire
 * « attends », pas « envoie autrement ».
 *
 * ── LES CHIFFRES, ET D'OÙ ILS VIENNENT ─────────────────────────────────────
 *
 * Google autorise 500 e-mails par jour sur un compte gratuit, et ce compteur
 * inclut la vie privée du distributeur : ses mails perso, sa famille, son
 * banquier. Notre plafond est donc très en dessous. Il n'est pas imposé par
 * Google, il est choisi par nous, et c'est le principal garde-fou contre le
 * vrai risque : pas le contenu des messages, qui est différent à chaque fois,
 * mais le RYTHME, qui serait identique sur tous les comptes.
 *
 * ── LES ACCENTS ────────────────────────────────────────────────────────────
 *
 * Un e-mail est de l'ASCII par défaut. « Ça t'intéresse ? » envoyé naïvement
 * arrive en « Ãa t'intÃ©resse ? ». Les en-têtes passent donc par RFC 2047 et
 * le corps par du base64 UTF-8 déclaré. Ce n'est pas de la précaution
 * théorique : c'est le genre de détail qui se voit chez un vrai prospect.
 */

import { db } from '@/lib/db'
import { connexionDe, jetonFrais, journaliser as tracerAcces } from '@/lib/google/connexion'
import { journaliser as journalAgent } from '@/lib/agents/journal'
import { construireMessage, base64url } from '@/lib/gmail/message'

const SCOPE_ENVOI = 'https://www.googleapis.com/auth/gmail.send'
const API = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send'

/** Choisi par nous, pas par Google. Voir l'en-tête du fichier. */
export const PLAFOND_QUOTIDIEN = 60
/** Deux envois collés depuis le même compte, c'est le motif qui se repère. */
export const ESPACEMENT_MINIMAL_MS = 3 * 60_000
/** Au-delà, la conversation n'avance plus : c'est à l'humain de jouer. */
export const MAX_ECHANGES_SANS_ISSUE = 8

export type MotifRefus =
  | 'non-connecte'
  | 'sans-permission'
  | 'humain-a-repris'
  | 'issue-atteinte'
  | 'trop-d-echanges'
  | 'autre-boite'
  | 'plafond-du-jour'
  | 'trop-rapide'
  | 'refus-de-google'

export type Envoi =
  | { ok: true; messageId: string; threadId: string; filId: string; adresseEnvoi: string }
  | { ok: false; motif: MotifRefus; message: string; replierSurBrevo: boolean; filId?: string }

/** Combien d'envois automatiques aujourd'hui — lus dans le journal d'accès. */
export async function envoisDuJour(userId: string): Promise<number> {
  const debut = new Date()
  debut.setHours(0, 0, 0, 0)
  return db.googleAcces.count({
    where: { userId, action: 'ENVOI', createdAt: { gte: debut } },
  })
}

export async function envoyerMail(args: {
  userId: string
  destinataire: string
  sujet: string
  corps: string
  contactId?: string | null
  /** Fil existant. Absent : on cherche par destinataire, sinon on en ouvre un. */
  filId?: string
}): Promise<Envoi> {
  const { userId, destinataire, sujet, corps } = args

  const conn = await connexionDe(userId)
  if (!conn?.email) {
    return {
      ok: false,
      motif: 'non-connecte',
      message: 'aucun compte Google connecté : impossible d’écrire en son nom',
      replierSurBrevo: false,
    }
  }
  if (!(conn.scope ?? '').split(' ').includes(SCOPE_ENVOI)) {
    return {
      ok: false,
      motif: 'sans-permission',
      message: 'la permission d’envoi n’a pas été accordée',
      replierSurBrevo: false,
    }
  }

  // ── le fil, et la boîte à laquelle il appartient ──────────────────────────
  let fil = args.filId
    ? await db.emailFil.findUnique({ where: { id: args.filId } })
    : await db.emailFil.findFirst({
        where: { userId, destinataire, issue: null, humainRepris: false },
        orderBy: { updatedAt: 'desc' },
      })

  if (fil) {
    if (fil.humainRepris) {
      return { ok: false, motif: 'humain-a-repris', message: 'le distributeur a repris ce fil', replierSurBrevo: false, filId: fil.id }
    }
    if (fil.issue) {
      return { ok: false, motif: 'issue-atteinte', message: `conversation close (${fil.issue})`, replierSurBrevo: false, filId: fil.id }
    }
    if (fil.echanges >= MAX_ECHANGES_SANS_ISSUE) {
      return {
        ok: false,
        motif: 'trop-d-echanges',
        message: `${fil.echanges} allers-retours sans issue : à l’humain de jouer`,
        replierSurBrevo: false,
        filId: fil.id,
      }
    }
    // LA règle du fil figé : on n'écrit pas dans une conversation ouverte
    // depuis une autre adresse. Elle se casserait chez le prospect.
    if (fil.adresseEnvoi.toLowerCase() !== conn.email.toLowerCase()) {
      return {
        ok: false,
        motif: 'autre-boite',
        message: `ce fil a été ouvert depuis ${fil.adresseEnvoi}, la boîte connectée est ${conn.email}`,
        replierSurBrevo: false,
        filId: fil.id,
      }
    }
  }

  // ── le rythme ─────────────────────────────────────────────────────────────
  const dejaEnvoyes = await envoisDuJour(userId)
  if (dejaEnvoyes >= PLAFOND_QUOTIDIEN) {
    return {
      ok: false,
      motif: 'plafond-du-jour',
      message: `plafond du jour atteint (${dejaEnvoyes}/${PLAFOND_QUOTIDIEN})`,
      // Le seul cas où passer par Brevo a du sens : on a quelque chose à dire
      // et c'est seulement la boîte Gmail qui est saturée.
      replierSurBrevo: true,
      filId: fil?.id,
    }
  }

  const dernier = await db.googleAcces.findFirst({
    where: { userId, action: 'ENVOI' },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  })
  if (dernier && Date.now() - dernier.createdAt.getTime() < ESPACEMENT_MINIMAL_MS) {
    const reste = Math.ceil((ESPACEMENT_MINIMAL_MS - (Date.now() - dernier.createdAt.getTime())) / 1000)
    return {
      ok: false,
      motif: 'trop-rapide',
      message: `envoi précédent trop récent, réessayer dans ${reste} s`,
      replierSurBrevo: false,
      filId: fil?.id,
    }
  }

  // ── l'envoi ───────────────────────────────────────────────────────────────
  const jeton = await jetonFrais(userId)
  if (!jeton) {
    return { ok: false, motif: 'non-connecte', message: 'jeton Google indisponible', replierSurBrevo: false, filId: fil?.id }
  }

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
    repondA: fil?.dernierMessageId,
  })

  let reponse: { id?: string; threadId?: string }
  try {
    const r = await fetch(API, {
      method: 'POST',
      headers: { Authorization: `Bearer ${jeton}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        raw: base64url(brut),
        ...(fil?.gmailThreadId ? { threadId: fil.gmailThreadId } : {}),
      }),
      signal: AbortSignal.timeout(20_000),
    })
    if (!r.ok) {
      const detail = (await r.text().catch(() => '')).slice(0, 300)
      await tracerAcces({
        userId,
        action: 'ERREUR',
        adresse: conn.email,
        detail: `envoi refusé par Google (${r.status}) ${detail}`,
      })
      return {
        ok: false,
        motif: 'refus-de-google',
        message: `Google a refusé l’envoi (${r.status})`,
        // Un 429 ou un 403 de quota : Brevo peut prendre le relais.
        replierSurBrevo: r.status === 429 || r.status === 403,
        filId: fil?.id,
      }
    }
    reponse = await r.json()
  } catch (e) {
    await tracerAcces({
      userId,
      action: 'ERREUR',
      adresse: conn.email,
      detail: `envoi impossible : ${e instanceof Error ? e.message : 'inconnu'}`,
    })
    return { ok: false, motif: 'refus-de-google', message: 'Google injoignable', replierSurBrevo: true, filId: fil?.id }
  }

  // ── ce qui est parti est écrit ────────────────────────────────────────────
  fil = fil
    ? await db.emailFil.update({
        where: { id: fil.id },
        data: {
          echanges: { increment: 1 },
          dernierEnvoiAt: new Date(),
          gmailThreadId: fil.gmailThreadId ?? reponse.threadId ?? null,
        },
      })
    : await db.emailFil.create({
        data: {
          userId,
          contactId: args.contactId ?? null,
          // Figée ici, et plus jamais réécrite.
          adresseEnvoi: conn.email,
          destinataire,
          sujet,
          gmailThreadId: reponse.threadId ?? null,
          echanges: 1,
          dernierEnvoiAt: new Date(),
        },
      })

  await tracerAcces({
    userId,
    action: 'ENVOI',
    adresse: conn.email,
    ressource: reponse.id ?? null,
    detail: `vers ${destinataire}`,
  })

  // Le même journal que Chatwoot : la boucle de résultat mesure les e-mails
  // exactement comme le reste, sans système parallèle.
  await journalAgent({
    userId,
    agent: 'ORION',
    type: 'MESSAGE',
    contactId: args.contactId ?? undefined,
    canal: 'email',
    sourceId: reponse.id,
    contenu: corps,
    contexte: { adresseEnvoi: conn.email, filId: fil.id, echanges: fil.echanges },
  })

  return {
    ok: true,
    messageId: reponse.id ?? '',
    threadId: reponse.threadId ?? '',
    filId: fil.id,
    adresseEnvoi: conn.email,
  }
}
