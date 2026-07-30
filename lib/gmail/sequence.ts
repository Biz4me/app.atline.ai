/**
 * LA SÉQUENCE DE RELANCE — quatre tentatives, de plus en plus espacées,
 * et jamais sans l'accord du distributeur.
 *
 * Le prospect ne répond pas. On relance. C'est le geste le plus banal de la
 * prospection, et le plus dangereux pour une adresse e-mail : écrire à
 * quelqu'un qui vient de vous écrire ne coûte rien, insister dans le silence
 * est exactement ce qui fait basculer un compte en spam.
 *
 * D'où les trois partis pris de ce fichier.
 *
 * ── DES ÉCARTS QUI GRANDISSENT ─────────────────────────────────────────────
 *
 * +1, +3, +5, +7 jours ENTRE chaque relance. Un premier message le 3 août
 * donne donc le 4, le 7, le 12, puis le 19. Quatre e-mails en seize jours à
 * quelqu'un qui n'a jamais répondu, ça passe. Les mêmes quatre en une semaine,
 * non : c'est le rythme qui déclenche les plaintes, pas le texte.
 *
 * Les écarts se comptent depuis le DERNIER envoi, pas depuis le premier
 * message. Une relance validée avec trois jours de retard décale la suivante
 * d'autant, au lieu d'arriver le lendemain parce que le calendrier théorique
 * l'avait prévu comme ça.
 *
 * ── CHAQUE RELANCE EST VALIDÉE ─────────────────────────────────────────────
 *
 * Orion prépare le texte, le distributeur le lit, le corrige s'il veut, et
 * décide. C'est son nom et sa réputation d'expéditeur qui partent, pas les
 * nôtres. Les réponses à un prospect qui a écrit, elles, restent automatiques :
 * là, l'urgence l'emporte et le risque est nul.
 *
 * ── QUATRE, PUIS ON SE TAIT ────────────────────────────────────────────────
 *
 * Après la quatrième sans réponse, le fil devient dormant. Orion pourra le
 * reproposer plus tard, sur un autre angle ou un autre canal, mais l'e-mail
 * s'arrête. Insister au-delà ne convertit pas : ça abîme l'adresse.
 *
 * Et la séquence s'annule dès que le prospect existe à nouveau : il répond, il
 * prend rendez-vous, il s'inscrit, il achète, il refuse. Dans les quatre
 * derniers cas c'est définitif ; s'il a simplement répondu puis s'est tu, une
 * nouvelle séquence repart de l'étape 1 — le silence après un échange n'est
 * pas le même silence qu'avant.
 */

import { db } from '@/lib/db'
import { envoyerMail } from '@/lib/gmail/envoyer'

/** Jours d'attente AVANT la relance n° (index + 1), depuis le dernier envoi. */
export const INTERVALLES = [1, 3, 5, 7]
export const NB_ETAPES = INTERVALLES.length

const VIVANTES = ['PENDING', 'VALIDATED']

function dans(jours: number): Date {
  return new Date(Date.now() + jours * 24 * 3600_000)
}

/**
 * Programme la relance suivante après un envoi réussi. À appeler AUSSI après
 * le tout premier message d'un fil : c'est ce qui démarre la séquence à
 * l'étape 1.
 *
 * Volontairement PAS appelée depuis `envoyerMail` : au moment où l'envoi
 * revient, la relance en cours n'est pas encore marquée envoyée, et le compte
 * des étapes déjà faites reprogrammerait celle qu'on vient de faire partir.
 * L'appelant décide, une fois son état à jour.
 *
 * Ne fait rien si la conversation est close, reprise par un humain, déjà allée
 * au bout, ou si une relance est déjà en attente. Renvoie l'étape programmée.
 */
export async function programmerProchaine(filId: string): Promise<number | null> {
  const fil = await db.emailFil.findUnique({ where: { id: filId } })
  if (!fil || fil.issue || fil.humainRepris || !fil.contactId) return null

  // On ne double jamais une relance déjà en attente pour ce fil.
  const dejaEnAttente = await db.relance.count({
    where: { emailFilId: filId, status: { in: VIVANTES } },
  })
  if (dejaEnAttente > 0) return null

  const dejaFaites = await db.relance.count({
    where: { emailFilId: filId, status: 'SENT' },
  })
  if (dejaFaites >= NB_ETAPES) return null

  const etape = dejaFaites + 1
  await db.relance.create({
    data: {
      userId: fil.userId,
      contactId: fil.contactId,
      channel: 'email',
      emailFilId: filId,
      etape,
      dueAt: dans(INTERVALLES[etape - 1]),
    },
  })
  return etape
}

/**
 * Le prospect s'est manifesté, ou la conversation a trouvé son issue : on
 * annule ce qui restait. La raison est enregistrée pour pouvoir l'expliquer,
 * pas seulement pour la journaliser.
 */
export async function arreterSequence(filId: string, raison: string): Promise<number> {
  const { count } = await db.relance.updateMany({
    where: { emailFilId: filId, status: { in: VIVANTES } },
    data: { status: 'CANCELLED', raisonFin: raison.slice(0, 200) },
  })
  return count
}

export type RelanceAValider = {
  id: string
  contactId: string
  contact: string
  destinataire: string
  etape: number
  surTotal: number
  dueAt: string
  enRetardJours: number
  brouillon: string | null
  sujet: string
}

/**
 * Ce que le distributeur doit décider aujourd'hui. C'est la réponse à
 * « qui est en étape 1, 3, 5 ou 7 ».
 */
export async function aValider(userId: string): Promise<RelanceAValider[]> {
  const rows = await db.relance.findMany({
    where: {
      userId,
      status: 'PENDING',
      channel: 'email',
      etape: { not: null },
      dueAt: { lte: new Date() },
    },
    orderBy: { dueAt: 'asc' },
    take: 100,
  })
  if (!rows.length) return []

  const [contacts, fils] = await Promise.all([
    db.contact.findMany({
      where: { id: { in: [...new Set(rows.map((r) => r.contactId))] } },
      select: { id: true, name: true, firstName: true, lastName: true, email: true },
    }),
    db.emailFil.findMany({
      where: { id: { in: rows.map((r) => r.emailFilId).filter(Boolean) as string[] } },
      select: { id: true, sujet: true, destinataire: true },
    }),
  ])
  const parContact = new Map(contacts.map((c) => [c.id, c]))
  const parFil = new Map(fils.map((f) => [f.id, f]))

  return rows.map((r) => {
    const c = parContact.get(r.contactId)
    const f = r.emailFilId ? parFil.get(r.emailFilId) : undefined
    return {
      id: r.id,
      contactId: r.contactId,
      contact: c?.name || [c?.firstName, c?.lastName].filter(Boolean).join(' ') || 'Contact',
      destinataire: f?.destinataire || c?.email || '',
      etape: r.etape ?? 1,
      surTotal: NB_ETAPES,
      dueAt: r.dueAt.toISOString(),
      enRetardJours: Math.max(0, Math.floor((Date.now() - r.dueAt.getTime()) / 86_400_000)),
      brouillon: r.message,
      sujet: f?.sujet ?? '',
    }
  })
}

export type ResultatValidation =
  | { ok: true; envoye: true; messageId: string; prochaineEtape: number | null }
  | { ok: true; envoye: false; enFile: true; message: string }
  | { ok: false; message: string }

/**
 * Le distributeur dit oui. On tente l'envoi tout de suite ; si le plafond du
 * jour ou l'espacement s'y opposent, la relance reste en file et partira au
 * prochain passage — sans qu'il ait à revalider.
 *
 * `texte` permet de corriger le brouillon avant d'envoyer : c'est le geste
 * qu'on veut encourager, un texte relu vaut mieux qu'un texte généré.
 */
export async function valider(
  relanceId: string,
  userId: string,
  texte?: string,
): Promise<ResultatValidation> {
  const relance = await db.relance.findFirst({ where: { id: relanceId, userId } })
  if (!relance) return { ok: false, message: 'relance introuvable' }
  if (relance.status !== 'PENDING' && relance.status !== 'VALIDATED') {
    return { ok: false, message: `relance déjà ${relance.status === 'SENT' ? 'envoyée' : 'annulée'}` }
  }

  const corps = (texte ?? relance.message ?? '').trim()
  if (!corps) return { ok: false, message: 'aucun texte à envoyer' }

  const fil = relance.emailFilId ? await db.emailFil.findUnique({ where: { id: relance.emailFilId } }) : null
  if (!fil) return { ok: false, message: 'fil e-mail introuvable' }
  if (fil.issue || fil.humainRepris) {
    await arreterSequence(fil.id, fil.issue ? `issue atteinte (${fil.issue})` : 'le distributeur a repris la main')
    return { ok: false, message: 'cette conversation n’attend plus de relance' }
  }

  await db.relance.update({
    where: { id: relance.id },
    data: { status: 'VALIDATED', message: corps },
  })

  return envoyerRelance(relance.id)
}

/**
 * Tente l'envoi d'une relance déjà validée. Séparé de `valider()` parce que
 * c'est aussi ce que fait le passage périodique sur la file d'attente.
 */
async function envoyerRelance(relanceId: string): Promise<ResultatValidation> {
  const relance = await db.relance.findUnique({ where: { id: relanceId } })
  if (!relance?.emailFilId || !relance.message) return { ok: false, message: 'relance incomplète' }

  const fil = await db.emailFil.findUnique({ where: { id: relance.emailFilId } })
  if (!fil) return { ok: false, message: 'fil introuvable' }

  const envoi = await envoyerMail({
    userId: relance.userId,
    destinataire: fil.destinataire,
    // Le même sujet préfixé : c'est ce qui regroupe la relance sous le
    // message d'origine dans la boîte du prospect.
    sujet: /^re\s*:/i.test(fil.sujet) ? fil.sujet : `Re: ${fil.sujet}`,
    corps: relance.message,
    contactId: relance.contactId,
    filId: fil.id,
  })

  if (envoi.ok) {
    await db.relance.update({
      where: { id: relance.id },
      data: { status: 'SENT', sentAt: new Date() },
    })
    const prochaine = await programmerProchaine(fil.id)
    return { ok: true, envoye: true, messageId: envoi.messageId, prochaineEtape: prochaine }
  }

  // Empêchements du moment : on garde la relance en file, elle repartira
  // seule. Le distributeur a déjà dit oui, il n'a pas à le redire.
  if (envoi.motif === 'plafond-du-jour' || envoi.motif === 'trop-rapide' || envoi.motif === 'refus-de-google') {
    return { ok: true, envoye: false, enFile: true, message: envoi.message }
  }

  // Empêchements définitifs : la séquence n'a plus lieu d'être.
  await arreterSequence(fil.id, envoi.message)
  return { ok: false, message: envoi.message }
}

/**
 * Le passage périodique sur la file : envoie les relances validées qui
 * attendaient. UNE par distributeur et par passage, parce que l'espacement
 * minimal entre deux envois d'un même compte les ferait de toute façon
 * refuser — autant ne pas les compter comme des échecs.
 */
export async function viderLaFile(limite = 50): Promise<{ envoyees: number; enAttente: number; echecs: number }> {
  const enFile = await db.relance.findMany({
    where: { status: 'VALIDATED', channel: 'email' },
    orderBy: { dueAt: 'asc' },
    take: limite,
  })

  const dejaServi = new Set<string>()
  let envoyees = 0
  let echecs = 0
  let enAttente = 0

  for (const r of enFile) {
    if (dejaServi.has(r.userId)) {
      enAttente++
      continue
    }
    dejaServi.add(r.userId)
    const res = await envoyerRelance(r.id)
    if (res.ok && res.envoye) envoyees++
    else if (res.ok) enAttente++
    else echecs++
  }
  return { envoyees, enAttente, echecs }
}
