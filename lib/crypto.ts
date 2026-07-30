/**
 * CHIFFRER LES SECRETS QU'ON GARDE POUR QUELQU'UN D'AUTRE.
 *
 * Un jeton d'accès Google en base, c'est la clé de la boîte mail d'un
 * distributeur. Un jeton Chatwoot, c'est sa messagerie. Ces valeurs ne nous
 * appartiennent pas : elles sont confiées. Une copie de la base qui traîne, un
 * dump de sauvegarde mal rangé, et ce sont les boîtes de tous nos utilisateurs
 * qui sont ouvertes en même temps.
 *
 * C'est aussi la première chose qu'un auditeur CASA regarde. Le chiffrement au
 * repos n'est pas une amélioration qu'on ajoutera plus tard : c'est la
 * condition pour demander le scope gmail.send.
 *
 * AES-256-GCM, donc chiffré ET authentifié : une valeur modifiée en base ne se
 * déchiffre pas silencieusement en n'importe quoi, elle lève. C'est ce qu'on
 * veut — mieux vaut une erreur bruyante qu'un jeton corrompu envoyé à Google.
 *
 * DEUX CHOIX ASSUMÉS, qui se lisent dans le code ci-dessous :
 *
 *   • ÉCRIRE SANS CLÉ EST IMPOSSIBLE. `chiffrer()` lève si ENCRYPTION_KEY
 *     manque. Un secret qui atterrit en clair parce qu'une variable
 *     d'environnement a été oubliée, c'est exactement le genre de panne
 *     silencieuse qu'on ne découvre qu'après la fuite.
 *
 *   • LIRE DU CLAIR RESTE POSSIBLE. `dechiffrer()` rend la valeur telle quelle
 *     si elle n'est pas chiffrée. Sans ça, le jour du déploiement, toutes les
 *     connexions Google et Chatwoot existantes cesseraient de fonctionner
 *     d'un coup. On lit l'ancien format, on réécrit au nouveau.
 *
 * Générer la clé (32 octets, une fois, puis dans .env.local du serveur) :
 *   openssl rand -hex 32
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto'

const ALGO = 'aes-256-gcm'
/** Marqueur de format. Le jour où l'algo change, `v2:` cohabitera avec `v1:`. */
const PREFIXE = 'v1'

function cle(): Buffer | null {
  const brut = process.env.ENCRYPTION_KEY
  if (!brut) return null
  // Le format attendu est 64 caractères hexadécimaux (openssl rand -hex 32).
  // On accepte aussi une phrase quelconque, dérivée en SHA-256 : mieux vaut
  // une clé imparfaite qu'un secret laissé en clair parce que le format
  // n'allait pas.
  if (/^[0-9a-f]{64}$/i.test(brut)) return Buffer.from(brut, 'hex')
  return createHash('sha256').update(brut, 'utf8').digest()
}

/** Une valeur est-elle déjà à notre format ? Sert à distinguer l'héritage en clair. */
export function estChiffre(valeur: unknown): valeur is string {
  return typeof valeur === 'string' && valeur.startsWith(`${PREFIXE}:`) && valeur.split(':').length === 4
}

/** La clé est-elle configurée ? À afficher au démarrage, pas à contourner. */
export function chiffrementDisponible(): boolean {
  return cle() !== null
}

/** Chiffre une valeur. Lève si la clé manque : on n'écrit JAMAIS un secret en clair. */
export function chiffrer(clair: string): string {
  const k = cle()
  if (!k) {
    throw new Error(
      'ENCRYPTION_KEY absente : refus d’enregistrer un secret en clair. ' +
        'Générer la clé avec « openssl rand -hex 32 » et la poser dans .env.local.',
    )
  }
  const iv = randomBytes(12)
  const chiffreur = createCipheriv(ALGO, k, iv)
  const corps = Buffer.concat([chiffreur.update(clair, 'utf8'), chiffreur.final()])
  const tag = chiffreur.getAuthTag()
  return [PREFIXE, iv.toString('base64'), tag.toString('base64'), corps.toString('base64')].join(':')
}

/**
 * Déchiffre une valeur. Une valeur qui n'est pas à notre format est rendue
 * telle quelle : c'est de l'héritage en clair, on sait le lire le temps de la
 * reprise. En revanche une valeur marquée `v1:` qu'on ne peut pas déchiffrer
 * lève — clé absente, clé changée, ou base altérée : trois cas où continuer
 * en silence serait pire que s'arrêter.
 */
export function dechiffrer(valeur: string): string {
  if (!estChiffre(valeur)) return valeur

  const k = cle()
  if (!k) throw new Error('ENCRYPTION_KEY absente : impossible de déchiffrer un secret enregistré.')

  const [, ivB64, tagB64, corpsB64] = valeur.split(':')
  const dechiffreur = createDecipheriv(ALGO, k, Buffer.from(ivB64, 'base64'))
  dechiffreur.setAuthTag(Buffer.from(tagB64, 'base64'))
  return Buffer.concat([dechiffreur.update(Buffer.from(corpsB64, 'base64')), dechiffreur.final()]).toString('utf8')
}

/** Variantes tolérantes au null, pour les colonnes optionnelles (refreshToken…). */
export function chiffrerOptionnel(clair: string | null | undefined): string | null {
  return clair ? chiffrer(clair) : null
}

export function dechiffrerOptionnel(valeur: string | null | undefined): string | null {
  return valeur ? dechiffrer(valeur) : null
}
