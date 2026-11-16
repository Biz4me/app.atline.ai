#!/usr/bin/env node
/**
 * LES BLOCAGES SANS COMPÉTENCE — leur donner la leur, ou l'assumer vide.
 *
 *   node scripts/faits-rattraper-slug.mjs              # montre, n'écrit RIEN
 *   node scripts/faits-rattraper-slug.mjs --appliquer  # écrit
 *
 * ── POURQUOI SEULEMENT `bloque_sur` ───────────────────────────────────────
 *
 * C'est le SEUL prédicat dont `etatDesCompetences` tire un niveau observé. Un
 * `situation` ou un `croit` sans compétence ne coûte rien ; un `bloque_sur`
 * sans compétence ne compte dans AUCUN niveau, donc il est invisible pour la
 * recommandation de module. Mesuré le 16 novembre 2026 : **12 blocages actifs
 * sur 54** étaient dans ce cas, dont « objection pyramide » et « démotivation »
 * qui ont chacun leur compétence évidente.
 *
 * ── 🔴 LE SLUG EST HÉRITÉ, JAMAIS DEVINÉ ──────────────────────────────────
 *
 * La maison l'a déjà écrit : *« un identifiant inventé est JETÉ, jamais
 * rattrapé au plus proche : un trou honnête vaut mieux qu'une case remplie au
 * hasard »*. On ne demande donc pas à un modèle de classer le passé.
 *
 * On cherche, dans les blocages du MÊME compte qui portent DÉJÀ une
 * compétence, celui qui ressemble le plus — avec `motsPleins` et
 * `ressemblance`, le code de production, découpé dans sa source. Le slug du
 * parent est hérité ; sans parent assez proche, **la case reste vide et on le
 * dit**.
 *
 * ⚠️ ET LE SEUIL SE MESURE, IL NE SE CHOISIT PAS : lancer sans `--appliquer`
 * imprime le score de chaque candidat. C'est en les lisant qu'on tranche.
 *
 * ── ⚠️ CE QUE ÇA CHANGE À L'ÉCRAN ─────────────────────────────────────────
 *
 * Un blocage slugué pèse sur le niveau de sa compétence
 * (`NEUTRE - (NEUTRE - penalite(vu)) * fraicheur`), donc sur le module
 * recommandé. Le mode sec imprime le niveau AVANT et APRÈS pour chaque
 * compétence touchée : un rattrapage qui change une recommandation doit le
 * montrer avant de le faire.
 *
 * 🔴 Jamais de DELETE, et une trace horodatée avant toute écriture.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const ici = dirname(fileURLToPath(import.meta.url))
const racine = join(ici, '..')
const require = createRequire(import.meta.url)
const appliquer = process.argv.includes('--appliquer')
/** Hérité au-dessus de ce score. Par défaut CERTITUDE ; réglable pour mesurer. */
const seuilArg = Number((process.argv.find((a) => a.startsWith('--seuil=')) || '').split('=')[1])

// ── Le code de production, découpé dans sa source ──────────────────────────
const source = readFileSync(join(racine, 'lib/atlas-memory.ts'), 'utf8')
const bloc = (d, f) => {
  const i = source.indexOf(d)
  if (i < 0) throw new Error('bloc introuvable dans lib/atlas-memory.ts : ' + d)
  const j = source.indexOf(f, i)
  if (j < 0) throw new Error('fin de bloc introuvable : ' + f)
  return source.slice(i, j + f.length)
}
const outils = [
  bloc('const MOTS_VIDES = new Set([', '])'),
  bloc('export function motsPleins', '\n}').replace('export function', 'function').replace('(s: string): Set<string>', '(s)'),
  bloc('export function ressemblance', '\n}').replace('export function', 'function').replace('(a: Set<string>, b: Set<string>): number', '(a, b)'),
].join('\n')
const CERTITUDE = Number(source.match(/export const CERTITUDE = ([\d.]+)/)?.[1])
if (!CERTITUDE) throw new Error('CERTITUDE introuvable')
const SEUIL = Number.isFinite(seuilArg) ? seuilArg : CERTITUDE
const { motsPleins, ressemblance } = eval('(() => { ' + outils + '\n return { motsPleins, ressemblance } })()')
if (ressemblance(motsPleins('relance de mélanie'), motsPleins('relance melanie')) < 0.99)
  throw new Error('les outils découpés ne reconnaissent pas un doublon évident')

// Le niveau, avec les constantes de production.
const comp = readFileSync(join(racine, 'lib/competences.ts'), 'utf8')
const NEUTRE = Number(comp.match(/const NEUTRE = (\d+)/)?.[1])
if (!NEUTRE) throw new Error('NEUTRE introuvable dans lib/competences.ts')
const coupe = (debut, fin) => {
  const i = comp.indexOf(debut)
  if (i < 0) throw new Error('bloc introuvable dans lib/competences.ts : ' + debut)
  const j = comp.indexOf(fin, i)
  if (j < 0) throw new Error('fin de bloc introuvable : ' + fin)
  return comp.slice(i, j + fin.length)
}
const { penalite, fraicheur } = eval(
  '(() => { ' +
    coupe('const penalite =', '+ 3)))').replace('(observations: number)', '(observations)') +
    '\n' +
    coupe('function fraicheur', '/ 90\n}').replace('(jours: number): number', '(jours)') +
    '\n return { penalite, fraicheur } })()',
)
/**
 * 🔴 CONTRÔLES POSITIFS, et le premier m'a attrapé : j'avais écrit
 * `penalite(1) < penalite(20)`. C'est l'inverse. `penalite` rend le NIVEAU, pas
 * une pénalité : vu 1 fois → 45, vu 20 fois → 8. **Plus un blocage revient,
 * plus le niveau descend.** Le nom m'a trompé ; le contrôle, non.
 */
if (!(penalite(1) > penalite(20))) throw new Error('penalite découpée défaillante')
if (penalite(1) !== 45) throw new Error('penalite(1) devrait valoir 45, pas ' + penalite(1))
if (fraicheur(0) !== 1 || fraicheur(200) !== 0) throw new Error('fraicheur découpée défaillante')
const niveauObserve = (vu, jours) => Math.round(NEUTRE - (NEUTRE - penalite(vu)) * fraicheur(jours))
if (!(niveauObserve(1, 0) < NEUTRE)) throw new Error('niveauObserve découpé défaillant')

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

/**
 * ── 🔴 LA SECONDE SOURCE D'HÉRITAGE : LE RÉFÉRENTIEL LUI-MÊME ─────────────
 *
 * Le premier essai ne cherchait un parent que parmi les blocages voisins. Sur
 * les 12 orphelins, il a rendu **0 rattrapage** : le meilleur candidat plafonne
 * à 0,67, et « objection pyramide » n'a aucun voisin — son compte ne porte que
 * deux blocages slugués, sans un mot commun.
 *
 * 🧭 Or il existe une source plus autoritaire qu'un fait voisin : **la
 * DÉFINITION de la compétence**, celle qu'on donne au modèle. « objection
 * pyramide » contient « objection », qui est le mot même de la définition
 * d'`objections`. Ce n'est pas deviner, c'est lire le référentiel.
 *
 * ⚠️ ET IL FAUT UNE LISTE DE MOTS CREUX, sinon ça rate. Sans elle,
 * « gestion pression prospect en appel » tombait sur `etat-esprit` parce que sa
 * définition dit « gestion du refus » : un verbe générique suffisait à classer
 * un blocage qui n'a rien à voir. La liste est écrite à la main, courte, et
 * relisible — c'est un jugement, mais UN seul, transparent, au lieu de douze.
 */
const DEFINITIONS = {
  'etat-esprit': "état d'esprit, motivation, confiance, gestion du refus",
  pourquoi: 'clarté du pourquoi et du projet, capacité à le raconter',
  demarrage: 'les 72 premières heures, poser ses fondations',
  'liste-noms': 'construire et prioriser sa liste de contacts',
  invitation: 'créer la curiosité sans vendre, décrocher le rendez-vous',
  presentation: 'présenter avec impact et simplicité',
  suivi: 'relancer sans harceler, tenir la relation dans la durée',
  objections: 'accueillir et traiter une objection sans se braquer',
  conclusion: 'conclure, demander la décision, accueillir un partenaire',
  duplication: 'former un filleul, transmettre plutôt que faire à sa place',
  leadership: 'animer une équipe, faire grandir les autres',
  adaptation: "s'adapter au profil de l'interlocuteur (Big Al : rouge, bleu, jaune, vert)",
  organisation: 'tenir son agenda, noter, prioriser, ne rien laisser tomber',
}
const TRANSVERSALES = new Set(['adaptation', 'organisation'])
/** Des mots qui ne désignent rien du métier : ils ne doivent jamais classer. */
const CREUX = new Set([
  'gestion', 'tenir', 'faire', 'creer', 'demander', 'accueillir', 'construire',
  'poser', 'animer', 'prioriser', 'noter', 'transmettre', 'capacite', 'premieres',
  'heures', 'plutot', 'place', 'sans', 'avec', 'autres', 'presenter', 'raconter',
  'adapter', 'relancer', 'traiter', 'former', 'grandir', 'decrocher', 'laisser',
  'rien', 'duree', 'impact', 'simplicite', 'precise', 'nature',
])
/**
 * Les mots de chaque définition qui ont le droit de classer : ni creux, ni
 * partagés par deux définitions — un mot qui désigne deux compétences ne
 * désigne aucune.
 */
const motsDiscriminants = (() => {
  const brut = new Map()
  for (const [id, def] of Object.entries(DEFINITIONS))
    for (const m of motsPleins(def)) if (!CREUX.has(m)) {
      const lot = brut.get(m) ?? []
      lot.push(id)
      brut.set(m, lot)
    }
  const parCompetence = new Map(Object.keys(DEFINITIONS).map((id) => [id, new Set()]))
  for (const [m, ids] of brut) if (ids.length === 1) parCompetence.get(ids[0]).add(m)
  return parCompetence
})()
// 🔴 Contrôles positifs sur les trois cas que cette règle doit attraper, et sur
// celui qu'elle doit REFUSER. Sans eux, une liste de mots creux trop large
// rendrait « 0 rattrapage » et passerait pour de la prudence.
const classeParDefinition = (texte) => {
  const mots = motsPleins(texte)
  const scores = [...motsDiscriminants.entries()]
    .map(([id, discr]) => [id, [...mots].filter((m) => discr.has(m)).length])
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
  if (!scores.length) return null
  if (scores.length > 1 && scores[1][1] === scores[0][1]) return null // ex æquo : on ne tranche pas
  return scores[0][0]
}
for (const [texte, attendu] of [
  ['objection pyramide', 'objections'],
  ['interprétation du refus', 'etat-esprit'],
  ['ton et energie prospect bleu', 'adaptation'],
  ['gestion pression prospect en appel', null],
  ['rue', null],
]) {
  const got = classeParDefinition(texte)
  if (got !== attendu)
    throw new Error(`classeParDefinition(« ${texte} ») = ${got}, attendu ${attendu}`)
}

const blocages = await db.atlasFact.findMany({
  where: { predicate: 'bloque_sur', status: 'active', contactId: null },
  select: {
    id: true, userId: true, object: true, category: true,
    competenceId: true, transversaleId: true, supportCount: true, lastSeenAt: true,
  },
})
const orphelins = blocages.filter((f) => !f.competenceId && !f.transversaleId)
const parents = blocages.filter((f) => f.competenceId || f.transversaleId)
const jours = (d) => Math.floor((Date.now() - d.getTime()) / 86_400_000)

console.log(`${blocages.length} blocages actifs · ${orphelins.length} sans aucun axe · seuil d'héritage ${SEUIL}\n`)

const plan = []
for (const o of orphelins) {
  const mots = motsPleins(o.object)
  const classe = parents
    .filter((p) => p.userId === o.userId)
    .map((p) => ({ p, s: ressemblance(mots, motsPleins(p.object)) }))
    .sort((a, b) => b.s - a.s)
  const premier = classe[0]
  const second = classe[1]
  console.log(`« ${o.object} »  vu ${o.supportCount}×`)

  // ① D'ABORD LE RÉFÉRENTIEL : c'est la source la plus autoritaire, et elle ne
  //    dépend pas de ce que le compte contient déjà.
  const parDefinition = classeParDefinition(o.object)
  if (parDefinition) {
    const transversale = TRANSVERSALES.has(parDefinition)
    plan.push({
      orphelin: o,
      parent: {
        competenceId: transversale ? null : parDefinition,
        transversaleId: transversale ? parDefinition : null,
        object: `définition de « ${parDefinition} »`,
      },
      score: 1,
      via: 'définition',
    })
    console.log(`   → ${parDefinition}${transversale ? ' (transversale)' : ''}, par le MOT de sa définition\n`)
    continue
  }

  // ② À DÉFAUT, un blocage voisin déjà slugué.
  if (!premier || premier.s === 0) {
    console.log('   aucun parent, et aucun mot du référentiel : la case reste vide\n')
    continue
  }
  for (const { p, s } of classe.slice(0, 3))
    console.log(`   ${s.toFixed(2)}  ${(p.competenceId ?? p.transversaleId)}${p.transversaleId ? ' (transversale)' : ''}  ← « ${p.object.slice(0, 44)} »`)
  // ⚠️ UN PARENT DOIT DOMINER. Deux candidats au même score sur deux
  // compétences différentes, c'est une ambiguïté : on ne tranche pas à la
  // place de personne.
  const ambigu =
    second &&
    second.s === premier.s &&
    (second.p.competenceId ?? second.p.transversaleId) !== (premier.p.competenceId ?? premier.p.transversaleId)
  if (premier.s < SEUIL) console.log(`   → sous le seuil, la case reste vide\n`)
  else if (ambigu) console.log(`   → deux parents à ${premier.s.toFixed(2)} sur deux compétences : on ne tranche pas\n`)
  else {
    plan.push({ orphelin: o, parent: premier.p, score: premier.s })
    console.log(`   → hérite ${premier.p.transversaleId ? 'transversale ' : ''}${premier.p.competenceId ?? premier.p.transversaleId}\n`)
  }
}

console.log(`${plan.length} rattrapage(s) sur ${orphelins.length} orphelin(s)`)

// ── CE QUE ÇA CHANGE AUX NIVEAUX ──────────────────────────────────────────
if (plan.length) {
  console.log('\nNIVEAU OBSERVÉ, AVANT → APRÈS (le max par compétence décide)')
  const parSlug = new Map()
  for (const f of blocages) {
    const id = f.competenceId ?? f.transversaleId
    if (!id) continue
    const e = parSlug.get(id) ?? []
    e.push(f)
    parSlug.set(id, e)
  }
  const touchees = new Set(plan.map((p) => p.parent.competenceId ?? p.parent.transversaleId))
  for (const id of touchees) {
    const avant = parSlug.get(id) ?? []
    const apres = [...avant, ...plan.filter((p) => (p.parent.competenceId ?? p.parent.transversaleId) === id).map((p) => p.orphelin)]
    const pire = (lot) => {
      const max = lot.reduce((a, b) => (b.supportCount > a.supportCount ? b : a))
      return niveauObserve(max.supportCount, jours(max.lastSeenAt))
    }
    const a = pire(avant)
    const b = pire(apres)
    console.log(`   ${id.padEnd(15)} ${a} → ${b}${a === b ? '   (inchangé)' : '   ⚠️ CHANGE'}`)
  }
}

if (!appliquer) {
  console.log('\nMODE SEC — rien n’a été écrit. Ajouter --appliquer pour écrire.')
  await db.$disconnect()
  process.exit(0)
}

const quand = new Date().toISOString().replace(/[:.]/g, '-')
const chemin = `/opt/atline/data/faits-rattrapage-slug-${quand}.json`
try {
  writeFileSync(chemin, JSON.stringify({ quand, seuil: SEUIL, plan }, null, 2))
} catch (e) {
  console.error(`✗ trace impossible à écrire (${chemin}) : ${e.message}`)
  console.error('  On n’écrit pas sans trace. Rien n’a été modifié.')
  await db.$disconnect()
  process.exit(1)
}
console.log(`\ntrace écrite : ${chemin}`)

for (const p of plan) {
  await db.atlasFact.update({
    where: { id: p.orphelin.id },
    data: p.parent.transversaleId
      ? { transversaleId: p.parent.transversaleId }
      : { competenceId: p.parent.competenceId },
  })
}
console.log(`✓ ${plan.length} blocage(s) rattrapé(s).`)
await db.$disconnect()
