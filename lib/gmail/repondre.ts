/**
 * LA BOUCLE QUI RÉPOND — et celle qui prépare les relances.
 *
 * ── POURQUOI CE N'EST PAS FAIT DANS L'ENDPOINT DE NOTIFICATION ─────────────
 *
 * Parce qu'un modèle qui réfléchit dix secondes ferait expirer l'accusé de
 * réception, Google réessaierait, et le prospect recevrait deux réponses. La
 * réception reste donc rapide et bête ; la rédaction, qui est lente, se fait
 * ici, à part.
 *
 * ── ET POURQUOI IL N'Y A PAS DE TABLE DE FILE D'ATTENTE ────────────────────
 *
 * Parce que l'état est déjà dans les données : un fil dont la dernière
 * réception est postérieure au dernier envoi attend une réponse. C'est vrai
 * par construction, ça survit à un redémarrage, ça ne peut pas se désynchroniser
 * d'une file parallèle, et un envoi refusé par un plafond reste simplement
 * « en attente » jusqu'au passage suivant.
 *
 * ── CE QUI EST AUTOMATIQUE ET CE QUI NE L'EST PAS ──────────────────────────
 *
 * Répondre à quelqu'un qui vient d'écrire est automatique : c'est urgent et
 * sans risque. Relancer un silence ne l'est pas : ça engage le nom et la
 * réputation d'expéditeur du distributeur. Cette boucle prépare donc le texte
 * des relances, mais n'en envoie aucune — c'est lui qui décide, relance par
 * relance.
 */

import { db } from '@/lib/db'
import { envoyerMail, MAX_ECHANGES_SANS_ISSUE } from '@/lib/gmail/envoyer'
import { redigerReponse, redigerRelance, poserIssue } from '@/lib/gmail/orion'
import { programmerProchaine } from '@/lib/gmail/sequence'

export type PasseReponses = { repondus: number; issues: number; reportes: number; echecs: number }

/**
 * Les fils où le prospect a parlé en dernier. Un fil dont la dernière
 * réception est postérieure au dernier envoi attend une réponse : c'est la
 * définition, et elle se lit directement en base.
 */
export async function repondreAuxNouveaux(limite = 20): Promise<PasseReponses> {
  const candidats = await db.emailFil.findMany({
    where: {
      issue: null,
      humainRepris: false,
      dernierRecuAt: { not: null },
      echanges: { lt: MAX_ECHANGES_SANS_ISSUE },
    },
    orderBy: { dernierRecuAt: 'asc' },
    take: limite,
  })

  const aTraiter = candidats.filter(
    (f) => f.dernierRecuAt && (!f.dernierEnvoiAt || f.dernierRecuAt > f.dernierEnvoiAt),
  )

  // Un seul envoi par distributeur et par passage : l'espacement minimal
  // ferait de toute façon refuser les suivants.
  const dejaServi = new Set<string>()
  const bilan: PasseReponses = { repondus: 0, issues: 0, reportes: 0, echecs: 0 }

  for (const fil of aTraiter) {
    if (dejaServi.has(fil.userId)) {
      bilan.reportes++
      continue
    }

    const redaction = await redigerReponse(fil.id)
    if (!redaction) {
      bilan.echecs++
      continue
    }

    dejaServi.add(fil.userId)

    const envoi = await envoyerMail({
      userId: fil.userId,
      destinataire: fil.destinataire,
      sujet: /^re\s*:/i.test(fil.sujet) ? fil.sujet : `Re: ${fil.sujet}`,
      corps: redaction.texte,
      contactId: fil.contactId,
      filId: fil.id,
    })

    if (!envoi.ok) {
      // Un plafond ou un espacement : rien à réparer, le fil reste en attente
      // et repassera. Les refus définitifs, eux, ont déjà fermé le fil.
      if (envoi.motif === 'plafond-du-jour' || envoi.motif === 'trop-rapide') bilan.reportes++
      else bilan.echecs++
      continue
    }

    bilan.repondus++

    // L'issue se pose APRÈS l'envoi : le message part quand même, il accuse
    // réception poliment. C'est la conversation qui se ferme, pas la réponse
    // qui s'annule.
    if (redaction.issue) {
      await poserIssue(fil.id, redaction.issue)
      bilan.issues++
    } else {
      // Le prospect a parlé puis on a répondu. S'il se tait maintenant, une
      // nouvelle séquence doit repartir — à l'étape 1, ce n'est plus le même
      // silence qu'avant son message.
      await programmerProchaine(fil.id)
    }
  }

  return bilan
}

export type PasseBrouillons = { rediges: number; echecs: number }

/**
 * Prépare le texte des relances arrivées à échéance. Sans ce passage, le
 * distributeur ouvrirait sa liste et trouverait des relances vides, sans rien
 * à lire ni à valider.
 */
export async function redigerLesBrouillons(limite = 30): Promise<PasseBrouillons> {
  const dues = await db.relance.findMany({
    where: {
      status: 'PENDING',
      channel: 'email',
      etape: { not: null },
      message: null,
      dueAt: { lte: new Date() },
      emailFilId: { not: null },
    },
    orderBy: { dueAt: 'asc' },
    take: limite,
  })

  const bilan: PasseBrouillons = { rediges: 0, echecs: 0 }
  for (const r of dues) {
    const redaction = await redigerRelance(r.emailFilId!, r.etape ?? 1)
    if (!redaction) {
      bilan.echecs++
      continue
    }
    await db.relance.update({ where: { id: r.id }, data: { message: redaction.texte } })
    bilan.rediges++
  }
  return bilan
}
