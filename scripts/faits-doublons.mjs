#!/usr/bin/env node
/**
 * LA MÉMOIRE D'ATLAS GARDE-T-ELLE DEUX FOIS LA MÊME CHOSE ?
 *
 *   node scripts/faits-doublons.mjs <email>        # sur le serveur
 *
 * ── 🔴 POURQUOI ELLE EXISTE (16 novembre 2026) ────────────────────────────
 *
 * Deux faits au texte identique rangés dans deux CATÉGORIES différentes ne se
 * rencontraient jamais : `meilleurCandidat` bornait sa recherche à la catégorie.
 * Mesuré sur 725 faits actifs d'un vrai compte :
 *
 *     relancer mélanie               [projet]            vu 2×
 *     relancer mélanie               [decision/suivi]    vu 1×   ← 1,00
 *     démotivé                       [emotion]           vu 5×
 *     démotivé                       [situation]         vu 3×   ← 1,00
 *     adaptation profil big al bleu  [projet/adaptation] vu 92×
 *     adaptation ton profil bleu     [competence]        vu 1×   ← 0,60
 *
 * Le dernier est le plus coûteux : une observation isolée face à une ligne vue
 * 92 fois, et les deux se disputent les **douze** places du contexte d'Atlas.
 *
 * ⚠️ CE N'ÉTAIT PAS LA NORMALISATION DU TEXTE. `motsPleins` donne déjà 1,00
 * entre « relance de mélanie » et « relance melanie ». Et la supersession en
 * double est morte avec le correctif du 23 octobre : **1 230 supersessions
 * avant, dont 51 % de doublons ; 50 après, dont 0.** Le défaut restant était le
 * PÉRIMÈTRE de la recherche, pas le nettoyage.
 *
 * ── 🧭 ELLE EXÉCUTE LE CODE DE PRODUCTION, PAS UNE COPIE ──────────────────
 *
 * `motsPleins`, `ressemblance` et `normalizeObject` sont découpés dans
 * `lib/atlas-memory.ts` et évalués. Une copie dériverait, et la sonde mesurerait
 * alors autre chose que la production. **Si un bloc manque, elle s'arrête** au
 * lieu de deviner — et elle prouve ses outils sur un doublon évident avant de
 * compter quoi que ce soit.
 *
 * 🔴 ELLE N'ÉCRIT RIEN. Que des lectures.
 */
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const ici = dirname(fileURLToPath(import.meta.url))
const racine = join(ici, '..')
const require = createRequire(import.meta.url)

const email = process.argv[2]
if (!email) {
  console.error('usage : node scripts/faits-doublons.mjs <email>')
  process.exit(1)
}

// ── Le code de production, découpé dans sa source ──────────────────────────
const source = readFileSync(join(racine, 'lib/atlas-memory.ts'), 'utf8')
const bloc = (debut, fin) => {
  const i = source.indexOf(debut)
  if (i < 0) throw new Error('bloc introuvable dans lib/atlas-memory.ts : ' + debut)
  const j = source.indexOf(fin, i)
  if (j < 0) throw new Error('fin de bloc introuvable : ' + fin)
  return source.slice(i, j + fin.length)
}
const outils = [
  bloc('const MOTS_VIDES = new Set([', '])'),
  bloc('export function motsPleins', '\n}')
    .replace('export function', 'function')
    .replace('(s: string): Set<string>', '(s)'),
  bloc('export function ressemblance', '\n}')
    .replace('export function', 'function')
    .replace('(a: Set<string>, b: Set<string>): number', '(a, b)'),
  bloc('export function normalizeObject', '\n}')
    .replace('export function', 'function')
    .replace('(raw: string): string', '(raw)'),
].join('\n')

const CERTITUDE = Number(source.match(/export const CERTITUDE = ([\d.]+)/)?.[1])
const PLANCHER = Number(source.match(/const PLANCHER_APPARIEMENT = ([\d.]+)/)?.[1])
const STABLES = new Set(
  (bloc('const STABLE_CATEGORIES = new Set([', '])').match(/'([a-z_]+)'/g) ?? []).map((s) =>
    s.slice(1, -1),
  ),
)
if (!CERTITUDE || !PLANCHER || !STABLES.size) throw new Error('seuils ou catégories stables introuvables')

const { motsPleins, ressemblance, normalizeObject } = eval(
  '(() => { ' + outils + '\n return { motsPleins, ressemblance, normalizeObject } })()',
)

// 🔴 CONTRÔLES POSITIFS. Sans eux, un découpage raté rendrait « 0 doublon » et
// passerait pour une bonne nouvelle — la faute du « coût nul » du 11 novembre.
if (ressemblance(motsPleins('relance de mélanie'), motsPleins('relance melanie')) < 0.99)
  throw new Error('les outils découpés ne reconnaissent pas un doublon évident')
if (normalizeObject('  Relance  DE Mélanie ') !== 'relance de mélanie')
  throw new Error('normalizeObject découpé défaillant')

// ── La base ────────────────────────────────────────────────────────────────
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

// ⚠️ `findUniqueOrThrow` SUR L'E-MAIL : la base porte cinq comptes dont les
// initiales donnent « PH ». Un `findFirst` désignerait une ligne différente
// à chaque appel — déjà payé.
const u = await db.user.findUniqueOrThrow({ where: { email }, select: { id: true } })

console.log(`outils de production chargés · CERTITUDE=${CERTITUDE} · PLANCHER=${PLANCHER}`)
console.log(`compte : ${email}\n`)

// ── ① LE FLUX : les supersessions qui étaient des doublons ────────────────
const anciens = await db.atlasFact.findMany({
  where: { userId: u.id, supersededById: { not: null } },
  select: { object: true, supersededById: true },
})
const nouveaux = new Map(
  (
    await db.atlasFact.findMany({
      where: { userId: u.id, id: { in: anciens.map((a) => a.supersededById) } },
      select: { id: true, object: true, createdAt: true },
    })
  ).map((f) => [f.id, f]),
)
const CORRECTIF = Date.parse('2026-10-23T00:00:00Z')
const tranches = { 'avant le 23 oct': { t: 0, d: 0 }, 'depuis': { t: 0, d: 0 } }
for (const a of anciens) {
  const n = nouveaux.get(a.supersededById)
  if (!n) continue
  const e = n.createdAt.getTime() < CORRECTIF ? tranches['avant le 23 oct'] : tranches['depuis']
  e.t++
  if (ressemblance(motsPleins(a.object), motsPleins(n.object)) >= CERTITUDE) e.d++
}
// ⚠️ LA TRANCHE SE LIT SUR LE `createdAt` DU FAIT QUI RESTE, et une fusion
// faite à la main par `faits-fusionner.mjs` garde le createdAt le PLUS ANCIEN
// du groupe. Les 13 fusions du 16 novembre comptent donc dans « avant le
// 23 oct » : c'est la date des FAITS, pas celle du rattrapage. Sans cette
// note, on croirait que la production a créé ces doublons ce jour-là.
console.log('① SUPERSESSIONS — combien étaient des doublons')
for (const [nom, e] of Object.entries(tranches))
  console.log(
    `   ${nom.padEnd(16)} ${String(e.t).padStart(5)} supersessions · ${String(e.d).padStart(4)} doublons (${e.t ? Math.round((e.d / e.t) * 100) : 0} %)`,
  )

// ── ② LE STOCK VIVANT : des faits ACTIFS qui disent la même chose ─────────
const actifs = await db.atlasFact.findMany({
  where: { userId: u.id, contactId: null, status: 'active' },
  select: {
    id: true, predicate: true, object: true, category: true,
    competenceId: true, supportCount: true, lastSeenAt: true,
  },
})
const mots = new Map(actifs.map((f) => [f.id, motsPleins(f.object)]))

const paires = []
for (let i = 0; i < actifs.length; i++)
  for (let j = i + 1; j < actifs.length; j++) {
    if (actifs[i].predicate !== actifs[j].predicate) continue
    const s = ressemblance(mots.get(actifs[i].id), mots.get(actifs[j].id))
    if (s >= CERTITUDE) paires.push({ s, a: actifs[i], b: actifs[j] })
  }
console.log(
  `\n② STOCK VIVANT — ${paires.length} paire(s) de faits actifs au-dessus de ${CERTITUDE}, sur ${actifs.length} actifs`,
)
for (const p of paires.sort((x, y) => y.s - x.s).slice(0, 15)) {
  console.log(`   ${p.s.toFixed(2)}  ${p.a.predicate}`)
  console.log(`      [${p.a.category}] vu ${p.a.supportCount}× : ${p.a.object.slice(0, 50)}`)
  console.log(`      [${p.b.category}] vu ${p.b.supportCount}× : ${p.b.object.slice(0, 50)}`)
}

// ── ③ CE QUE LA CLÉ DE RECHERCHE RAPPROCHE, ET CE QU'ELLE MANQUE ──────────
//
// 🔴 C'EST LE CONTRÔLE QUI GARDE LE CORRECTIF. On rejoue l'appariement des
// deux façons : bornée à la catégorie (l'ancienne) et bornée au prédicat seul
// (celle de production depuis le 16 novembre). La seconde doit réunir
// strictement plus, et ne JAMAIS faire passer un fait à « créer ».
const branche = (fait, cible, score, categorie, competenceId) => {
  if (!fait) return 'créer'
  if (normalizeObject(fait.object) === normalizeObject(cible)) return 'confirmer'
  if (score >= CERTITUDE) return 'confirmer'
  if (score >= PLANCHER) return 'arbitre'
  if (!competenceId && STABLES.has(categorie)) return 'remplacer'
  return 'créer'
}
const choisir = (f, avecCategorie) => {
  const pool = actifs.filter(
    (c) =>
      c.id !== f.id &&
      c.predicate === f.predicate &&
      (f.competenceId
        ? c.competenceId === f.competenceId
        : avecCategorie
          ? c.category === f.category
          : true),
  )
  if (!pool.length) return { fait: null, score: -1 }
  let meilleur = pool[0]
  let score = -1
  for (const c of pool) {
    const s = ressemblance(mots.get(f.id), mots.get(c.id))
    if (s > score) { score = s; meilleur = c }
  }
  if (score >= PLANCHER) return { fait: meilleur, score }
  if (!f.competenceId && STABLES.has(f.category)) {
    const memeCat = pool.filter((c) => c.category === f.category)
    if (memeCat.length)
      return { fait: memeCat.reduce((a, b) => (a.lastSeenAt > b.lastSeenAt ? a : b)), score: 0 }
  }
  return { fait: null, score: -1 }
}

const compte = { avant: {}, apres: {} }
const change = []
for (const f of actifs) {
  const a = choisir(f, true)
  const n = choisir(f, false)
  const ba = branche(a.fait, f.object, a.score, f.category, f.competenceId)
  const bn = branche(n.fait, f.object, n.score, f.category, f.competenceId)
  compte.avant[ba] = (compte.avant[ba] ?? 0) + 1
  compte.apres[bn] = (compte.apres[bn] ?? 0) + 1
  if (ba !== bn) change.push({ f, ba, bn, n })
}
const ligne = (nom, c) =>
  `   ${nom.padEnd(8)} ` +
  ['confirmer', 'arbitre', 'remplacer', 'créer'].map((b) => `${b}=${String(c[b] ?? 0).padStart(4)}`).join(' · ')
console.log('\n③ LA BRANCHE QUE CHAQUE FAIT PRENDRAIT S’IL ÉTAIT RÉ-OBSERVÉ')
console.log(ligne('catégorie', compte.avant))
console.log(ligne('prédicat', compte.apres))

const versConfirmer = change.filter((g) => g.bn === 'confirmer')
const versCreer = change.filter((g) => g.bn === 'créer')
console.log(
  `\n   ${versConfirmer.length} réunion(s) gagnée(s) · ${change.filter((g) => g.bn === 'arbitre').length} jugement(s) de plus · ${versCreer.length} régression(s)`,
)
for (const g of versConfirmer.sort((x, y) => y.n.score - x.n.score).slice(0, 8)) {
  console.log(`   ${g.n.score.toFixed(2)}  ${g.f.predicate}  (${g.ba} → ${g.bn})`)
  console.log(`      [${g.f.category}] vu ${g.f.supportCount}× : ${g.f.object.slice(0, 50)}`)
  console.log(`      [${g.n.fait.category}] vu ${g.n.fait.supportCount}× : ${g.n.fait.object.slice(0, 50)}`)
}

// 🔴 LE SEUL VERDICT QUI COMPTE : aucune régression. Un code de sortie, pas une
// phrase — on lit le code, pas un mot dans la sortie.
if (versCreer.length) {
  console.error(`\n✗ ${versCreer.length} fait(s) passeraient à « créer » : la clé élargie régresse.`)
  for (const g of versCreer.slice(0, 5))
    console.error(`   ${g.f.predicate} [${g.f.category}] : ${g.f.object.slice(0, 50)}`)
  await db.$disconnect()
  process.exit(1)
}
console.log('\n✓ Aucune régression : la clé élargie ne crée jamais là où l’ancienne réunissait.')
await db.$disconnect()
