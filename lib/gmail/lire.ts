/**
 * LIRE LES RÉPONSES — et RIEN D'AUTRE.
 *
 * C'est le fichier le plus sensible du canal e-mail. On a écrit à Google, dans
 * la justification de gmail.readonly, que la lecture serait bornée aux seuls
 * fils qu'Atline a ouverts. Aucun scope n'impose cette limite : elle est
 * uniquement ici, dans ce code. C'est donc un engagement qu'on tient, pas une
 * contrainte qu'on subit, et il doit rester vrai le jour où un auditeur
 * regarde.
 *
 * ── COMMENT LA LIMITE EST RÉELLEMENT TENUE ─────────────────────────────────
 *
 * L'historique Gmail renvoie, pour chaque message arrivé, son identifiant ET
 * celui de son fil — sans son contenu. On filtre donc AVANT de demander quoi
 * que ce soit : un message qui n'appartient pas à l'un de nos fils ne fait
 * jamais l'objet d'un appel. Son sujet, son expéditeur et son texte ne
 * transitent jamais par nos serveurs. Ce n'est pas « on lit puis on jette »,
 * c'est « on ne demande pas ».
 *
 * Quand un fil nous concerne, en revanche, on le lit en entier. C'est notre
 * fil, et c'est le seul moyen de voir si le distributeur y a répondu lui-même
 * depuis son téléphone.
 *
 * ── CE QU'ON EN FAIT ───────────────────────────────────────────────────────
 *
 *   • le prospect a répondu   → on arrête la séquence de relance. Il existe à
 *                               nouveau, la machine se tait.
 *   • le distributeur a écrit → `humainRepris`, définitif. On n'écrit jamais
 *                               après un humain.
 *   • le Message-ID           → conservé, sinon notre réponse ouvrirait un fil
 *                               parallèle dans la boîte du prospect.
 *
 * Le curseur n'avance qu'après un traitement réussi : une notification perdue
 * se rattrape au coup suivant, puisque l'historique est cumulatif.
 */

import { db } from '@/lib/db'
import { connexionDe, jetonFrais, journaliser } from '@/lib/google/connexion'
import { arreterSequence } from '@/lib/gmail/sequence'

const API = 'https://gmail.googleapis.com/gmail/v1/users/me'
const MAX_FILS_PAR_PASSAGE = 20
const TAILLE_MAX_TEXTE = 4000

type Entete = { name?: string; value?: string }
type Partie = { mimeType?: string; body?: { data?: string; size?: number }; parts?: Partie[] }
type MessageGmail = {
  id: string
  threadId: string
  labelIds?: string[]
  internalDate?: string
  payload?: Partie & { headers?: Entete[] }
}

function entete(msg: MessageGmail, nom: string): string {
  const h = msg.payload?.headers?.find((x) => x.name?.toLowerCase() === nom.toLowerCase())
  return h?.value ?? ''
}

function decoder(data?: string): string {
  if (!data) return ''
  try {
    return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
  } catch {
    return ''
  }
}

/** Le texte du message. On préfère le texte brut ; à défaut on dégrossit le HTML. */
function texteDe(partie?: Partie): string {
  if (!partie) return ''
  if (partie.mimeType === 'text/plain') return decoder(partie.body?.data)
  if (partie.parts?.length) {
    for (const p of partie.parts) {
      const t = texteDe(p)
      if (t) return t
    }
  }
  if (partie.mimeType === 'text/html') {
    return decoder(partie.body?.data)
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
  }
  return decoder(partie.body?.data)
}

/**
 * Retire la citation du message précédent. Sans ça, chaque réponse traînerait
 * tout l'historique derrière elle et le cerveau relirait dix fois la même chose.
 */
function sansCitation(texte: string): string {
  const lignes = texte.split('\n')
  const coupe = lignes.findIndex(
    (l) =>
      /^\s*>/.test(l) ||
      /^Le .+ a écrit\s*:/.test(l) ||
      /^On .+ wrote\s*:/.test(l) ||
      /^-{2,}\s*Message d'origine/i.test(l) ||
      /^_{5,}/.test(l),
  )
  return (coupe > 0 ? lignes.slice(0, coupe) : lignes).join('\n').trim()
}

async function appeler(jeton: string, chemin: string) {
  const r = await fetch(`${API}${chemin}`, {
    headers: { Authorization: `Bearer ${jeton}` },
    signal: AbortSignal.timeout(20_000),
  })
  return { ok: r.ok, statut: r.status, corps: r.ok ? await r.json() : null }
}

export type Traitement = {
  ok: boolean
  filsTouches: number
  reponses: number
  reprisesHumaines: number
  raison?: string
}

/**
 * Traite ce qui a changé depuis notre dernier point de reprise.
 * `historyIdRecu` vient de la notification : il ne sert que de repli si on
 * n'a pas encore de curseur.
 */
export async function traiterChangements(userId: string, historyIdRecu?: string): Promise<Traitement> {
  const vide = { ok: false, filsTouches: 0, reponses: 0, reprisesHumaines: 0 }

  const conn = await connexionDe(userId)
  if (!conn?.email) return { ...vide, raison: 'aucun compte connecté' }

  const jeton = await jetonFrais(userId)
  if (!jeton) return { ...vide, raison: 'jeton indisponible' }

  const depuis = conn.historyId || historyIdRecu
  if (!depuis) {
    // Pas encore de point de reprise : on se cale sur la notification et on
    // attend la suivante. Rien à rattraper, on vient de commencer.
    if (historyIdRecu) {
      await db.googleConnection.update({ where: { userId }, data: { historyId: historyIdRecu } })
    }
    return { ok: true, filsTouches: 0, reponses: 0, reprisesHumaines: 0, raison: 'curseur initialisé' }
  }

  // ── 1. ce qui a changé, SANS contenu ──────────────────────────────────────
  const hist = await appeler(
    jeton,
    `/history?startHistoryId=${encodeURIComponent(depuis)}&historyTypes=messageAdded&labelId=INBOX`,
  )

  if (!hist.ok) {
    if (hist.statut === 404) {
      // Curseur trop ancien : Gmail a purgé cette tranche d'historique. On se
      // recale sur le présent plutôt que de rester bloqué à jamais.
      await db.googleConnection.update({
        where: { userId },
        data: { historyId: historyIdRecu ?? null },
      })
      await journaliser({
        userId,
        action: 'ERREUR',
        adresse: conn.email,
        detail: 'historique trop ancien, curseur recalé',
      })
      return { ...vide, raison: 'curseur recalé' }
    }
    return { ...vide, raison: `historique refusé (${hist.statut})` }
  }

  const corps = hist.corps as {
    history?: { messagesAdded?: { message?: { id?: string; threadId?: string } }[] }[]
    historyId?: string
  }

  // Les identifiants de fils concernés — toujours pas une ligne de contenu.
  const filsVus = new Set<string>()
  for (const h of corps.history ?? []) {
    for (const m of h.messagesAdded ?? []) {
      if (m.message?.threadId) filsVus.add(m.message.threadId)
    }
  }

  if (!filsVus.size) {
    if (corps.historyId) {
      await db.googleConnection.update({ where: { userId }, data: { historyId: corps.historyId } })
    }
    return { ok: true, filsTouches: 0, reponses: 0, reprisesHumaines: 0 }
  }

  // ── 2. LA LIMITE : on ne garde que NOS fils ───────────────────────────────
  // Tout ce qui est écarté ici ne fera jamais l'objet d'un appel. Le courrier
  // personnel du distributeur ne quitte pas sa boîte.
  const nôtres = await db.emailFil.findMany({
    where: { userId, gmailThreadId: { in: [...filsVus] } },
    take: MAX_FILS_PAR_PASSAGE,
  })

  if (!nôtres.length) {
    if (corps.historyId) {
      await db.googleConnection.update({ where: { userId }, data: { historyId: corps.historyId } })
    }
    return { ok: true, filsTouches: 0, reponses: 0, reprisesHumaines: 0 }
  }

  // ── 3. lecture des fils qui nous appartiennent ────────────────────────────
  let reponses = 0
  let reprisesHumaines = 0

  for (const fil of nôtres) {
    const t = await appeler(jeton, `/threads/${fil.gmailThreadId}?format=full`)
    if (!t.ok) continue

    const messages = ((t.corps as { messages?: MessageGmail[] })?.messages ?? []).filter(Boolean)
    if (!messages.length) continue

    const moi = conn.email.toLowerCase()
    const deMoi = messages.filter((m) => entete(m, 'From').toLowerCase().includes(moi))
    const duProspect = messages.filter((m) => !entete(m, 'From').toLowerCase().includes(moi))

    // Le distributeur a-t-il écrit lui-même ? Un message parti de son adresse
    // que notre journal ne connaît pas ne peut venir que de lui.
    let repris = fil.humainRepris
    if (!repris && deMoi.length) {
      const connus = await db.agentAction.findMany({
        where: { userId, canal: 'email', sourceId: { in: deMoi.map((m) => m.id) } },
        select: { sourceId: true },
      })
      const connusSet = new Set(connus.map((c) => c.sourceId))
      repris = deMoi.some((m) => !connusSet.has(m.id))
      if (repris) reprisesHumaines++
    }

    const dernier = duProspect[duProspect.length - 1]
    const nouveau = dernier && entete(dernier, 'Message-ID') !== fil.dernierMessageId

    if (nouveau) reponses++

    await db.emailFil.update({
      where: { id: fil.id },
      data: {
        humainRepris: repris,
        ...(nouveau
          ? {
              dernierMessageId: entete(dernier, 'Message-ID') || fil.dernierMessageId,
              dernierRecu: sansCitation(texteDe(dernier.payload)).slice(0, TAILLE_MAX_TEXTE) || null,
              dernierRecuAt: dernier.internalDate ? new Date(Number(dernier.internalDate)) : new Date(),
            }
          : {}),
      },
    })

    // Le prospect s'est manifesté : la séquence de relance n'a plus de raison
    // d'être. Le silence qu'elle traitait n'existe plus.
    if (nouveau) await arreterSequence(fil.id, 'le prospect a répondu')
    else if (repris) await arreterSequence(fil.id, 'le distributeur a repris la main')

    await journaliser({
      userId,
      action: 'LECTURE',
      adresse: conn.email,
      ressource: fil.gmailThreadId,
      detail: nouveau ? 'réponse du prospect' : repris ? 'reprise par le distributeur' : 'fil relu, rien de neuf',
    })
  }

  // ── 4. le curseur n'avance qu'ici, après un traitement réussi ─────────────
  if (corps.historyId) {
    await db.googleConnection.update({ where: { userId }, data: { historyId: corps.historyId } })
  }

  return { ok: true, filsTouches: nôtres.length, reponses, reprisesHumaines }
}
