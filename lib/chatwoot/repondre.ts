/**
 * LE PONT — un prospect écrit, Orion répond.
 *
 * C'est la pièce qui transforme Chatwoot d'entrepôt en canal vivant :
 *
 *   le prospect écrit  →  Chatwoot prévient l'app  →  on relit le fil
 *   →  Orion génère  →  la réponse repart dans Chatwoot  →  le prospect la lit
 *
 * On ne réécrit pas le cerveau : `/api/prospect/chat` existe depuis la doctrine
 * de prospection du 26 juillet, avec ses trois axes (recrue · produit · Atline)
 * et ses marqueurs de sortie. On lui donne le fil, il rend la réponse.
 *
 * Ce qui protège le distributeur, et qui compte plus que la mécanique :
 *
 *   • ORION PROPOSE, LE DISTRIBUTEUR VALIDE — par défaut. L'envoi direct
 *     s'active à la main, quand il a vu Orion travailler et qu'il a confiance.
 *     Sa réputation est en jeu à chaque message : c'est la sienne, pas la nôtre.
 *
 *   • UN SEUL PASSAGE PAR ÉVÉNEMENT. `traiteAt` est posé quoi qu'il arrive,
 *     succès ou échec. Un prospect qui reçoit deux réponses, c'est pire que
 *     pas de réponse du tout.
 *
 *   • ON N'ÉCRIT JAMAIS APRÈS UN HUMAIN. Si le distributeur a répondu
 *     lui-même depuis, Orion se tait — il ne parle pas par-dessus son patron.
 */

import { db } from '@/lib/db'
import { journaliser } from '@/lib/agents/journal'
import { dechiffrer } from '@/lib/crypto'

const URL_CHATWOOT = process.env.CHATWOOT_URL || 'http://127.0.0.1:3070'
const URL_SERVICE = process.env.ATLAS_URL || 'http://127.0.0.1:8100'

type MessageChatwoot = {
  id: number
  content: string | null
  message_type: number | string
  created_at?: number
  sender?: { type?: string; name?: string }
}

async function chatwoot(chemin: string, jeton: string, corps?: unknown, methode = 'GET') {
  const r = await fetch(`${URL_CHATWOOT}${chemin}`, {
    method: methode,
    headers: { 'Content-Type': 'application/json', api_access_token: jeton },
    body: corps ? JSON.stringify(corps) : undefined,
    signal: AbortSignal.timeout(20000),
  })
  if (!r.ok) throw new Error(`Chatwoot ${methode} ${chemin} → ${r.status}`)
  return r.json().catch(() => null)
}

const estEntrant = (m: MessageChatwoot) => m.message_type === 0 || m.message_type === 'incoming'

/** Traite UN événement. Retourne ce qui a été fait, pour la trace. */
export async function traiterEvenement(evenementId: string): Promise<{ ok: boolean; action: string }> {
  const ev = await db.chatwootEvenement.findUnique({
    where: { id: evenementId },
    select: {
      id: true, userId: true, accountId: true, conversationId: true,
      contactId: true, contenu: true, traiteAt: true,
    },
  })
  if (!ev) return { ok: false, action: 'événement introuvable' }
  if (ev.traiteAt) return { ok: true, action: 'déjà traité' }

  // Règle : un seul passage. On pose la marque AVANT de travailler — si le
  // traitement plante en cours de route, on ne repassera pas écrire une
  // seconde fois au prospect.
  await db.chatwootEvenement.update({ where: { id: ev.id }, data: { traiteAt: new Date() } })

  try {
    const activite = await db.userMlmBusiness.findFirst({
      where: { chatwootAccountId: ev.accountId },
      select: {
        id: true, userId: true, mlmName: true, chatwootUserToken: true,
        chatwootAutoRepondre: true,
        user: { select: { firstName: true, username: true } },
      },
    })
    if (!activite?.chatwootUserToken) {
      await db.chatwootEvenement.update({ where: { id: ev.id }, data: { erreur: 'jeton de service absent' } })
      return { ok: false, action: 'jeton absent' }
    }

    // Déchiffré une seule fois, gardé en mémoire le temps du traitement.
    // (dechiffrer rend tel quel un jeton d'avant le chiffrement : rien ne casse
    // au déploiement.)
    const jeton = dechiffrer(activite.chatwootUserToken)

    // ── on relit le fil, pas seulement le dernier message ────────────────
    const brut = await chatwoot(
      `/api/v1/accounts/${ev.accountId}/conversations/${ev.conversationId}/messages`,
      jeton,
    )
    const messages: MessageChatwoot[] = Array.isArray(brut) ? brut : (brut?.payload ?? [])
    if (!messages.length) return { ok: false, action: 'fil vide' }

    // Règle : on n'écrit jamais après un humain. Si le dernier mot n'est pas
    // celui du prospect, c'est que quelqu'un a repris la main.
    const dernier = messages[messages.length - 1]
    if (!estEntrant(dernier)) {
      return { ok: true, action: 'le distributeur a repris la main' }
    }

    const historique = messages.slice(-12).map((m) => ({
      role: estEntrant(m) ? 'user' : 'assistant',
      content: m.content ?? '',
    })).filter((m) => m.content)

    // ── le cerveau : celui de la prospection, pas un nouveau ─────────────
    const reponseService = await fetch(`${URL_SERVICE}/api/prospect/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: ev.contenu ?? dernier.content ?? '',
        societe: activite.mlmName,
        distributeur_prenom: activite.user.firstName ?? '',
        parrainage_url: activite.user.username ? `https://app.atline.ai/r/${activite.user.username}` : '',
        conversation_history: historique.slice(0, -1),
        axe: 'recrue',
      }),
      signal: AbortSignal.timeout(60000),
    })
    if (!reponseService.ok) throw new Error(`service IA → ${reponseService.status}`)
    const texte = (await reponseService.text()).trim()
    if (!texte) return { ok: false, action: 'réponse vide' }

    // Les marqueurs de sortie de la doctrine : ils signalent au distributeur
    // qu'il doit prendre le relais, ils ne partent jamais au prospect.
    const marqueurs = texte.match(/\[\[(RDV|INSCRIPTION|ACHAT|HANDOFF)\]\]/g) ?? []
    const propre = texte.replace(/\[\[(RDV|INSCRIPTION|ACHAT|HANDOFF)\]\]/g, '').trim()

    // ── envoi direct, ou proposition à valider ───────────────────────────
    if (activite.chatwootAutoRepondre) {
      await chatwoot(
        `/api/v1/accounts/${ev.accountId}/conversations/${ev.conversationId}/messages`,
        jeton,
        { content: propre, message_type: 'outgoing' },
        'POST',
      )
      await journaliser({
        userId: activite.userId, agent: 'ORION', type: 'MESSAGE',
        contactId: ev.contactId, canal: 'chatwoot',
        sourceId: String(ev.conversationId), contenu: propre,
        contexte: { auto: true, marqueurs, heure: new Date().getHours() },
      })
      return { ok: true, action: marqueurs.length ? `envoyé + ${marqueurs.join(' ')}` : 'envoyé' }
    }

    // Sinon : une note PRIVÉE dans Chatwoot (le prospect ne la voit pas) et
    // une notification au distributeur. Rien ne part sans lui.
    await chatwoot(
      `/api/v1/accounts/${ev.accountId}/conversations/${ev.conversationId}/messages`,
      jeton,
      { content: `Proposition d'Orion :\n\n${propre}`, message_type: 'outgoing', private: true },
      'POST',
    )
    await db.notification.create({
      data: {
        userId: activite.userId,
        icon: 'atlas',
        color: '#3B82F6',
        text: `Orion a préparé une réponse${marqueurs.length ? ' — et ce contact est mûr' : ''}. À valider.`,
        go: '/chats',
      },
    }).catch(() => {})

    return { ok: true, action: 'proposition en attente de validation' }
  } catch (e) {
    const raison = e instanceof Error ? e.message : 'erreur inconnue'
    await db.chatwootEvenement.update({ where: { id: evenementId }, data: { erreur: raison.slice(0, 300) } }).catch(() => {})
    console.error('[chatwoot/repondre]', raison)
    return { ok: false, action: raison }
  }
}

/** Le rattrapage : ce qui n'a pas été traité à la volée. Appelé par cron. */
export async function traiterEnAttente(limite = 50) {
  const restants = await db.chatwootEvenement.findMany({
    where: { traiteAt: null },
    orderBy: { createdAt: 'asc' },
    take: limite,
    select: { id: true },
  })
  const faits = []
  for (const r of restants) faits.push(await traiterEvenement(r.id))
  return { examines: restants.length, detail: faits }
}
