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

/** « jeudi 5 novembre 2026 à 21:00 » dans le fuseau du prospect. */
function quand(d: Date, fuseau: string): string {
  const date = new Intl.DateTimeFormat('fr-FR', {
    timeZone: fuseau,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d)
  const heure = new Intl.DateTimeFormat('fr-FR', {
    timeZone: fuseau,
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
  return `${date} à ${heure}`
}

function duree(debut: Date, fin: Date | null): string {
  if (!fin) return ''
  const min = Math.round((fin.getTime() - debut.getTime()) / 60000)
  return min > 0 ? ` (${min} minutes)` : ''
}

export function sujetConfirmation(r: Rendez): string {
  return `C'est noté pour ${quand(r.debut, r.fuseau || FUSEAU_DEFAUT)}`
}

export function corpsConfirmation(r: Rendez): string {
  const fuseau = r.fuseau || FUSEAU_DEFAUT
  const prenom = (r.invite || '').trim().split(/\s+/)[0] || 'Bonjour'
  const lignes: string[] = []

  lignes.push(`Bonjour ${prenom},`)
  lignes.push('')
  lignes.push(`C'est noté pour le ${quand(r.debut, fuseau)}${duree(r.debut, r.fin)}.`)
  lignes.push('')

  if (r.visio) {
    lignes.push('On se retrouve en visio, voici le lien :')
    lignes.push(r.visio)
    lignes.push('')
    lignes.push("Pas besoin d'installer quoi que ce soit, il s'ouvre dans le navigateur.")
  } else if (r.lieu) {
    lignes.push(`On se retrouve ici : ${r.lieu}`)
  } else {
    lignes.push('Je te recontacte au moment prévu.')
  }

  lignes.push('')
  // 🔴 LA phrase qui compte. Sans elle, l'événement n'entre pas dans son
  // agenda et aucun rappel ne sonnera. Voir l'en-tête du fichier.
  // 🔴 LA phrase qui compte, et elle a été fausse deux fois avant d'être juste.
  //
  // ① Elle disait « accepte l'invitation » alors que Cal répondait oui à la
  //    place du prospect : il n'y avait rien à accepter. Corrigé dans le fork.
  // ② Elle disait « ci-dessous », en croyant que le bouton serait dans le
  //    courrier. Mesuré le 5 novembre 2026 : Google pose l'événement dans
  //    l'agenda de l'invité et c'est LÀ qu'il affiche Oui / Non / Peut-être.
  //    Aucun bouton n'apparaît dans le message, et c'est normal.
  //
  // ⚠️ Elle doit rester vraie pour un prospect qui n'est PAS chez Google :
  // son client lira notre `.ics` et posera l'événement de son côté. D'où
  // « dans ton agenda », qui vaut dans les deux cas, plutôt que de désigner
  // un bouton à un endroit précis.
  lignes.push(
    "Tu le trouveras dans ton agenda, en attente de ta réponse. Un clic sur " +
      '« Oui » et c’est confirmé, avec le rappel.'
  )

  if (r.replanifier) {
    lignes.push('')
    lignes.push(`Si tu as un empêchement, tu peux déplacer ou annuler ici : ${r.replanifier}`)
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
  return `Annulé : notre rendez-vous du ${quand(r.debut, r.fuseau || FUSEAU_DEFAUT)}`
}

export function corpsAnnulation(
  r: Rendez,
  extra: { motif?: string | null; parLeProspect: boolean; reserver?: string | null }
): string {
  const fuseau = r.fuseau || FUSEAU_DEFAUT
  const prenom = (r.invite || '').trim().split(/\s+/)[0] || 'Bonjour'
  const lignes: string[] = []

  lignes.push(`Bonjour ${prenom},`)
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
  return `Nouveau créneau : ${quand(r.debut, r.fuseau || FUSEAU_DEFAUT)}`
}

export function corpsDeplacement(r: Rendez): string {
  const fuseau = r.fuseau || FUSEAU_DEFAUT
  const prenom = (r.invite || '').trim().split(/\s+/)[0] || 'Bonjour'
  const lignes: string[] = []

  lignes.push(`Bonjour ${prenom},`)
  lignes.push('')
  lignes.push(`Notre rendez-vous a été déplacé au ${quand(r.debut, fuseau)}${duree(r.debut, r.fin)}.`)
  if (r.visio) {
    lignes.push('')
    lignes.push('Le lien reste le même :')
    lignes.push(r.visio)
  }
  lignes.push('')
  lignes.push("Ton agenda est mis à jour, et attend de nouveau ta réponse.")
  if (r.replanifier) {
    lignes.push('')
    lignes.push(`Pour déplacer à nouveau ou annuler : ${r.replanifier}`)
  }
  lignes.push('')
  lignes.push('À très vite,')
  lignes.push(r.hote)

  return lignes.join('\n')
}
