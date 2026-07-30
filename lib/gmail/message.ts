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

/**
 * QUI A ÉCRIT, VRAIMENT ? — la question qu'on oubliait de poser.
 *
 * Un échec de remise arrive DANS le fil d'origine : Gmail le rattache au
 * message qu'il n'a pas pu livrer. Il passe donc notre bornage sans problème,
 * et comme il ne vient pas de l'adresse du distributeur, il était jusqu'ici
 * classé comme une réponse du prospect. Conséquences en chaîne : la séquence
 * de relance s'arrêtait au motif que « le prospect a répondu », le texte du
 * rapport d'erreur devenait sa dernière réponse, et Orion rédigeait un message
 * chaleureux à destination de `mailer-daemon`.
 *
 * Même mécanique pour un message d'absence : Orion répondait à un répondeur.
 *
 * ── LA DISTINCTION QUI COMPTE ──────────────────────────────────────────────
 *
 * Un échec 5.x.x est DÉFINITIF (RFC 3463) : l'adresse n'existe pas, insister
 * n'y changera rien et chaque tentative abîme la réputation de l'expéditeur.
 * Un 4.x.x est TEMPORAIRE : boîte pleine, serveur indisponible. Gmail réessaie
 * tout seul, on ne touche à rien.
 */
export type Nature = 'humain' | 'rebond-definitif' | 'rebond-temporaire' | 'automatique'

export function natureDuMessage(m: {
  from: string
  sujet: string
  contentType?: string
  autoSubmitted?: string
  precedence?: string
  failedRecipients?: string
  texte: string
}): Nature {
  const from = (m.from || '').toLowerCase()
  const sujet = (m.sujet || '').toLowerCase()

  // Un rapport de remise se reconnaît d'abord à son type MIME normalisé, et à
  // défaut à son expéditeur : tous les serveurs ne respectent pas la norme.
  // ⚠️ On exige la PARTIE LOCALE exacte, pas une sous-chaîne. Chercher
  // « postmaster » n'importe où dans l'expéditeur classerait
  // contact@postmastersarl.fr comme un échec de remise : on fermerait la
  // conversation d'un vrai prospect en le déclarant injoignable.
  const estRapport =
    /multipart\/report/i.test(m.contentType ?? '') ||
    /delivery-status/i.test(m.contentType ?? '') ||
    /(^|<|\s)(mailer-daemon|postmaster|mail-daemon)@/i.test(from) ||
    /mail delivery (subsystem|system)/i.test(from) ||
    Boolean(m.failedRecipients)

  if (estRapport) {
    // Le code de statut prime sur tout le reste : c'est lui qui dit si
    // l'adresse est morte ou seulement indisponible.
    const statut = m.texte.match(/\bStatus:\s*([45])\.\d+\.\d+/i)?.[1]
    if (statut === '4') return 'rebond-temporaire'
    if (statut === '5') return 'rebond-definitif'
    // Sans code lisible, on se rabat sur le vocabulaire des rapports.
    if (/\b(delayed|differ|temporair|will retry|réessaiera)\b/i.test(m.texte)) return 'rebond-temporaire'
    return 'rebond-definitif'
  }

  // Répondeurs d'absence : la norme RFC 3834 d'abord, les usages ensuite.
  const auto = (m.autoSubmitted ?? '').toLowerCase()
  if (auto && auto !== 'no') return 'automatique'
  if (/\b(bulk|auto_reply|auto-reply|junk)\b/i.test(m.precedence ?? '')) return 'automatique'
  if (/^(re\s*:\s*)?(absence|congés|out of office|automatic reply|réponse automatique|autoreply)/i.test(sujet)) {
    return 'automatique'
  }
  if (/^(noreply|no-reply|ne-pas-repondre|donotreply)@/i.test(from)) return 'automatique'

  return 'humain'
}


/** Une partie MIME telle que l'API Gmail la renvoie. */
export type Partie = { mimeType?: string; body?: { data?: string; size?: number }; parts?: Partie[] }

function decoder(data?: string): string {
  if (!data) return ''
  try {
    return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
  } catch {
    return ''
  }
}

/**
 * Le texte d'un message reçu. On préfère le texte brut ; à défaut on dégrossit
 * le HTML, parce qu'un prospect qui répond depuis son téléphone envoie souvent
 * du HTML sans le savoir.
 */
export function texteDe(partie?: Partie): string {
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

/** Base64 « URL-safe » : ce que l'API Gmail attend dans `raw`. */
export function base64url(s: string): string {
  return Buffer.from(s, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}
