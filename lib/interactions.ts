import { db } from '@/lib/db'

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
  return interaction
}
