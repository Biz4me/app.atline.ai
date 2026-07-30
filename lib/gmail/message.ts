/**
 * FABRIQUER UN E-MAIL QUI ARRIVE LISIBLE.
 *
 * Un e-mail est de l'ASCII par défaut. « Ça t'intéresse ? » envoyé tel quel
 * arrive en « Ãa t'intÃ©resse ? » chez le prospect. On a déjà perdu des
 * apostrophes et des accents une fois, sur de vrais destinataires : le sujet
 * mérite son propre fichier, pur et testable.
 *
 *   • En-têtes (sujet, nom affiché) : RFC 2047, `=?UTF-8?B?…?=`
 *   • Corps : base64 d'UTF-8, avec le charset déclaré
 *
 * `In-Reply-To` / `References` ne sont pas décoratifs : sans eux, notre
 * réponse ouvre un nouveau fil dans la boîte du prospect au lieu de se glisser
 * sous son message. Deux fils parallèles sur le même sujet, et la conversation
 * devient illisible pour lui comme pour nous.
 */

/** Un en-tête non-ASCII doit être encodé, sinon il arrive en charabia. */
export function encoderEntete(valeur: string): string {
  // eslint-disable-next-line no-control-regex
  if (/^[\x00-\x7F]*$/.test(valeur)) return valeur
  return `=?UTF-8?B?${Buffer.from(valeur, 'utf8').toString('base64')}?=`
}

export function construireMessage(m: {
  nomAffiche: string
  adresseEnvoi: string
  destinataire: string
  sujet: string
  corps: string
  repondA?: string | null
}): string {
  const lignes = [
    `From: ${encoderEntete(`"${m.nomAffiche}"`)} <${m.adresseEnvoi}>`,
    `To: ${m.destinataire}`,
    `Subject: ${encoderEntete(m.sujet)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
  ]
  if (m.repondA) lignes.push(`In-Reply-To: ${m.repondA}`, `References: ${m.repondA}`)

  // Base64 découpé à 76 caractères : au-delà, certains serveurs coupent la
  // ligne eux-mêmes, au mauvais endroit, et le message arrive tronqué.
  const corps = Buffer.from(m.corps, 'utf8').toString('base64').replace(/(.{76})/g, '$1\r\n')
  return `${lignes.join('\r\n')}\r\n\r\n${corps}`
}

/** Base64 « URL-safe » : ce que l'API Gmail attend dans `raw`. */
export function base64url(s: string): string {
  return Buffer.from(s, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}
