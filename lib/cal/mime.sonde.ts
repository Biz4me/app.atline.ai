/**
 * Imprime le message BRUT que nous envoyons, pour regarder sa structure MIME
 * au lieu de la supposer.
 *
 * 🧭 Le courrier arrive, se lit, porte le bon expéditeur et le bon lien, mais
 * aucun bouton n'apparaît. Avant d'accuser le client de messagerie, on lit ce
 * qu'on lui donne.
 *
 * Lancer : npx tsx lib/cal/mime.sonde.ts
 */
import { construireMessage } from '../gmail/message'
import { construireIcs } from './ics'

const ics = construireIcs({
  uidReservation: 'nt1yk4WcsBqhCikwkF9zAF',
  titre: 'Premier échange entre Patrice Haure-Pallesi et Patrice',
  description: "C'est noté pour le jeudi 19 novembre 2026 à 12:00.",
  debut: new Date('2026-11-19T11:00:00.000Z'),
  fin: new Date('2026-11-19T11:20:00.000Z'),
  organisateurNom: 'Patrice Haure',
  organisateurEmail: 'humanstring@gmail.com',
  inviteNom: 'Patrice',
  inviteEmail: 'patricehaurepallesi@gmail.com',
  lieu: 'https://meet.google.com/fhn-xvsu-rzz',
})

const brut = construireMessage({
  nomAffiche: 'Patrice Haure',
  adresseEnvoi: 'humanstring@gmail.com',
  destinataire: 'patricehaurepallesi@gmail.com',
  sujet: "C'est noté pour jeudi 19 novembre 2026 à 12:00",
  corps: 'Bonjour Patrice,\n\nUn texte court pour la sonde.',
  invitation: { ics, methode: 'REQUEST' },
})

console.log('=== LE MESSAGE BRUT, octet pour octet (⏎ = CRLF) ===\n')
console.log(brut.replace(/\r\n/g, '⏎\n'))

console.log('\n=== CONTRÔLES DE STRUCTURE ===')
let ko = 0
const v = (q: string, ok: boolean, d = '') => {
  console.log(`  ${ok ? '✅' : '🔴'} ${q}${d ? ` — ${d}` : ''}`)
  if (!ok) ko++
}

const frontiere = brut.match(/boundary="([^"]+)"/)?.[1] ?? ''
v('une frontière est déclarée', !!frontiere, frontiere)
v('elle n’apparaît pas dans le contenu encodé', (brut.split(frontiere).length - 1) === 4,
  `trouvée ${brut.split(frontiere).length - 1} fois (3 séparateurs + l’en-tête = 4)`)
v('en-tête multipart/alternative', /Content-Type: multipart\/alternative/.test(brut))
v('une partie text/plain', /Content-Type: text\/plain/.test(brut))
v('une partie text/calendar', /Content-Type: text\/calendar/.test(brut))
v('method=REQUEST sur la partie calendrier', /text\/calendar[^\r\n]*method=REQUEST/.test(brut))
v('la partie calendrier vient APRÈS le texte',
  brut.indexOf('text/calendar') > brut.indexOf('text/plain'))
v('frontière finale avec les deux tirets', brut.includes(`--${frontiere}--`))
v('aucune ligne terminée par un seul \\n', !/[^\r]\n/.test(brut))
v('une ligne vide sépare les en-têtes du corps', /\r\n\r\n--/.test(brut))
v('chaque partie a sa ligne vide avant son contenu',
  (brut.match(/Content-Transfer-Encoding: base64\r\n\r\n/g) ?? []).length === 2)

console.log(`\n${ko === 0 ? '✅ structure conforme' : `🔴 ${ko} problème(s)`}\n`)
process.exit(ko === 0 ? 0 : 1)
