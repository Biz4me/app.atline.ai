/**
 * LA CONNEXION GOOGLE D'UN DISTRIBUTEUR — un seul endroit, pour tous les usages.
 *
 * Agenda hier, Gmail demain : c'est le même compte Google, le même client
 * OAuth, le même jeton de rafraîchissement. Tout ce qui touche à cet accès
 * passe par ici, pour trois raisons qui sont toutes des raisons de sécurité :
 *
 *   • UN SEUL CHEMIN D'ÉCRITURE. Les jetons sont chiffrés (lib/crypto.ts).
 *     S'il existe deux endroits qui écrivent, un des deux finira par oublier.
 *
 *   • UNE SEULE ADRESSE D'ENVOI. `email` est celle que Google a confirmée, et
 *     c'est elle que le prospect verra. On ne la déduit jamais de User.email :
 *     s'inscrire avec son adresse perso et écrire depuis son adresse pro est
 *     un cas normal, pas une anomalie à corriger.
 *
 *   • UNE SEULE TRACE. Chaque accès est journalisé au même format. C'est la
 *     pièce que réclame l'audit CASA, et la réponse au distributeur qui
 *     demande ce qui est parti en son nom.
 */

import { db } from '@/lib/db'
import { chiffrer, chiffrerOptionnel, dechiffrer } from '@/lib/crypto'

type Action = 'CONNEXION' | 'REVOCATION' | 'ENVOI' | 'LECTURE' | 'SURVEILLANCE' | 'ERREUR'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke'

/**
 * Écrit une ligne de journal. NE LÈVE JAMAIS : un envoi réussi ne doit pas
 * échouer après coup parce que sa trace n'a pas pu s'écrire.
 *
 * Le revers est assumé et il faut le savoir : en cas de panne d'écriture, on
 * perd la trace sans perdre l'action. D'où le console.error bruyant — c'est
 * ce qui doit déclencher une alerte, parce qu'un journal muet transforme
 * « on trace tout » en affirmation invérifiable.
 *
 * Ce qu'on n'y met jamais : le contenu d'un message. Des identifiants
 * techniques, une adresse, une action. Rien de ce que le prospect a écrit.
 */
export async function journaliser(entree: {
  userId: string
  action: Action
  adresse?: string | null
  ressource?: string | null
  detail?: string | null
}): Promise<void> {
  try {
    await db.googleAcces.create({
      data: {
        userId: entree.userId,
        action: entree.action,
        adresse: entree.adresse ?? null,
        ressource: entree.ressource?.slice(0, 200) ?? null,
        detail: entree.detail?.slice(0, 500) ?? null,
      },
    })
  } catch (e) {
    console.error('[google] JOURNAL NON ÉCRIT', entree.action, entree.userId, e)
  }
}

/** La connexion active, ou null si absente ou révoquée. */
export async function connexionDe(userId: string) {
  const conn = await db.googleConnection.findUnique({ where: { userId } })
  if (!conn || conn.revokedAt) return null
  return conn
}

/** L'adresse depuis laquelle ce distributeur écrit. C'est elle que le prospect verra. */
export async function adresseDEnvoi(userId: string): Promise<string | null> {
  return (await connexionDe(userId))?.email ?? null
}

/** Les permissions réellement accordées — à interroger avant d'appeler une API. */
export async function scopesAccordes(userId: string): Promise<string[]> {
  const conn = await connexionDe(userId)
  return conn?.scope ? conn.scope.split(' ').filter(Boolean) : []
}

export async function aLeScope(userId: string, scope: string): Promise<boolean> {
  return (await scopesAccordes(userId)).includes(scope)
}

/**
 * Enregistre (ou met à jour) la connexion après un aller-retour OAuth.
 *
 * `email` doit venir de ce que Google a répondu. Le paramètre est obligatoire
 * et peut être null, pour qu'aucun appelant ne puisse « oublier » de le
 * transmettre et laisser l'app inventer une adresse.
 *
 * Google ne renvoie un refresh_token qu'à la première autorisation : on ne
 * l'écrase donc jamais avec un vide, sinon la connexion meurt au premier
 * renouvellement.
 */
export async function enregistrerConnexion(args: {
  userId: string
  email: string | null
  accessToken: string
  refreshToken?: string | null
  expiresIn: number
  scope?: string | null
}) {
  const expiresAt = new Date(Date.now() + args.expiresIn * 1000)
  const chiffreAcces = chiffrer(args.accessToken)
  const chiffreRefresh = chiffrerOptionnel(args.refreshToken)

  const conn = await db.googleConnection.upsert({
    where: { userId: args.userId },
    create: {
      userId: args.userId,
      email: args.email,
      accessToken: chiffreAcces,
      refreshToken: chiffreRefresh,
      expiresAt,
      scope: args.scope ?? null,
    },
    update: {
      email: args.email,
      accessToken: chiffreAcces,
      ...(chiffreRefresh ? { refreshToken: chiffreRefresh } : {}),
      expiresAt,
      scope: args.scope ?? null,
      // Une reconnexion annule une révocation précédente.
      revokedAt: null,
    },
  })

  await journaliser({
    userId: args.userId,
    action: 'CONNEXION',
    adresse: args.email,
    detail: args.scope ?? undefined,
  })
  return conn
}

async function rafraichir(refreshToken: string) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) throw new Error('refresh failed')
  return res.json() as Promise<{ access_token: string; expires_in: number }>
}

/**
 * Un jeton d'accès utilisable, renouvelé si besoin. null si non connecté,
 * révoqué, ou si le renouvellement échoue (accès retiré côté Google, par
 * exemple : ça arrive et ce n'est pas une erreur de notre côté).
 */
export async function jetonFrais(userId: string): Promise<string | null> {
  const conn = await connexionDe(userId)
  if (!conn) return null

  // Une minute de marge : un jeton qui expire pendant l'appel est un jeton mort.
  if (conn.expiresAt.getTime() > Date.now() + 60_000) {
    try {
      return dechiffrer(conn.accessToken)
    } catch (e) {
      // Clé absente ou changée : inutile d'insister, mais il faut le savoir.
      console.error('[google] jeton illisible pour', userId, e)
      return null
    }
  }

  if (!conn.refreshToken) return null
  try {
    const r = await rafraichir(dechiffrer(conn.refreshToken))
    await db.googleConnection.update({
      where: { userId },
      data: {
        accessToken: chiffrer(r.access_token),
        expiresAt: new Date(Date.now() + r.expires_in * 1000),
      },
    })
    return r.access_token
  } catch (e) {
    await journaliser({
      userId,
      action: 'ERREUR',
      adresse: conn.email,
      detail: `renouvellement du jeton impossible : ${e instanceof Error ? e.message : 'inconnu'}`,
    })
    return null
  }
}

/**
 * Coupe l'accès. On prévient Google AVANT d'effacer localement : effacer
 * d'abord, ce serait perdre le seul jeton qui permet de révoquer, et laisser
 * une autorisation vivante dans le compte Google du distributeur alors que
 * l'app affiche « déconnecté ».
 *
 * On garde la ligne (revokedAt) plutôt que de la supprimer : « cet accès a
 * existé puis a été retiré le 30 juillet » est une information, « il n'y a
 * jamais rien eu » en est une autre.
 */
export async function revoquer(userId: string): Promise<boolean> {
  const conn = await db.googleConnection.findUnique({ where: { userId } })
  if (!conn) return true

  let previenu = false
  try {
    const jeton = dechiffrer(conn.refreshToken || conn.accessToken)
    const res = await fetch(`${REVOKE_URL}?token=${encodeURIComponent(jeton)}`, { method: 'POST' })
    previenu = res.ok
  } catch {
    // Jeton déjà mort ou illisible : on nettoie quand même de notre côté.
  }

  await db.googleConnection.update({
    where: { userId },
    data: {
      revokedAt: new Date(),
      // Les secrets partent tout de suite : une connexion révoquée n'a aucune
      // raison de conserver de quoi rouvrir la porte.
      accessToken: chiffrer('revoque'),
      refreshToken: null,
    },
  })

  await journaliser({
    userId,
    action: 'REVOCATION',
    adresse: conn.email,
    detail: previenu ? 'révocation confirmée par Google' : 'révoqué localement (Google injoignable ou jeton déjà mort)',
  })
  return previenu
}
