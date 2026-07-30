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
import { prochainsCreneaux, lienDeReservation } from '@/lib/availability'

const URL_SERVICE = process.env.ATLAS_URL || 'http://127.0.0.1:8100'

/** `[[REFUS]]` complète la liste de Chatwoot : un non est une issue. */
const MARQUEURS = /\[\[(RDV|INSCRIPTION|ACHAT|REFUS|HANDOFF)\]\]/g

export type Issue = 'RDV' | 'INSCRIPTION' | 'ACHAT' | 'REFUS' | 'HANDOFF' | 'INJOIGNABLE'

export type Redaction = {
  texte: string
  issue: Issue | null
  marqueurs: string[]
}

/**
 * Décoder ce que renvoie le service.
 *
 * ⚠️ Corrigé le 30 juillet 2026, après qu'un vrai destinataire a reçu un bloc
 * JSON en guise de message. Le service ne répond PAS en texte : il renvoie
 * `{"text": "...", "rdv": false, "inscription": false, "achat": false}`, et
 * les issues sont donc des booléens, pas les marqueurs `[[RDV]]` que
 * j'attendais — mon extraction ne pouvait jamais se déclencher.
 *
 * On lit les deux formes : le JSON d'abord, le texte nu ensuite. Le jour où le
 * service changera de contrat, on ne renverra plus sa structure interne à un
 * prospect.
 */
function extraire(brut: string): Redaction {
  let corps = brut
  const trouvees: Issue[] = []

  try {
    const j = JSON.parse(brut) as {
      text?: string
      rdv?: boolean
      inscription?: boolean
      achat?: boolean
      refus?: boolean
      handoff?: boolean
    }
    if (j && typeof j.text === 'string') {
      corps = j.text
      if (j.achat) trouvees.push('ACHAT')
      if (j.inscription) trouvees.push('INSCRIPTION')
      if (j.rdv) trouvees.push('RDV')
      if (j.refus) trouvees.push('REFUS')
      if (j.handoff) trouvees.push('HANDOFF')
    }
  } catch {
    // Réponse en texte nu : c'est l'autre forme possible, elle reste valide.
  }

  // Les marqueurs textuels restent lus au cas où : ils ne doivent en aucun cas
  // partir chez le prospect.
  const marqueurs = corps.match(MARQUEURS) ?? []
  for (const m of marqueurs) {
    const i = m.replace(/[[\]]/g, '') as Issue
    if (!trouvees.includes(i)) trouvees.push(i)
  }
  const texte = corps.replace(MARQUEURS, '').replace(/\n{3,}/g, '\n\n').trim()

  // Une conversation n'a qu'une issue. Si plusieurs sont signalées, on retient
  // la plus engageante : un achat prime sur un rendez-vous.
  const ordre: Issue[] = ['ACHAT', 'INSCRIPTION', 'RDV', 'REFUS', 'HANDOFF']
  const issue = ordre.find((i) => trouvees.includes(i)) ?? null

  return { texte, issue, marqueurs: trouvees }
}

/**
 * Garde-fou de dernier recours : on n'envoie JAMAIS quelque chose qui
 * ressemble à une structure de données. Si le contrat du service change encore,
 * la conversation s'arrête au lieu d'écrire n'importe quoi à un prospect.
 */
function ressembleADuJson(texte: string): boolean {
  const t = texte.trim()
  return (t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))
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
    if (!red.texte) return null

    // Si ça ressemble encore à une structure de données, on refuse d'envoyer.
    // Une conversation qui s'arrête est réparable ; un prospect qui reçoit du
    // JSON ne l'est pas.
    if (ressembleADuJson(red.texte)) {
      console.error('[orion/email] réponse non exploitable, envoi refusé :', red.texte.slice(0, 120))
      return null
    }
    return red
  } catch (e) {
    console.error('[orion/email] service injoignable', e)
    return null
  }
}

/**
 * La réponse à ce que le prospect vient d'écrire.
 *
 * Les vraies disponibilités du distributeur sont injectées à CHAQUE réponse,
 * pas seulement au moment où un rendez-vous se dessine : c'est ce qui permet à
 * Orion de proposer une heure au bon moment, sans qu'on ait à deviner d'avance
 * quand la conversation va basculer.
 *
 * Et surtout, ce sont des heures VÉRIFIÉES. Sans agenda connecté, la liste est
 * vide et rien n'est proposé : donner rendez-vous à un prospect pendant que le
 * distributeur est déjà pris coûte plus cher que de ne rien proposer du tout.
 */
export async function redigerReponse(filId: string): Promise<Redaction | null> {
  const fil = await db.emailFil.findUnique({ where: { id: filId } })
  if (!fil?.dernierRecu) return null

  const [historique, creneaux, lien] = await Promise.all([
    fil.gmailThreadId ? historiqueDuFil(fil.userId, fil.gmailThreadId) : Promise.resolve([]),
    prochainsCreneaux(fil.userId, 3),
    lienDeReservation(fil.userId),
  ])

  const dispos =
    creneaux.length && lien
      ? `\n\n[Contexte pour toi, pas à recopier tel quel : créneaux RÉELLEMENT libres — ` +
        `${creneaux.map((c) => c.libelle).join(' ; ')}. Lien de réservation : ${lien}. ` +
        `Ne propose que ces horaires-là, jamais d'autres, et seulement si la conversation s'y prête.]`
      : ''

  const redaction = await demander({
    userId: fil.userId,
    query: `${fil.dernierRecu}${dispos}`,
    // Le dernier message est passé en `query`, il n'a pas à figurer deux fois.
    historique: historique.slice(0, -1),
  })

  // Un rendez-vous demandé : on ajoute le lien de réservation quoi qu'il
  // arrive. Si la formulation d'Orion est approximative sur les horaires, le
  // prospect garde un moyen fiable de se caler lui-même, sur des créneaux
  // recalculés au moment où il clique.
  if (redaction && redaction.issue === 'RDV' && lien && !redaction.texte.includes(lien)) {
    redaction.texte = `${redaction.texte}\n\nTu peux aussi choisir directement ton créneau ici : ${lien}`
  }

  return redaction
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

/** Ce que le distributeur doit lire, pas ce que la base enregistre. */
const ANNONCE: Record<Issue, { texte: (qui: string) => string; couleur: string }> = {
  RDV: { texte: (q) => `${q} veut un rendez-vous. À toi de jouer.`, couleur: '#22C55E' },
  INSCRIPTION: { texte: (q) => `${q} veut s'inscrire. Accompagne-la maintenant.`, couleur: '#22C55E' },
  ACHAT: { texte: (q) => `${q} veut acheter. Envoie-lui ton lien boutique.`, couleur: '#22C55E' },
  REFUS: { texte: (q) => `${q} a dit non. Orion s'arrête là.`, couleur: '#EF4444' },
  HANDOFF: { texte: (q) => `${q} attend une réponse humaine. Orion passe la main.`, couleur: '#F4B342' },
  // Personne n'a rien décidé : l'adresse n'existe pas. On le dit comme tel,
  // et on invite à la corriger plutôt qu'à conclure au désintérêt.
  INJOIGNABLE: { texte: (q) => `L'adresse de ${q} n'existe pas. Corrige-la, sinon rien ne partira.`, couleur: '#EF4444' },
}

/**
 * Pose l'issue sur le fil, arrête tout ce qui restait programmé, ET PRÉVIENT
 * LE DISTRIBUTEUR.
 *
 * ⚠️ Cette notification n'est pas un confort. Orion écrit au prospect « je
 * transmets ça tout de suite » : sans elle, le produit fait une promesse qu'il
 * ne tient pas, une personne attend d'être rappelée, et personne ne le sait.
 * Constaté en vrai le 30 juillet 2026 sur une conversation qui a abouti à un
 * rendez-vous que rien ne signalait.
 */
export async function poserIssue(filId: string, issue: Issue): Promise<void> {
  const { arreterSequence } = await import('@/lib/gmail/sequence')

  const fil = await db.emailFil.update({ where: { id: filId }, data: { issue } })
  await arreterSequence(filId, `issue atteinte (${issue})`)

  const contact = fil.contactId
    ? await db.contact.findUnique({ where: { id: fil.contactId }, select: { name: true, firstName: true } })
    : null
  const qui = contact?.firstName || contact?.name || fil.destinataire

  const a = ANNONCE[issue]
  await db.notification
    .create({
      data: {
        userId: fil.userId,
        icon: 'atlas',
        color: a.couleur,
        text: a.texte(qui),
        go: fil.contactId ? `/chats/${fil.contactId}` : '/chats',
      },
    })
    .catch((e) => console.error('[orion/email] notification non créée', e))
}
