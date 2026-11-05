/**
 * LE MOT QUE LE DISTRIBUTEUR ENVOIE APRÈS UNE RÉSERVATION.
 *
 * ── POURQUOI CE COURRIER EXISTE, ALORS QUE GOOGLE ENVOIE DÉJÀ UNE INVITATION
 *
 * Mesuré le 4 novembre 2026. Le réglage d'agenda de Google « ajouter les
 * invitations seulement si l'expéditeur est connu » est actif par défaut chez
 * beaucoup de monde, et un expéditeur n'est « connu » que s'il est dans les
 * contacts, dans la même organisation, ou si on a déjà échangé avec lui.
 *
 * Un prospect froid n'est aucun des trois. Donc :
 *
 *   · l'invitation ARRIVE dans sa boîte,
 *   · mais l'événement n'est PAS posé dans son agenda,
 *   · donc aucun rappel ne sonnera avant le rendez-vous,
 *   · pendant que Cal affiche « confirmé » au distributeur.
 *
 * C'est une machine à lapins, et elle est silencieuse des deux côtés. Ce
 * courrier-ci est donc la pièce porteuse : il arrive et se lit sans dépendre
 * d'un réglage chez le prospect, il porte le lien de visioconférence en texte
 * clair plutôt qu'enfermé dans une pièce jointe qui n'a pas été acceptée, et
 * il porte la phrase qui demande d'accepter l'invitation.
 *
 * 🧭 Et il répare le canal : dès que le prospect RÉPOND une fois, le
 * distributeur devient « connu », et toutes les invitations suivantes se
 * poseront d'elles-mêmes dans son agenda.
 *
 * ── 🔴 CE QU'ON NE LUI DEMANDE PLUS ───────────────────────────────────────
 *
 * Ce texte disait « accepte l'invitation ». C'était FAUX, et mesuré le 4
 * novembre : `CalendarService.ts:143` marque chaque invité
 * `responseStatus: "accepted"` au moment même où Cal crée l'événement. Le
 * prospect est donc déjà « accepté » sans avoir rien cliqué, Gmail n'a plus
 * rien à lui demander, et aucun bouton n'apparaît. Deux conséquences : on ne
 * lui demande pas un geste qui n'existe pas, et **on ne saura jamais s'il a
 * vraiment confirmé** tant que Cal répondra à sa place.
 *
 * ── STYLE ─────────────────────────────────────────────────────────────────
 *
 * On écrit comme une personne écrit, pas comme un système notifie. Pas de
 * jargon, pas de tirets cadratins, des phrases courtes. Le prospect doit
 * pouvoir répondre à ce message sans avoir l'impression de parler à un robot,
 * parce que sa réponse est exactement ce qu'on veut.
 */

const FUSEAU_DEFAUT = 'Europe/Paris'

export type Rendez = {
  /** Le prénom ou le nom donné par le prospect au moment de réserver. */
  invite: string
  /** Le nom affiché du distributeur. */
  hote: string
  /** Le nom du type de rendez-vous : « Premier échange ». */
  typeNom: string | null
  /**
   * CE QUI VA SE PASSER, écrit par le distributeur dans Cal, et différent
   * pour chaque type de rendez-vous. C'est le cœur du message : un texte
   * générique que j'aurais inventé serait le même pour tout le monde, alors
   * que celui-ci est sa voix et qu'il peut le changer sans toucher au code.
   */
  quoi: string | null
  debut: Date
  fin: Date | null
  /** Le fuseau du prospect, tel que Cal l'a relevé. */
  fuseau: string
  /** Lien de visioconférence, s'il y en a un. */
  visio: string | null
  /** Lieu lisible quand ce n'est pas une visio (adresse, téléphone). */
  lieu: string | null
  /** Lien Cal pour déplacer ou annuler. */
  replanifier: string | null
}

/**
 * « jeudi 19 novembre à 12:00 » dans le fuseau du prospect.
 *
 * ⚠️ L'année n'apparaît que si elle n'est pas l'année en cours. Pour un
 * rendez-vous dans deux semaines, « 2026 » est du bruit ; pour un rendez-vous
 * en janvier pris en décembre, c'est une information.
 */
function quand(d: Date, fuseau: string): string {
  const anneeDuRdv = new Intl.DateTimeFormat('fr-FR', { timeZone: fuseau, year: 'numeric' }).format(d)
  const anneeCourante = new Intl.DateTimeFormat('fr-FR', { timeZone: fuseau, year: 'numeric' }).format(new Date())
  const date = new Intl.DateTimeFormat('fr-FR', {
    timeZone: fuseau,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    ...(anneeDuRdv === anneeCourante ? {} : { year: 'numeric' as const }),
  }).format(d)
  const heure = new Intl.DateTimeFormat('fr-FR', {
    timeZone: fuseau,
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
  return `${date} à ${heure}`
}

/**
 * Le prénom, tel qu'on osera l'écrire en tête du message.
 *
 * ⚠️ On reprend ce que le prospect a tapé, et il tape souvent en minuscules :
 * « Bonjour marie » fait négligé. On relève la première lettre, et RIEN
 * d'autre — rabaisser le reste casserait « McDonald » ou « Le Goff ».
 */
function prenomDe(nom: string): string {
  const p = (nom || '').trim().split(/\s+/)[0] ?? ''
  return p ? p.charAt(0).toUpperCase() + p.slice(1) : ''
}

function duree(debut: Date, fin: Date | null): string {
  if (!fin) return ''
  const min = Math.round((fin.getTime() - debut.getTime()) / 60000)
  return min > 0 ? `, pendant ${min} minutes` : ''
}

/**
 * « Premier échange : jeudi 19 novembre à 12:00 »
 *
 * Le nom du type dit DE QUOI il s'agit, la date permet de le retrouver deux
 * semaines plus tard dans une boîte pleine. Rien d'autre.
 */
export function sujetConfirmation(r: Rendez): string {
  const d = quand(r.debut, r.fuseau || FUSEAU_DEFAUT)
  return r.typeNom ? `${r.typeNom} : ${d}` : `C'est noté pour ${d}`
}

export function corpsConfirmation(r: Rendez): string {
  const fuseau = r.fuseau || FUSEAU_DEFAUT
  const prenom = prenomDe(r.invite)
  const lignes: string[] = []

  lignes.push(prenom ? `Bonjour ${prenom},` : 'Bonjour,')
  lignes.push('')
  lignes.push(`C'est noté pour le ${quand(r.debut, fuseau)}${duree(r.debut, r.fin)}.`)

  // 🔴 CE QUI VA SE PASSER, dans ses mots à lui. Voir le type `Rendez`.
  if (r.quoi) {
    lignes.push('')
    lignes.push(r.quoi.trim())
  }

  lignes.push('')
  if (r.visio) {
    lignes.push(`On se retrouve en visio : ${r.visio}`)
    lignes.push("Rien à installer, ça s'ouvre dans le navigateur.")
  } else if (r.lieu) {
    lignes.push(`On se retrouve ici : ${r.lieu}`)
  } else {
    lignes.push('Je te recontacte au moment prévu.')
  }

  lignes.push('')
  // 🔴 CETTE LIGNE N'EST PAS DE LA POLITESSE, ET ELLE REMPLACE UNE DEMANDE
  // DE CONFIRMATION QUI ÉTAIT ÉCRITE DU MAUVAIS CÔTÉ.
  //
  // Le rendez-vous est DÉJÀ posé dans l'agenda du prospect et le rappel
  // sonnera de toute façon : cliquer « Oui » ne lui sert à rien. Le
  // « 1 en attente » est un signal pour le DISTRIBUTEUR, et il l'a sans rien
  // demander. (Et « c'est déjà dans ton agenda » serait FAUX pour un prospect
  // chez Outlook, dont le client ne le posera qu'après acceptation : une
  // phrase vraie pour la moitié des lecteurs n'a rien à faire ici.)
  //
  // Une réponse, elle, fait trois choses d'un coup : elle confirme en termes
  // humains, elle ouvre le fil que la surveillance Gmail lit déjà, et elle
  // fait du distributeur un « expéditeur connu » chez Google — après quoi
  // TOUTES ses invitations futures se posent d'elles-mêmes dans l'agenda de
  // cette personne.
  lignes.push("Si tu as une question d'ici là, réponds simplement à ce message.")

  if (r.replanifier) {
    lignes.push('Et si tu as un empêchement, tu peux déplacer ou annuler ici :')
    lignes.push(r.replanifier)
  }

  lignes.push('')
  lignes.push('À très vite,')
  lignes.push(r.hote)

  return lignes.join('\n')
}

/**
 * Ce qu'on écrit quand le rendez-vous est annulé.
 *
 * 🔴 Ce courrier n'est pas une politesse : il transporte le `METHOD:CANCEL`
 * qui RETIRE l'événement de l'agenda du prospect. Sans lui, Google s'étant
 * tu, le rendez-vous resterait posé chez lui pour toujours, avec son rappel.
 * Un rendez-vous fantôme est pire que deux courriers.
 */
export function sujetAnnulation(r: Rendez): string {
  const d = quand(r.debut, r.fuseau || FUSEAU_DEFAUT)
  return r.typeNom ? `${r.typeNom} annulé : ${d}` : `Annulé : notre rendez-vous du ${d}`
}

export function corpsAnnulation(
  r: Rendez,
  extra: { motif?: string | null; parLeProspect: boolean; reserver?: string | null }
): string {
  const fuseau = r.fuseau || FUSEAU_DEFAUT
  const prenom = prenomDe(r.invite)
  const lignes: string[] = []

  lignes.push(prenom ? `Bonjour ${prenom},` : 'Bonjour,')
  lignes.push('')
  lignes.push(`Notre rendez-vous du ${quand(r.debut, fuseau)} est annulé.`)

  // On ne renvoie pas au prospect le motif qu'il vient lui-même d'écrire.
  if (extra.motif && !extra.parLeProspect) {
    lignes.push('')
    lignes.push(extra.motif)
  }

  lignes.push('')
  lignes.push(
    extra.parLeProspect
      ? "Pas de souci. Quand tu veux, tu peux en reprendre un :"
      : 'Désolé pour le changement. Tu peux en reprendre un quand ça t’arrange :'
  )
  if (extra.reserver) lignes.push(extra.reserver)

  lignes.push('')
  lignes.push('À bientôt,')
  lignes.push(r.hote)

  return lignes.join('\n')
}

/** Ce qu'on écrit quand le rendez-vous a été déplacé. */
export function sujetDeplacement(r: Rendez): string {
  const d = quand(r.debut, r.fuseau || FUSEAU_DEFAUT)
  return r.typeNom ? `${r.typeNom} déplacé : ${d}` : `Nouveau créneau : ${d}`
}

export function corpsDeplacement(r: Rendez): string {
  const fuseau = r.fuseau || FUSEAU_DEFAUT
  const prenom = prenomDe(r.invite)
  const lignes: string[] = []

  lignes.push(prenom ? `Bonjour ${prenom},` : 'Bonjour,')
  lignes.push('')
  lignes.push(`Notre rendez-vous a été déplacé au ${quand(r.debut, fuseau)}${duree(r.debut, r.fin)}.`)
  if (r.visio) {
    lignes.push('')
    lignes.push('Le lien reste le même :')
    lignes.push(r.visio)
  }
  lignes.push('')
  // Même raison que dans la confirmation : l'agenda se met à jour tout
  // seul, et redemander un clic ne sert qu’à nous. Une réponse, si.
  lignes.push("Si ça ne t’arrange pas, dis-le-moi en répondant à ce message.")
  if (r.replanifier) {
    lignes.push('')
    lignes.push('Ou pour déplacer à nouveau, c’est ici :')
    lignes.push(r.replanifier)
  }
  lignes.push('')
  lignes.push('À très vite,')
  lignes.push(r.hote)

  return lignes.join('\n')
}
