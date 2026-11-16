#!/usr/bin/env node
/**
 * LES LIBELLÉS QUI NE VEULENT RIEN DIRE — combien, et est-ce que ça s'améliore ?
 *
 *   node scripts/faits-libelles.mjs [email]        # sur le serveur
 *
 * ── 🔴 CE QUI L'A FAIT NAÎTRE (16 novembre 2026) ──────────────────────────
 *
 * En rattrapant les blocages sans compétence, cinq des douze orphelins se sont
 * révélés inclassables **non pas parce qu'ils étaient mal rangés, mais parce
 * qu'ils ne voulaient rien dire** : « rue », « pression auto déclarée nature
 * floue », « identification précise de ses sources de formation ». Leur coller
 * une compétence aurait inventé une faiblesse à partir de rien.
 *
 * ── 🧭 ON NE MESURE PAS « LE SENS ». ON MESURE QUATRE SIGNAUX ─────────────
 *
 * Aucun programme ne décide si une phrase veut dire quelque chose. Ce qui se
 * mesure, en revanche :
 *
 *   ① HORS FORMAT — le prompt EXIGE « 2 à 6 mots ». Un libellé d'un mot ou de
 *     sept n'est pas un jugement de goût : c'est le contrat, rompu.
 *   ② SANS MOT DU DOMAINE — aucun mot commun avec les treize définitions du
 *     référentiel ni leurs libellés. ⚠️ Signal, pas verdict : « démotivation »
 *     n'a aucun jeton commun avec « motivation » et veut pourtant dire quelque
 *     chose. Ce chiffre SURESTIME donc le bruit, et c'est écrit ici pour qu'on
 *     ne le lise pas comme une sentence.
 *   ③ JAMAIS RÉ-OBSERVÉ — `supportCount = 1`. Un constat qui ne revient jamais
 *     n'a soit pas compté, soit pas été reconnu la fois suivante.
 *   ④ MOTS ORPHELINS — chacun de ses mots n'apparaît dans aucun autre fait du
 *     compte. Un vocabulaire que personne ne reprend est un vocabulaire que
 *     personne n'a vraiment employé.
 *
 * Le croisement ② ET ③ est le PROXY retenu pour « suspect ». Il reste un proxy,
 * et la sortie imprime toujours l'échantillon : **c'est l'œil qui tranche**,
 * la sonde ne fait que le conduire au bon endroit.
 *
 * ── CE QUI REND LA MESURE UTILE : LA TENDANCE ─────────────────────────────
 *
 * Le taux par mois dit si les correctifs successifs du prompt ont servi. Un
 * chiffre absolu ne dit rien ; une pente, oui.
 *
 * 🔴 Elle n'écrit rien. Que des lectures.
 */
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const ici = dirname(fileURLToPath(import.meta.url))
const racine = join(ici, '..')
const require = createRequire(import.meta.url)
const email = process.argv[2] || null

// ── Le code de production, découpé dans sa source ──────────────────────────
const source = readFileSync(join(racine, 'lib/atlas-memory.ts'), 'utf8')
const bloc = (d, f) => {
  const i = source.indexOf(d)
  if (i < 0) throw new Error('bloc introuvable dans lib/atlas-memory.ts : ' + d)
  const j = source.indexOf(f, i)
  if (j < 0) throw new Error('fin de bloc introuvable : ' + f)
  return source.slice(i, j + f.length)
}
const motsPleins = eval(
  '(() => { ' +
    bloc('const MOTS_VIDES = new Set([', '])') +
    '\n' +
    bloc('export function motsPleins', '\n}')
      .replace('export function', 'function')
      .replace('(s: string): Set<string>', '(s)') +
    '\n return motsPleins })()',
)
if (motsPleins('de la le').size === 0) throw new Error('motsPleins découpé défaillant')

// Le vocabulaire du métier : les définitions ET les libellés du référentiel.
const DEFINITIONS = [
  "état d'esprit, motivation, confiance, gestion du refus",
  'clarté du pourquoi et du projet, capacité à le raconter',
  'les 72 premières heures, poser ses fondations',
  'construire et prioriser sa liste de contacts',
  'créer la curiosité sans vendre, décrocher le rendez-vous',
  'présenter avec impact et simplicité',
  'relancer sans harceler, tenir la relation dans la durée',
  'accueillir et traiter une objection sans se braquer',
  'conclure, demander la décision, accueillir un partenaire',
  'former un filleul, transmettre plutôt que faire à sa place',
  'animer une équipe, faire grandir les autres',
  "s'adapter au profil de l'interlocuteur (Big Al : rouge, bleu, jaune, vert)",
  'tenir son agenda, noter, prioriser, ne rien laisser tomber',
]

let url = process.env.DATABASE_URL
if (!url) {
  const env = join(racine, '.env.local')
  if (existsSync(env)) url = readFileSync(env, 'utf8').match(/^DATABASE_URL=(.*)$/m)?.[1]
}
if (!url) {
  console.error('DATABASE_URL introuvable')
  process.exit(1)
}
const { PrismaClient } = require(join(racine, 'node_modules/@prisma/client'))
const db = new PrismaClient({ datasources: { db: { url: url.replace(/^["']|["']$/g, '') } } })

const domaine = new Set()
for (const d of DEFINITIONS) for (const m of motsPleins(d)) domaine.add(m)
for (const c of await db.competence.findMany({ select: { label: true } }))
  for (const m of motsPleins(c.label)) domaine.add(m)
console.log(`vocabulaire du métier : ${domaine.size} mots tirés du référentiel`)

const qui = email
  ? (await db.user.findUniqueOrThrow({ where: { email }, select: { id: true } })).id
  : null
const faits = await db.atlasFact.findMany({
  where: { contactId: null, ...(qui ? { userId: qui } : {}) },
  select: {
    userId: true, predicate: true, object: true, source: true,
    status: true, supportCount: true, createdAt: true,
  },
})
console.log(`${faits.length} faits examinés${email ? ' · ' + email : ' · tous comptes'}\n`)

// ④ Combien de faits emploient chaque mot, par compte.
const emplois = new Map()
for (const f of faits)
  for (const m of motsPleins(f.object)) {
    const k = f.userId + '|' + m
    emplois.set(k, (emplois.get(k) ?? 0) + 1)
  }

const juge = (f) => {
  const bruts = f.object.trim().split(/\s+/).filter(Boolean)
  const pleins = motsPleins(f.object)
  const horsFormat = bruts.length < 2 || bruts.length > 6
  const sansDomaine = ![...pleins].some((m) => domaine.has(m))
  const jamaisRevu = f.supportCount === 1
  const orphelin = [...pleins].every((m) => (emplois.get(f.userId + '|' + m) ?? 0) <= 1)
  return { bruts: bruts.length, horsFormat, sansDomaine, jamaisRevu, orphelin,
           suspect: sansDomaine && jamaisRevu }
}

const tous = faits.map((f) => ({ f, j: juge(f) }))
const part = (n) => `${String(n).padStart(4)} (${String(Math.round((n / tous.length) * 100)).padStart(2)} %)`
console.log('LES QUATRE SIGNAUX, SUR TOUT CE QUI EXISTE')
console.log(`   ① hors format (1 mot, ou 7 et plus) ... ${part(tous.filter((x) => x.j.horsFormat).length)}`)
console.log(`   ② sans un mot du domaine .............. ${part(tous.filter((x) => x.j.sansDomaine).length)}`)
console.log(`   ③ jamais ré-observé ................... ${part(tous.filter((x) => x.j.jamaisRevu).length)}`)
console.log(`   ④ tous ses mots orphelins ............. ${part(tous.filter((x) => x.j.orphelin).length)}`)
console.log(`   ② ET ③ — le proxy « suspect » ......... ${part(tous.filter((x) => x.j.suspect).length)}`)

// ── LA TENDANCE : le taux de suspects par mois de création ────────────────
console.log('\nLA TENDANCE — part de suspects parmi les faits créés chaque mois')
const parMois = new Map()
for (const x of tous) {
  const m = x.f.createdAt.toISOString().slice(0, 7)
  const e = parMois.get(m) ?? { total: 0, suspects: 0, horsFormat: 0 }
  e.total++
  if (x.j.suspect) e.suspects++
  if (x.j.horsFormat) e.horsFormat++
  parMois.set(m, e)
}
for (const [m, e] of [...parMois.entries()].sort())
  console.log(
    `   ${m}  ${String(e.total).padStart(4)} créés · ${String(Math.round((e.suspects / e.total) * 100)).padStart(2)} % suspects · ${String(Math.round((e.horsFormat / e.total) * 100)).padStart(2)} % hors format`,
  )

// ── QUI LES ÉCRIT, ET SUR QUEL PRÉDICAT ──────────────────────────────────
const parClef = (clef) => {
  const m = new Map()
  for (const x of tous) {
    const k = x.f[clef]
    const e = m.get(k) ?? { total: 0, suspects: 0 }
    e.total++
    if (x.j.suspect) e.suspects++
    m.set(k, e)
  }
  return [...m.entries()].sort((a, b) => b[1].suspects - a[1].suspects)
}
console.log('\nPAR ÉCRIVAIN')
for (const [k, e] of parClef('source'))
  console.log(`   ${String(k).padEnd(8)} ${String(e.suspects).padStart(4)} / ${String(e.total).padStart(4)} = ${Math.round((e.suspects / e.total) * 100)} %`)
console.log('\nPAR PRÉDICAT (les six premiers)')
for (const [k, e] of parClef('predicate').slice(0, 6))
  console.log(`   ${String(k).padEnd(15)} ${String(e.suspects).padStart(4)} / ${String(e.total).padStart(4)} = ${Math.round((e.suspects / e.total) * 100)} %`)

// ── 🔴 L'ÉCHANTILLON : C'EST L'ŒIL QUI TRANCHE ───────────────────────────
console.log('\nLES VINGT SUSPECTS ACTIFS LES PLUS RÉCENTS — à lire, pas à croire')
for (const x of tous
  .filter((x) => x.j.suspect && x.f.status === 'active')
  .sort((a, b) => b.f.createdAt - a.f.createdAt)
  .slice(0, 20))
  console.log(
    `   ${x.f.createdAt.toISOString().slice(0, 10)} ${x.f.predicate.padEnd(14)} ${x.j.horsFormat ? '⚠️' : '  '} « ${x.f.object} »`,
  )

// Et le contrepoint : des faits que la sonde ne soupçonne PAS, pour qu'on voie
// ce qu'elle laisse passer. Un échantillon sans contre-échantillon ne prouve rien.
console.log('\nET DIX QU’ELLE NE SOUPÇONNE PAS, pour voir ce qu’elle laisse passer')
for (const x of tous
  .filter((x) => !x.j.suspect && x.f.status === 'active')
  .sort((a, b) => b.f.supportCount - a.f.supportCount)
  .slice(0, 10))
  console.log(`   vu ${String(x.f.supportCount).padStart(3)}× ${x.f.predicate.padEnd(14)} « ${x.f.object} »`)

await db.$disconnect()
