/**
 * Imprime les trois courriers tels que le prospect les recevra.
 *
 * 🧭 Un texte destiné à un humain se relit, il ne se teste pas. Cette sonde
 * n'affirme rien : elle montre, pour qu'on décide en regardant.
 *
 * Lancer : npx tsx lib/cal/texte.sonde.ts
 */
import {
  corpsAnnulation,
  corpsConfirmation,
  corpsDeplacement,
  sujetAnnulation,
  sujetConfirmation,
  sujetDeplacement,
  type Rendez,
} from './message'

// La vraie description, copiée telle qu'elle est enregistrée dans Cal, avec
// ses sauts de ligne en plein milieu des phrases.
const DESCRIPTION_REELLE =
  "20 minutes au téléphone pour faire connaissance et voir si ce que je fais\n\n" +
  "peut t'intéresser. Pas de présentation, pas d'engagement : juste une\n\n" +
  'conversation.'

const base: Rendez = {
  invite: 'marie dupont',
  hote: 'Patrice Haure',
  typeNom: 'Premier échange',
  quoi: DESCRIPTION_REELLE,
  debut: new Date('2026-11-19T11:00:00.000Z'),
  fin: new Date('2026-11-19T11:20:00.000Z'),
  fuseau: 'Europe/Paris',
  visio: 'https://meet.google.com/fhn-xvsu-rzz',
  lieu: null,
  replanifier: 'https://cal.atline.ai/booking/nt1yk4WcsBqhCikwkF9zAF?changes=true',
}

function montrer(titre: string, sujet: string, corps: string) {
  console.log(`\n${'═'.repeat(72)}\n  ${titre}\n${'═'.repeat(72)}`)
  console.log(`Sujet : ${sujet}\n`)
  console.log(corps)
}

montrer('① LA CONFIRMATION', sujetConfirmation(base), corpsConfirmation(base))

montrer('② LE DÉPLACEMENT', sujetDeplacement(base), corpsDeplacement(base))

montrer(
  "③ L'ANNULATION (par le prospect)",
  sujetAnnulation(base),
  corpsAnnulation(base, {
    motif: 'Un imprévu de dernière minute.',
    parLeProspect: true,
    reserver: 'https://cal.atline.ai/patrice',
  })
)

montrer(
  "④ L'ANNULATION (par le distributeur)",
  sujetAnnulation(base),
  corpsAnnulation(base, {
    motif: 'Je dois décaler, un imprévu de mon côté.',
    parLeProspect: false,
    reserver: 'https://cal.atline.ai/patrice',
  })
)

console.log(`\n${'═'.repeat(72)}`)
console.log('  ⚠️ Le bloc « ce qui va se passer » reproduit tes sauts de ligne')
console.log('     tels quels. Si les lignes vides au milieu des phrases te')
console.log('     gênent, c\'est dans Cal qu\'il faut réécrire la description.')
console.log(`${'═'.repeat(72)}\n`)
