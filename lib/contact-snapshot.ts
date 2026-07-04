import { db } from '@/lib/db'

// Snapshot d'UN contact → Atlas connaît la personne : faits durs + qualification
// (modèle explicite) + note + sa mémoire auto-éditée + dernières interactions.
// Partagé par le proxy chat (contactId explicite, fiche) et l'endpoint interne
// /api/internal/contact-lookup (résolution par nom depuis l'accueil, option C).
export async function buildContactSnapshot(userId: string, contactId: string): Promise<string> {
  try {
    const c = await db.contact.findFirst({ where: { id: contactId, userId } })
    if (!c) return ''
    const q = (c.qualification ?? null) as Record<string, string> | null
    const interactions = await db.interaction.findMany({
      where: { contactId, userId }, orderBy: { createdAt: 'desc' }, take: 3,
      select: { type: true, outcome: true, createdAt: true },
    })
    const lines: string[] = [`Contact : ${c.name}`]
    const kindLabel = c.kind === 'CLIENT' ? 'Client' : c.kind === 'PARTENAIRE' ? 'Partenaire' : 'Prospect'
    let statut = kindLabel
    if (c.prospectStage) statut += ` · tunnel : ${c.prospectStage}`
    if (c.partnerStage) statut += ` · partenaire : ${c.partnerStage}`
    lines.push(`Statut : ${statut}`)
    if (c.market) lines.push(`Marché (proximité) : ${({ CHAUD: 'chaud', TIEDE: 'tiède', FROID: 'froid' } as Record<string, string>)[c.market] ?? c.market}`)
    if (c.personality) lines.push(`Couleur (Big Al) : ${c.personality}`)
    if (q) {
      const ql = [q.situation && `situation: ${q.situation}`, q.interests && `intérêts: ${q.interests}`, q.motivation && `motivation: ${q.motivation}`, q.insatisfaction && `insatisfaction: ${q.insatisfaction}`, q.reseau && `réseau: ${q.reseau}`, q.ouverture && `ouverture: ${q.ouverture}`].filter(Boolean).join(' · ')
      if (ql) lines.push(`Qualification : ${ql}`)
    }
    if (typeof c.exposures === 'number' && c.exposures > 0) lines.push(`Expositions : ${c.exposures}`)
    if (c.source) lines.push(`Origine : ${c.source}`)
    if (c.note) lines.push(`Note : ${c.note}`)
    if (c.atlasMemory) lines.push(`Ta mémoire sur lui : ${c.atlasMemory}`)
    if (interactions.length) {
      const il = interactions.map((i) => `${i.type.toLowerCase()}${i.outcome ? ` (${i.outcome.toLowerCase()})` : ''} le ${i.createdAt.toLocaleDateString('fr-FR')}`).join(' · ')
      lines.push(`Dernières interactions : ${il}`)
    }
    return lines.join('\n')
  } catch {
    return ''
  }
}

// Résolution nom → contact(s) du user. 0 / 1 / plusieurs. Sûr : toujours scopé userId.
export async function resolveContacts(userId: string, query: string): Promise<{ id: string; name: string }[]> {
  const q = query.trim()
  if (!q) return []
  const rows = await db.contact.findMany({
    where: { userId, name: { contains: q, mode: 'insensitive' } },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, name: true },
    take: 6,
  })
  return rows
}
