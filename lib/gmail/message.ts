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

/**
 * Retire la citation du message précédent.
 *
 * Sans ça, chaque réponse traîne tout l'historique derrière elle : le cerveau
 * relit dix fois la même chose, et finit par répondre à nos propres phrases
 * comme si le prospect les avait écrites.
 *
 * ⚠️ Le piège, constaté sur une vraie réponse le 30 juillet 2026 : Gmail
 * replie ses lignes à 76 caractères, donc « Le jeu. 30 juil. 2026 à 15:25,
 * Patrice Haure <…> a écrit : » arrive coupé en deux. Une détection ligne à
 * ligne rate le motif. Les marqueurs ci-dessous tolèrent donc un repli.
 */
export function sansCitation(texte: string): string {
  // Les fins de ligne Windows d'abord : sinon chaque ligne finit par un \r
  // invisible qui fait échouer les motifs les plus simples.
  const t = texte.replace(/\r\n/g, '\n').replace(/\r/g, '')

  const marqueurs = [
    /^>/m, // citation classique
    /^Le\s[\s\S]{0,200}?a\s*écrit\s*:/m, // Gmail français, même replié
    /^On\s[\s\S]{0,200}?wrote\s*:/m, // Gmail anglais
    /^-{2,}\s*Message d'origine/im,
    /^-{2,}\s*Original Message/im,
    /^De\s*:\s.+\nEnvoyé\s*:/im, // en-têtes recopiés par Outlook
    /^_{5,}/m,
  ]

  let coupe = -1
  for (const m of marqueurs) {
    const i = t.search(m)
    if (i > 0 && (coupe === -1 || i < coupe)) coupe = i
  }

  return (coupe === -1 ? t : t.slice(0, coupe)).trim()
}

/** Base64 « URL-safe » : ce que l'API Gmail attend dans `raw`. */
export function base64url(s: string): string {
  return Buffer.from(s, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}
