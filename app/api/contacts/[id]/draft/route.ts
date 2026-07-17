import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { readAtlas } from '@/lib/atlas'

const COLOR_TONE: Record<string, string> = {
  ROUGE: "Profil ROUGE (fonceur) : va droit au but, parle résultat/concret, zéro blabla, sois assuré.",
  BLEU: "Profil BLEU (social) : sois enthousiaste, chaleureux, mise sur le fun, l'aventure et les gens. Un emoji ok.",
  JAUNE: "Profil JAUNE (relationnel) : sois doux, bienveillant, AUCUNE pression, montre que tu penses à lui/elle.",
  VERT: "Profil VERT (analytique) : sois factuel, précis, calme, sans hype ; propose une info concrète.",
}

const STAGE_INTENT: Record<string, string> = {
  NOUVEAU: "Objectif : briser la glace, reprendre contact naturellement.",
  INVITATION: "Objectif : l'inviter à découvrir (produit ou opportunité) en créant la curiosité, sans tout dévoiler.",
  PRESENTATION: "Objectif : caler/confirmer un moment pour lui présenter les choses.",
  SUIVI: "Objectif : faire le suivi après la présentation, lever gentiment ses doutes, garder le lien.",
  CLOSING: "Objectif : l'aider à décider maintenant, lever la dernière objection en douceur.",
}

// Le message suit le VRAI statut du contact — une partenaire ne reçoit plus un message de prospection.
const PARTNER_INTENT: Record<string, string> = {
  DEMARRAGE: "C'est une NOUVELLE PARTENAIRE de ton équipe : félicite-la, cadre ses premières 48 heures (ses objectifs, sa liste de noms, son premier contact accompagné), propose un point ensemble.",
  FORMATION: "Partenaire en formation : encourage sa montée en compétence, propose ton aide sur un module ou une action concrète.",
  ACTIF: "Partenaire actif : entretiens la dynamique d'équipe, valorise ses résultats récents, garde le lien.",
  LEADER: "Leader de ton équipe : reconnaissance entre pros, vision, coordination — jamais de ton descendant.",
}
const CLIENT_INTENT = "C'est un(e) client(e) : prends des nouvelles, assure-toi que le produit lui convient, fidélise — sans vendre à tout prix."

const CHANNEL_RULE: Record<string, string> = {
  SMS: "Canal SMS : très court (1-2 phrases max).",
  WHATSAPP: "Canal WhatsApp : court et chaleureux, ton parlé, un emoji possible.",
  EMAIL: "Canal Email : un peu plus développé, avec une formule d'accroche et de fin.",
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  const c = await db.contact.findFirst({ where: { id, userId: session.user.id } })
  if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { channel, instruction } = await req.json()
  const ch = String(channel ?? 'SMS').toUpperCase()
  // Consigne libre de l'utilisateur (« propose-lui un RDV mardi ») — prioritaire sur l'intention du stade
  const consigne = typeof instruction === 'string' && instruction.trim() ? instruction.trim().slice(0, 500) : ''

  const [user, business, lastInter] = await Promise.all([
    db.user.findUnique({ where: { id: session.user.id }, select: { firstName: true } }),
    db.userMlmBusiness.findFirst({ where: { id: c.mlmBusinessId }, select: { mlmName: true } }),
    db.interaction.findMany({ where: { contactId: id }, orderBy: { createdAt: 'desc' }, take: 3, select: { type: true, outcome: true } }),
  ])

  const prenom = c.firstName || c.name.split(' ')[0]
  const kindLabel = c.kind === 'CLIENT' ? 'client' : c.kind === 'PARTENAIRE' ? 'partenaire' : 'prospect'
  const histo = lastInter.length ? `Dernières interactions : ${lastInter.map(i => `${i.type.toLowerCase()}${i.outcome ? ` (${i.outcome.toLowerCase()})` : ''}`).join(', ')}.` : ''

  const query = `Tu es Atlas, coach en marketing de réseau. Rédige UN message prêt à envoyer, de la part de ${user?.firstName ?? 'moi'} (distributeur ${business?.mlmName ?? ''}), à ${prenom} (${kindLabel}).
${consigne ? `CONSIGNE PRIORITAIRE de l'utilisateur : ${consigne}`
    : c.kind === 'PARTENAIRE' ? (PARTNER_INTENT[c.partnerStage ?? 'DEMARRAGE'] ?? PARTNER_INTENT.DEMARRAGE)
    : c.kind === 'CLIENT' ? CLIENT_INTENT
    : (STAGE_INTENT[c.prospectStage ?? 'NOUVEAU'] ?? '')}
${c.personality ? (COLOR_TONE[c.personality] ?? '') : ''}
${CHANNEL_RULE[ch] ?? CHANNEL_RULE.SMS}
${c.note ? `Contexte sur ${prenom} : ${c.note}` : ''}
${histo}
Règles STRICTES : écris à la 1ère personne (c'est ${user?.firstName ?? 'moi'} qui écris), en français naturel, prêt à envoyer, AUCUN placeholder type [prénom] ou [nom], pas de signature inutile. Réponds UNIQUEMENT avec le message, rien d'autre.`

  let message = ''
  try {
    message = await readAtlas(query, session.user.id, business?.mlmName ?? '')
    // nettoyage : enlever d'éventuels guillemets englobants
    message = message.replace(/^["«»\s]+|["«»\s]+$/g, '')
  } catch (e) {
    console.error('[draft] AI error', e)
  }

  if (!message) return NextResponse.json({ error: 'Atlas indisponible' }, { status: 503 })
  // Nav messagerie : le dernier brouillon fait signe dans la liste des conversations
  // (« ✍️ Brouillon : … ») tant qu'aucun échange plus récent ne l'a dépassé.
  await db.contact.update({ where: { id }, data: { lastDraft: message, lastDraftAt: new Date() } }).catch(() => {})
  return NextResponse.json({ message })
}
