/**
 * ORION ÉCRIT — avec le cerveau qui existe déjà, pas un second.
 *
 * Le moteur de prospection tourne dans le service FastAPI et sert déjà
 * Chatwoot. On lui parle exactement de la même façon, avec les mêmes
 * paramètres et les mêmes marqueurs de sortie. Un auditeur, comme un
 * développeur qui reprendra ce code, doit voir UN mécanisme, pas deux
 * implémentations qui divergeront au premier correctif.
 *
 * ── LES MARQUEURS ──────────────────────────────────────────────────────────
 *
 * Le modèle signale lui-même qu'une conversation a abouti. Ces marqueurs ne
 * partent JAMAIS au prospect : ils sont retirés du texte, et ils ferment le
 * fil côté Atline. `[[REFUS]]` est ajouté ici, il manquait à la liste de
 * Chatwoot alors que c'est une issue aussi nette que les autres — quelqu'un
 * qui dit non a répondu, et on doit cesser de lui écrire.
 *
 * ── UNE LIMITE ASSUMÉE ─────────────────────────────────────────────────────
 *
 * Le service attend un message de prospect à répondre. Pour un premier
 * message ou une relance, il n'y en a pas : on lui passe donc une consigne
 * décrivant la situation. Ça fonctionne parce que le modèle reste tourné vers
 * le prospect dans les deux cas, mais un prompt dédié ferait mieux. À revoir
 * quand on aura vu ce que ça donne sur de vrais échanges.
 */

import { db } from '@/lib/db'
import { historiqueDuFil } from '@/lib/gmail/lire'

const URL_SERVICE = process.env.ATLAS_URL || 'http://127.0.0.1:8100'

/** `[[REFUS]]` complète la liste de Chatwoot : un non est une issue. */
const MARQUEURS = /\[\[(RDV|INSCRIPTION|ACHAT|REFUS|HANDOFF)\]\]/g

export type Issue = 'RDV' | 'INSCRIPTION' | 'ACHAT' | 'REFUS' | 'HANDOFF'

export type Redaction = {
  texte: string
  issue: Issue | null
  marqueurs: string[]
}

function extraire(brut: string): Redaction {
  const marqueurs = brut.match(MARQUEURS) ?? []
  const texte = brut.replace(MARQUEURS, '').replace(/\n{3,}/g, '\n\n').trim()

  // Une conversation n'a qu'une issue. Si le modèle en signale plusieurs, on
  // retient la plus engageante : un achat prime sur un rendez-vous.
  const ordre: Issue[] = ['ACHAT', 'INSCRIPTION', 'RDV', 'REFUS', 'HANDOFF']
  const trouvees = marqueurs.map((m) => m.replace(/[[\]]/g, '') as Issue)
  const issue = ordre.find((i) => trouvees.includes(i)) ?? null

  return { texte, issue, marqueurs }
}

async function contexte(userId: string) {
  const activite = await db.userMlmBusiness.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: { mlmName: true, user: { select: { firstName: true, username: true } } },
  })
  return {
    societe: activite?.mlmName ?? '',
    distributeur_prenom: activite?.user?.firstName ?? '',
    parrainage_url: activite?.user?.username ? `https://app.atline.ai/r/${activite.user.username}` : '',
  }
}

async function demander(args: {
  userId: string
  query: string
  historique?: { role: string; content: string }[]
}): Promise<Redaction | null> {
  try {
    const r = await fetch(`${URL_SERVICE}/api/prospect/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(await contexte(args.userId)),
        query: args.query,
        conversation_history: args.historique ?? [],
        axe: 'recrue',
      }),
      signal: AbortSignal.timeout(60_000),
    })
    if (!r.ok) {
      console.error('[orion/email] service IA', r.status)
      return null
    }
    const brut = (await r.text()).trim()
    if (!brut) return null
    const red = extraire(brut)
    return red.texte ? red : null
  } catch (e) {
    console.error('[orion/email] service injoignable', e)
    return null
  }
}

/** La réponse à ce que le prospect vient d'écrire. */
export async function redigerReponse(filId: string): Promise<Redaction | null> {
  const fil = await db.emailFil.findUnique({ where: { id: filId } })
  if (!fil?.dernierRecu) return null

  const historique = fil.gmailThreadId ? await historiqueDuFil(fil.userId, fil.gmailThreadId) : []
  return demander({
    userId: fil.userId,
    query: fil.dernierRecu,
    // Le dernier message est passé en `query`, il n'a pas à figurer deux fois.
    historique: historique.slice(0, -1),
  })
}

/**
 * Le premier message d'une conversation. Rendu au distributeur pour qu'il le
 * relise : on n'écrit pas à quelqu'un qu'il connaît sans son accord.
 */
export async function redigerPremier(userId: string, contactId: string): Promise<Redaction | null> {
  const contact = await db.contact.findFirst({
    where: { id: contactId, userId },
    select: { name: true, firstName: true, market: true, note: true, prospectStage: true },
  })
  if (!contact) return null

  const qui = contact.firstName || contact.name || 'ce contact'
  const details = [
    contact.market ? `marché : ${contact.market}` : '',
    contact.prospectStage ? `étape : ${contact.prospectStage}` : '',
    contact.note ? `notes : ${contact.note.slice(0, 300)}` : '',
  ]
    .filter(Boolean)
    .join(' · ')

  return demander({
    userId,
    query:
      `Écris un PREMIER e-mail court à ${qui}${details ? ` (${details})` : ''}. ` +
      `Ton naturel, pas commercial, une seule question à la fin pour ouvrir la conversation. ` +
      `Pas d'objet, seulement le corps du message.`,
  })
}

/**
 * Le brouillon d'une relance. Sans lui, une relance arrivant à échéance
 * n'aurait aucun texte et le distributeur n'aurait rien à valider.
 */
export async function redigerRelance(filId: string, etape: number): Promise<Redaction | null> {
  const fil = await db.emailFil.findUnique({ where: { id: filId } })
  if (!fil) return null

  const jours = fil.dernierEnvoiAt
    ? Math.max(1, Math.round((Date.now() - fil.dernierEnvoiAt.getTime()) / 86_400_000))
    : 1
  const historique = fil.gmailThreadId ? await historiqueDuFil(fil.userId, fil.gmailThreadId) : []

  return demander({
    userId: fil.userId,
    query:
      `Relance n°${etape}. Le prospect n'a pas répondu depuis ${jours} jour(s). ` +
      `Écris un message TRÈS court, sans reproche ni culpabilisation, qui apporte un angle ` +
      `nouveau plutôt que de répéter le message précédent. Pas d'objet, seulement le corps.`,
    historique,
  })
}

/**
 * Pose l'issue sur le fil et arrête tout ce qui restait programmé.
 * Séparé de la rédaction : c'est une décision sur la conversation, pas du texte.
 */
export async function poserIssue(filId: string, issue: Issue): Promise<void> {
  const { arreterSequence } = await import('@/lib/gmail/sequence')
  await db.emailFil.update({ where: { id: filId }, data: { issue } })
  await arreterSequence(filId, `issue atteinte (${issue})`)
}
