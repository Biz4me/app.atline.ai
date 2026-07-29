/**
 * LA BOUCLE DE RÉSULTAT — le journal des agents et sa mesure.
 *
 * Atlas est le cerveau, les quatre autres sont les ouvriers. Un ouvrier agit,
 * on note ce qu'il a fait, et quelques heures ou quelques jours plus tard on
 * regarde ce que ça a donné. Le cerveau lit ces scores la nuit et décide.
 *
 * Deux règles qui tiennent tout :
 *
 *   1. AUCUNE IA dans la mesure. Ce sont des dates, des jointures et des
 *      seuils. Une IA qui juge son propre travail est un mauvais juge, et
 *      elle coûte cher pour dire ce qu'un SELECT dit mieux.
 *
 *   2. L'ABSENCE de signal est un signal. Passée l'échéance, le silence
 *      vaut IGNORE — c'est la donnée la plus fréquente, et souvent la plus
 *      instructive.
 */

import { db } from '@/lib/db'
import type { AgentName, AgentActionType, AgentOutcome } from '@prisma/client'

/** Combien de temps on laisse au monde pour réagir, avant de conclure au silence. */
const ECHEANCES: Record<AgentActionType, number> = {
  MESSAGE: 48,     // deux jours : au-delà, un prospect qui n'a pas répondu ne répondra pas
  RELANCE: 72,     // trois jours : une relance a le droit d'être lue plus tard
  INVITATION: 168, // une semaine : LinkedIn s'accepte lentement
  PUBLICATION: 168, // une semaine : une publication vit plusieurs jours
  APPEL: 24,
  RDV: 336,        // deux semaines : le temps que le rendez-vous ait lieu
  ETAPE: 168,      // une semaine pour qu'un filleul franchisse son étape
  LECON: 168,
}

export type ActionAJournaliser = {
  userId: string
  agent: AgentName
  type: AgentActionType
  contactId?: string | null
  canal?: string | null
  sourceId?: string | null
  contenu?: string | null
  /** Ce qui pourra expliquer POURQUOI ça a marché : angle, heure, produit cité, longueur… */
  contexte?: Record<string, unknown> | null
}

/**
 * À appeler au moment où l'action part réellement — pas quand elle est proposée.
 * Ne jette jamais : journaliser ne doit pas empêcher d'envoyer.
 */
export async function journaliser(a: ActionAJournaliser) {
  try {
    const heures = ECHEANCES[a.type] ?? 48
    return await db.agentAction.create({
      data: {
        userId: a.userId,
        agent: a.agent,
        type: a.type,
        contactId: a.contactId ?? null,
        canal: a.canal ?? null,
        sourceId: a.sourceId ?? null,
        contenu: a.contenu ? a.contenu.slice(0, 2000) : null,
        contexte: (a.contexte ?? undefined) as never,
        echeance: new Date(Date.now() + heures * 3600_000),
      },
      select: { id: true },
    })
  } catch (e) {
    console.error('[journal] action non journalisée', e)
    return null
  }
}

/** Écrit le verdict sur une action, une fois pour toutes. */
async function trancher(
  id: string,
  creee: Date,
  outcome: AgentOutcome,
  quand: Date | null,
  valeur?: number | null,
) {
  const at = quand ?? new Date()
  await db.agentAction.update({
    where: { id },
    data: {
      outcome,
      outcomeAt: outcome === 'IGNORE' ? null : at,
      delaiMinutes: outcome === 'IGNORE' ? null : Math.round((at.getTime() - creee.getTime()) / 60000),
      valeur: valeur ?? null,
      mesureAt: new Date(),
    },
  })
}

/**
 * LE MESUREUR. Balaie les actions encore en attente et cherche leur signal
 * dans ce que l'app enregistre déjà. Idempotent : on peut le relancer.
 *
 * @param maintenant injectable pour les tests
 */
export async function mesurer(maintenant = new Date()) {
  const attente = await db.agentAction.findMany({
    where: { outcome: 'EN_ATTENTE' },
    orderBy: { createdAt: 'asc' },
    take: 500,
  })

  const compte: Record<string, number> = {}
  const noter = (o: string) => { compte[o] = (compte[o] ?? 0) + 1 }

  for (const a of attente) {
    const echu = a.echeance <= maintenant

    // ── Ce qui attend une RÉPONSE d'un humain ────────────────────────────
    if (a.type === 'MESSAGE' || a.type === 'RELANCE' || a.type === 'APPEL' || a.type === 'INVITATION') {
      if (!a.contactId) { if (echu) { await trancher(a.id, a.createdAt, 'IGNORE', null); noter('IGNORE') } continue }

      // une réaction du contact APRÈS notre action : c'est le signal le plus net
      const reponse = await db.interaction.findFirst({
        where: { contactId: a.contactId, direction: 'IN', createdAt: { gt: a.createdAt } },
        orderBy: { createdAt: 'asc' },
        select: { id: true, createdAt: true, outcome: true },
      })
      if (reponse) {
        const refus = reponse.outcome === 'NEGATIF'
        await trancher(a.id, a.createdAt, refus ? 'NEGATIF' : 'REPONDU', reponse.createdAt)
        noter(refus ? 'NEGATIF' : 'REPONDU')
        continue
      }

      // un rendez-vous posé depuis l'action vaut mieux qu'une réponse
      const rdv = await db.appointment.findFirst({
        where: { contactId: a.contactId, createdAt: { gt: a.createdAt } },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      })
      if (rdv) { await trancher(a.id, a.createdAt, 'RDV_PRIS', rdv.createdAt); noter('RDV_PRIS'); continue }

      if (echu) { await trancher(a.id, a.createdAt, 'IGNORE', null); noter('IGNORE') }
      continue
    }

    // ── Ce qui attend des CLICS ──────────────────────────────────────────
    if (a.type === 'PUBLICATION') {
      if (!a.sourceId) { if (echu) { await trancher(a.id, a.createdAt, 'IGNORE', null); noter('IGNORE') } continue }
      const stats = await db.postAnalytics.findFirst({
        where: { postId: a.sourceId },
        select: { clicks: true, fetchedAt: true },
      })
      const clics = stats?.clicks ?? 0
      if (clics > 0) {
        await trancher(a.id, a.createdAt, 'CLIQUE', stats?.fetchedAt ?? maintenant, clics)
        noter('CLIQUE')
        continue
      }
      if (echu) { await trancher(a.id, a.createdAt, 'IGNORE', null, 0); noter('IGNORE') }
      continue
    }

    // ── Ce qui attend qu'un RENDEZ-VOUS ait lieu ─────────────────────────
    if (a.type === 'RDV') {
      if (a.sourceId) {
        const rdv = await db.appointment.findUnique({
          where: { id: a.sourceId },
          select: { outcome: true, updatedAt: true },
        })
        if (rdv?.outcome) {
          const bon = String(rdv.outcome).toUpperCase().includes('DONE')
            || String(rdv.outcome).toUpperCase().includes('POSITIF')
            || String(rdv.outcome).toUpperCase().includes('SIGNED')
          await trancher(a.id, a.createdAt, bon ? 'RDV_PRIS' : 'NEGATIF', rdv.updatedAt)
          noter(bon ? 'RDV_PRIS' : 'NEGATIF')
          continue
        }
      }
      if (echu) { await trancher(a.id, a.createdAt, 'IGNORE', null); noter('IGNORE') }
      continue
    }

    // ── Ce qui attend qu'un FILLEUL avance ───────────────────────────────
    if (a.type === 'ETAPE' || a.type === 'LECON') {
      if (a.contactId) {
        const bouge = await db.interaction.findFirst({
          where: { contactId: a.contactId, createdAt: { gt: a.createdAt } },
          select: { createdAt: true },
        })
        if (bouge) { await trancher(a.id, a.createdAt, 'AVANCE', bouge.createdAt); noter('AVANCE'); continue }
      }
      if (echu) { await trancher(a.id, a.createdAt, 'IGNORE', null); noter('IGNORE') }
      continue
    }

    if (echu) { await trancher(a.id, a.createdAt, 'IGNORE', null); noter('IGNORE') }
  }

  return { examinees: attente.length, tranchees: Object.values(compte).reduce((s, n) => s + n, 0), detail: compte }
}
