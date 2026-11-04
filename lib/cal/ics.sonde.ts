/**
 * Sonde du constructeur d'invitation. Pas un test automatisé : un instrument
 * qu'on lance à la main et dont on LIT la sortie.
 *
 * 🧭 Elle commence par se prouver elle-même : on lui donne une ligne trop
 * longue fabriquée exprès, et elle doit la signaler. Un contrôle d'absence qui
 * n'a jamais trouvé la chose quand elle était là ne vaut rien.
 *
 * Lancer : npx tsx lib/cal/ics.sonde.ts
 */
import { construireIcs } from './ics'
import { lieuLisible } from './evenement'

function octets(s: string): number {
  return Buffer.from(s, 'utf8').length
}

function lignesTropLongues(ics: string): string[] {
  return ics.split('\r\n').filter((l) => octets(l) > 75)
}

let echecs = 0
function verifier(quoi: string, ok: boolean, detail = '') {
  console.log(`  ${ok ? '✅' : '🔴'} ${quoi}${detail ? ` — ${detail}` : ''}`)
  if (!ok) echecs++
}

console.log("\n=== 0. la sonde sait-elle DÉTECTER une ligne trop longue ? ===")
const faux = 'BEGIN:VCALENDAR\r\n' + 'X-TEST:' + 'a'.repeat(200) + '\r\nEND:VCALENDAR'
verifier('une ligne de 207 octets est signalée', lignesTropLongues(faux).length === 1)

console.log('\n=== 1. un cas normal ===')
const ics = construireIcs({
  uidReservation: 'wnjHLD3JY3gH7KRUjf6Nwy',
  titre: 'Premier échange entre Patrice Haure-Pallesi et Jean',
  description:
    "Bonjour Jean,\n\nC'est noté pour le vendredi 6 novembre 2026 à 13:00 (20 minutes).\n\n" +
    'On se retrouve en visio : https://meet.google.com/bsj-kkds-nph',
  debut: new Date('2026-11-06T12:00:00.000Z'),
  fin: new Date('2026-11-06T12:20:00.000Z'),
  organisateurNom: 'Patrice Haure',
  organisateurEmail: 'humanstring@gmail.com',
  inviteNom: 'Jean',
  inviteEmail: 'jean@example.com',
  lieu: 'https://meet.google.com/bsj-kkds-nph',
})

const trop = lignesTropLongues(ics)
verifier('aucune ligne au-dessus de 75 octets', trop.length === 0, trop[0] ?? '')
verifier('fins de ligne CRLF', !/[^\r]\n/.test(ics))
verifier("l'identifiant est celui de l'événement Google", ics.includes('UID:wnjHLD3JY3gH7KRUjf6Nwy@Cal.diy'))
verifier('METHOD:REQUEST présent', ics.includes('METHOD:REQUEST'))
verifier('dates en UTC', ics.includes('DTSTART:20261106T120000Z') && ics.includes('DTEND:20261106T122000Z'))
verifier('organisateur = adresse qui envoie', ics.includes('mailto:humanstring@gmail.com'))

// 🔴 Toute vérification de CONTENU se fait sur le texte DÉPLIÉ.
// La ligne ATTENDEE dépasse 75 octets, donc `RSVP=TRUE` arrive coupé en deux
// par le repli : un contrôle sur le texte brut le rate et crie au défaut
// alors que le fichier est juste. Même famille que le repli des citations
// Gmail, qui nous avait déjà eus le 30 juillet.
const deplie = ics.replace(/\r\n /g, '')

verifier('invité avec RSVP', /ATTENDEE;.*RSVP=TRUE;.*mailto:jean@example\.com/.test(deplie))
verifier('rappel 30 minutes avant', ics.includes('TRIGGER:-PT30M'))
verifier('le titre accentué survit au pliage', deplie.includes('Premier échange entre Patrice Haure-Pallesi et Jean'))
verifier('les retours à la ligne sont échappés', deplie.includes('\\n\\n'))

console.log('\n=== 2. les caractères qui cassent une valeur iCal ===')
const piege = construireIcs({
  uidReservation: 'piege',
  titre: 'Démo, test; avec\\antislash',
  description: 'ligne 1\nligne 2',
  debut: new Date('2026-12-01T09:00:00.000Z'),
  fin: new Date('2026-12-01T09:30:00.000Z'),
  organisateurNom: 'Dupont, Jean',
  organisateurEmail: 'a@b.fr',
  inviteNom: 'Été; Noël',
  inviteEmail: 'c@d.fr',
  lieu: null,
})
const d2 = piege.replace(/\r\n /g, '')
verifier('virgule échappée dans le titre', d2.includes('SUMMARY:Démo\\, test\\; avec\\\\antislash'))
verifier("point-virgule échappé dans le nom de l'invité", d2.includes('CN=Été\\; Noël'))
verifier('aucune ligne trop longue non plus ici', lignesTropLongues(piege).length === 0)
verifier('pas de LOCATION quand il n’y a pas de lieu', !piege.includes('LOCATION:'))

console.log('\n=== 3. une annulation ===')
const annul = construireIcs({
  uidReservation: 'wnjHLD3JY3gH7KRUjf6Nwy',
  titre: 'Annulé',
  description: '',
  debut: new Date('2026-11-06T12:00:00.000Z'),
  fin: new Date('2026-11-06T12:20:00.000Z'),
  organisateurNom: 'Patrice Haure',
  organisateurEmail: 'humanstring@gmail.com',
  inviteNom: 'Jean',
  inviteEmail: 'jean@example.com',
  lieu: null,
  sequence: 2,
  methode: 'CANCEL',
})
verifier('METHOD:CANCEL', annul.includes('METHOD:CANCEL'))
verifier('STATUS:CANCELLED', annul.includes('STATUS:CANCELLED'))
verifier('même identifiant que la création', annul.includes('UID:wnjHLD3JY3gH7KRUjf6Nwy@Cal.diy'))
verifier('séquence incrémentée', annul.includes('SEQUENCE:2'))
verifier('aucun rappel sur une annulation', !annul.includes('BEGIN:VALARM'))

console.log('\n=== 4. le lieu affiché au prospect ===')
// 🔴 C'est LE défaut qui a atteint un vrai prospect le 4 novembre :
// « On se retrouve ici : integrations:google:meet ».
verifier('le type brut de Cal est écarté', lieuLisible('integrations:google:meet') === null)
verifier('les autres intégrations aussi', lieuLisible('integrations:daily') === null)
verifier('une URL passe', lieuLisible('https://meet.google.com/abc-defg-hij') === 'https://meet.google.com/abc-defg-hij')
verifier('une vraie adresse passe', lieuLisible('12 rue des Lilas, Lyon') === '12 rue des Lilas, Lyon')
verifier('le vide reste vide', lieuLisible('') === null && lieuLisible(null) === null && lieuLisible(undefined) === null)
verifier('les espaces seuls ne font pas un lieu', lieuLisible('   ') === null)

console.log(`\n${echecs === 0 ? '✅ tout passe' : `🔴 ${echecs} contrôle(s) en échec`}\n`)
console.log('--- le fichier produit, pour lecture ---')
console.log(ics.replace(/\r\n/g, '\n'))
process.exit(echecs === 0 ? 0 : 1)
