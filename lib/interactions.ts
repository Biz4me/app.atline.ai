import { db } from '@/lib/db'
import { journaliser } from '@/lib/agents/journal'
import type { AgentName, AgentActionType } from '@prisma/client'

export type InteractionType =
  | 'APPEL' | 'SMS' | 'EMAIL' | 'WHATSAPP' | 'DM' | 'VOCAL'
  | 'RDV' | 'RELANCE' | 'PARTAGE' | 'NOTE' | 'AUTRE'

export type LogInteractionInput = {
  contactId: string
  userId: string
  type: InteractionType
  direction?: 'OUT' | 'IN'
  outcome?: string | null
  body?: string | null
  isExposure?: boolean
  /**
   * Quel ouvrier a produit cette action. Omis, il est deduit du type —
   * la deduction est volontairement grossiere : mieux vaut un agent
   * approximatif qu'une action non mesuree.
   */
  agent?: AgentName
  canal?: string | null
}

// Qui fait quoi, par defaut. Orion converse, Iris telephone, Nova partage,
// Atlas tient l'agenda et les notes.
const AGENT_PAR_TYPE: Record<string, AgentName> = {
  RELANCE: 'ORION', SMS: 'ORION', EMAIL: 'ORION', WHATSAPP: 'ORION', DM: 'ORION',
  APPEL: 'IRIS', VOCAL: 'IRIS',
  PARTAGE: 'NOVA',
  RDV: 'ATLAS', NOTE: 'ATLAS', AUTRE: 'ATLAS',
}

const TYPE_ACTION: Record<string, AgentActionType> = {
  RELANCE: 'RELANCE', SMS: 'MESSAGE', EMAIL: 'MESSAGE', WHATSAPP: 'MESSAGE', DM: 'MESSAGE',
  APPEL: 'APPEL', VOCAL: 'APPEL', RDV: 'RDV', PARTAGE: 'MESSAGE',
}

/**
 * Fondation des actions CRM : journalise une interaction ET
 * met à jour le contact (lastContact = maintenant, exposures +1 si exposition).
 * Tout bouton d'action (appel/sms/email/…) passe par ici.
 */
export async function logInteraction(input: LogInteractionInput) {
  const isExposure = input.isExposure ?? true
  const [interaction] = await db.$transaction([
    db.interaction.create({
      data: {
        contactId: input.contactId,
        userId: input.userId,
        type: input.type,
        direction: input.direction ?? 'OUT',
        outcome: input.outcome ?? null,
        body: input.body ?? null,
        isExposure,
      },
    }),
    db.contact.update({
      where: { id: input.contactId },
      data: {
        lastContact: new Date(),
        ...(isExposure && { exposures: { increment: 1 } }),
      },
    }),
  ])

  // La boucle de resultat : toute action SORTANTE entre au journal, et sera
  // mesuree plus tard. Les entrantes n'y entrent pas — ce sont elles qui
  // servent de signal. `journaliser` ne jette jamais.
  const type = TYPE_ACTION[input.type]
  if ((input.direction ?? 'OUT') === 'OUT' && type) {
    await journaliser({
      userId: input.userId,
      agent: input.agent ?? AGENT_PAR_TYPE[input.type] ?? 'ORION',
      type,
      contactId: input.contactId,
      canal: input.canal ?? null,
      sourceId: interaction.id,
      contenu: input.body ?? null,
      contexte: { heure: new Date().getHours(), longueur: input.body?.length ?? 0 },
    })
  }

  return interaction
}
