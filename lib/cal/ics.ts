/**
 * FABRIQUER UNE VRAIE INVITATION D'AGENDA.
 *
 * Une invitation n'est pas un type de message à part : c'est un courrier
 * ordinaire qui transporte une pièce `text/calendar; method=REQUEST`. Ce sont
 * ces quelques lignes qui font apparaître les boutons Oui / Peut-être / Non
 * dans Gmail, Outlook ou Apple Mail. Notre mot humain peut donc ÊTRE
 * l'invitation, au lieu d'en annoncer une seconde.
 *
 * ── 🔴 L'IDENTIFIANT EST TOUT ─────────────────────────────────────────────
 *
 * `UID` doit être CELUI de l'événement Google, sinon le « Oui » du prospect
 * part dans le vide : son client enverra une réponse qui ne se rattachera à
 * aucun rendez-vous, et l'agenda du distributeur ne saura jamais qu'il a
 * accepté.
 *
 * Mesuré le 4 novembre 2026 sur un vrai événement : Cal pose lui-même
 * `iCalUID = <uid de la réservation>@Cal.diy` (`CalendarService.ts:204`). Or
 * ce `uid` est exactement ce que le webhook reçoit. On peut donc le calculer
 * SANS appeler Google, et nos deux invitations décrivent alors le même
 * rendez-vous : le prospect n'en voit qu'un seul dans son agenda, même si
 * Google envoie encore la sienne de son côté.
 *
 * ── LES DÉTAILS QUI FONT ÉCHOUER SILENCIEUSEMENT ──────────────────────────
 *
 * · Fins de ligne CRLF, pas LF.
 * · Pliage à 75 OCTETS, pas 75 caractères : « é » en pèse deux, et couper au
 *   milieu d'une séquence UTF-8 produit un fichier que certains clients
 *   refusent sans rien dire.
 * · Échappement de `\`, `;`, `,` et des retours à la ligne dans tout texte.
 *   Une virgule non échappée dans un titre coupe la valeur en deux.
 * · Dates en UTC avec le `Z` final.
 */

const PRODID = '-//Atline//Rendez-vous//FR'

/** `20261106T120000Z` */
function utc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

/** Dans une valeur texte, ces quatre-là ont un sens structurel. */
function echapper(v: string): string {
  return v
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

/**
 * Plie une ligne à 75 octets, les suivantes commençant par une espace.
 *
 * 🔴 On compte en OCTETS et on recule tant qu'on est sur un octet de
 * continuation UTF-8 (`10xxxxxx`), sinon un « é » coupé en deux produit un
 * caractère de remplacement, ou un fichier rejeté.
 */
function plier(ligne: string): string {
  const o = Buffer.from(ligne, 'utf8')
  if (o.length <= 75) return ligne
  const bouts: string[] = []
  let i = 0
  let max = 75
  while (i < o.length) {
    let fin = Math.min(i + max, o.length)
    while (fin > i + 1 && fin < o.length && (o[fin] & 0xc0) === 0x80) fin--
    bouts.push(o.subarray(i, fin).toString('utf8'))
    i = fin
    max = 74 // l'espace de continuation compte dans les 75
  }
  return bouts.join('\r\n ')
}

export type Invitation = {
  /** Le `uid` de la réservation Cal. L'identifiant iCal s'en déduit. */
  uidReservation: string
  titre: string
  description: string
  debut: Date
  fin: Date
  /** Le distributeur : c'est lui l'organisateur, et lui qui recevra le « Oui ». */
  organisateurNom: string
  organisateurEmail: string
  inviteNom: string
  inviteEmail: string
  /** Lien de visioconférence ou adresse. */
  lieu: string | null
  /** 0 à la création, incrémenté à chaque modification. */
  sequence?: number
  methode?: 'REQUEST' | 'CANCEL'
}

export function construireIcs(i: Invitation): string {
  const methode = i.methode ?? 'REQUEST'
  const lignes = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PRODID}`,
    `METHOD:${methode}`,
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    // 🔴 Le même identifiant que l'événement Google. Voir l'en-tête.
    `UID:${i.uidReservation}@Cal.diy`,
    `SEQUENCE:${i.sequence ?? 0}`,
    `DTSTAMP:${utc(new Date())}`,
    `DTSTART:${utc(i.debut)}`,
    `DTEND:${utc(i.fin)}`,
    `SUMMARY:${echapper(i.titre)}`,
    `DESCRIPTION:${echapper(i.description)}`,
    ...(i.lieu ? [`LOCATION:${echapper(i.lieu)}`] : []),
    `ORGANIZER;CN=${echapper(i.organisateurNom)}:mailto:${i.organisateurEmail}`,
    `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN=${echapper(
      i.inviteNom || i.inviteEmail
    )}:mailto:${i.inviteEmail}`,
    `STATUS:${methode === 'CANCEL' ? 'CANCELLED' : 'CONFIRMED'}`,
    'TRANSP:OPAQUE',
  ]

  // Un rappel n'a de sens que sur une invitation vivante.
  if (methode === 'REQUEST') {
    lignes.push(
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'DESCRIPTION:Rappel',
      'TRIGGER:-PT30M',
      'END:VALARM'
    )
  }

  lignes.push('END:VEVENT', 'END:VCALENDAR')
  return lignes.map(plier).join('\r\n') + '\r\n'
}
