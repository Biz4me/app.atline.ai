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
  lignes.push(
    "Ce message porte l'invitation : accepte-la, c'est ce qui posera le " +
      'rendez-vous dans ton agenda et déclenchera le rappel.'
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
  lignes.push("Ce message porte la nouvelle invitation : accepte-la pour mettre ton agenda à jour.")
  if (r.replanifier) {
    lignes.push('')
    lignes.push(`Pour déplacer à nouveau ou annuler : ${r.replanifier}`)
  }
  lignes.push('')
  lignes.push('À très vite,')
  lignes.push(r.hote)

  return lignes.join('\n')
}
