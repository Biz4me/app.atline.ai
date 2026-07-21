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
    // Nom COMPLET (prénom + nom) pour distinguer les homonymes (deux « Julie »).
    const fullName = `${c.name}${c.lastName && !c.name.toLowerCase().includes(c.lastName.toLowerCase()) ? ` ${c.lastName}` : ''}`
    const lines: string[] = [`Contact : ${fullName}`]
    const kindLabel = c.kind === 'CLIENT' ? 'Client' : c.kind === 'PARTENAIRE' ? 'Partenaire' : 'Prospect'
    let statut = kindLabel
    if (c.prospectStage) statut += ` · tunnel : ${c.prospectStage}`
    if (c.clientStage) statut += ` · client : ${c.clientStage}`
    if (c.partnerStage) statut += ` · partenaire : ${c.partnerStage}`
    if (c.signedAt) statut += ` (signé le ${c.signedAt.toLocaleDateString('fr-FR')})`
    lines.push(`Statut : ${statut}`)
    if (c.gender) {
      const g = ({ M: 'homme', H: 'homme', HOMME: 'homme', F: 'femme', FEMME: 'femme' } as Record<string, string>)[c.gender.toUpperCase()] ?? c.gender
      lines.push(`Genre : ${g} (accorde tes messages)`)
    }
    if (c.profession) lines.push(`Métier : ${c.profession}`)
    if (c.education) lines.push(`Formation : ${c.education}`)
    if (c.birthDate) {
      const b = new Date(c.birthDate)
      const today = new Date()
      let age = today.getFullYear() - b.getFullYear()
      if (today < new Date(today.getFullYear(), b.getMonth(), b.getDate())) age--
      const anniv = b.getMonth() === today.getMonth() && b.getDate() === today.getDate()
      lines.push(`Naissance : ${b.toLocaleDateString('fr-FR')} (${age} ans)${anniv ? " — C'EST SON ANNIVERSAIRE AUJOURD'HUI 🎂" : ''}`)
    }
    const reach = [c.phone && 'téléphone/WhatsApp', c.email && 'email'].filter(Boolean).join(' · ')
    lines.push(reach ? `Joignable par : ${reach}` : '⚠️ Aucune coordonnée (ni téléphone ni email) — propose de les récupérer')
    if (c.city || c.country) lines.push(`Ville : ${[c.city, c.country].filter(Boolean).join(', ')}`)
    if (c.market) lines.push(`Marché (proximité) : ${({ CHAUD: 'chaud', TIEDE: 'tiède', FROID: 'froid' } as Record<string, string>)[c.market] ?? c.market}`)
    if (c.personality) lines.push(`Couleur (Big Al) : ${c.personality}`)
    if (q) {
      const ql = [q.situation && `situation: ${q.situation}`, q.interests && `intérêts: ${q.interests}`, q.motivation && `motivation: ${q.motivation}`, q.insatisfaction && `insatisfaction: ${q.insatisfaction}`, q.reseau && `réseau: ${q.reseau}`, q.ouverture && `ouverture: ${q.ouverture}`].filter(Boolean).join(' · ')
      if (ql) lines.push(`Qualification : ${ql}`)
    }
    if (c.tags.length) lines.push(`Tags : ${c.tags.join(', ')}`)
    if (typeof c.exposures === 'number' && c.exposures > 0) lines.push(`Expositions : ${c.exposures}`)
    if (c.lastContact) lines.push(`Dernier contact : il y a ${Math.max(0, Math.floor((Date.now() - new Date(c.lastContact).getTime()) / 86_400_000))} j`)
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
