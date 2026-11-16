#!/usr/bin/env node
/**
 * FUSIONNER LES FAITS QUI DISENT DÉJÀ LA MÊME CHOSE.
 *
 *   node scripts/faits-fusionner.mjs <email>              # montre, n'écrit RIEN
 *   node scripts/faits-fusionner.mjs <email> --appliquer  # écrit
 *
 * ── CE QUE ÇA RÉPARE ──────────────────────────────────────────────────────
 *
 * Jusqu'au 16 novembre 2026, `meilleurCandidat` bornait sa recherche à la
 * catégorie : deux faits au texte identique rangés ailleurs ne se rencontraient
 * jamais. Le périmètre est corrigé, mais les lignes déjà créées restent, et
 * elles coûtent deux fois — elles occupent **deux** des douze places du
 * contexte d'Atlas, et leur compteur est coupé en deux, donc elles sont moins
 * bien classées que la réalité.
 *
 *     démotivé  [emotion] vu 5×  +  démotivé [situation] vu 3×   →  vu 8×
 *
 * ── 🔴 LES GARDES, ET POURQUOI CHACUN EXISTE ──────────────────────────────
 *
 * ① **JAMAIS DE `DELETE`.** La ligne absorbée passe `superseded` et pointe vers
 *    celle qui reste. C'est la règle de la maison, et c'est ce qui rend la
 *    fusion réversible à la main.
 * ② **UNE TRACE AVANT TOUTE ÉCRITURE**, horodatée. 🔴 Le 15 novembre, une sonde
 *    qui écrivait sa propre trace l'a écrasée quand je l'ai rejouée pour
 *    vérifier : il a fallu la sauvegarde. Ici l'horodatage est dans le nom, donc
 *    rejouer n'écrase rien, et le script REFUSE de partir s'il ne peut pas
 *    écrire la trace.
 * ③ **ON NE FUSIONNE QUE CE QUE LA PRODUCTION FUSIONNERAIT SANS ARBITRE**, soit
 *    au-dessus de `CERTITUDE`. En dessous, il faut un jugement — ça ne se
 *    rattrape pas en masse.
 * ④ **DEUX COMPÉTENCES DIFFÉRENTES NE FUSIONNENT PAS**, même à texte identique :
 *    le slug est la clé la plus forte de la mémoire, et l'écraser mélangerait
 *    deux sujets d'entraînement.
 * ⑤ **LE `createdAt` LE PLUS ANCIEN GAGNE** : c'est « depuis quand ça coince »,
 *    et c'est la chose que les chaînes de supersession effaçaient.
 * ⑥ **MODE SEC PAR DÉFAUT.** Il faut écrire `--appliquer` pour que ça écrive.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const ici = dirname(fileURLToPath(import.meta.url))
const racine = join(ici, '..')
const require = createRequire(import.meta.url)

const email = process.argv[2]
const appliquer = process.argv.includes('--appliquer')
if (!email || email.startsWith('--')) {
  console.error('usage : node scripts/faits-fusionner.mjs <email> [--appliquer]')
  process.exit(1)
}

// ── Le code de production, découpé dans sa source (voir faits-doublons.mjs) ──
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
].join('\n')
const CERTITUDE = Number(source.match(/export const CERTITUDE = ([\d.]+)/)?.[1])
if (!CERTITUDE) throw new Error('CERTITUDE introuvable')
const { motsPleins, ressemblance } = eval(
  '(() => { ' + outils + '\n return { motsPleins, ressemblance } })()',
)
// 🔴 Contrôle positif : prouver l'outil avant de s'en servir pour écrire.
if (ressemblance(motsPleins('relance de mélanie'), motsPleins('relance melanie')) < 0.99)
  throw new Error('les outils découpés ne reconnaissent pas un doublon évident')

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

// ⚠️ L'e-mail et `findUniqueOrThrow` : cinq comptes de cette base donnent « PH »
// en initiales. Un `findFirst` écrirait chez quelqu'un d'autre — déjà payé.
const u = await db.user.findUniqueOrThrow({ where: { email }, select: { id: true } })

const actifs = await db.atlasFact.findMany({
  where: { userId: u.id, contactId: null, status: 'active' },
  select: {
    id: true, predicate: true, object: true, category: true, competenceId: true,
    supportCount: true, confidence: true, importance: true, source: true,
    createdAt: true, lastSeenAt: true,
  },
})
const mots = new Map(actifs.map((f) => [f.id, motsPleins(f.object)]))

// ── Les GROUPES, pas les paires ────────────────────────────────────────────
//
// ⚠️ Trois lignes qui se ressemblent deux à deux forment UN groupe, pas deux
// paires. Traiter des paires laisserait un doublon résiduel au milieu, et la
// seconde passe en créerait un nouveau en voulant le réparer.
const parent = new Map(actifs.map((f) => [f.id, f.id]))
const chef = (x) => (parent.get(x) === x ? x : (parent.set(x, chef(parent.get(x))), parent.get(x)))
const unir = (x, y) => parent.set(chef(x), chef(y))

const refus = []
for (let i = 0; i < actifs.length; i++)
  for (let j = i + 1; j < actifs.length; j++) {
    const a = actifs[i]
    const b = actifs[j]
    if (a.predicate !== b.predicate) continue
    if (ressemblance(mots.get(a.id), mots.get(b.id)) < CERTITUDE) continue
    // ④ Deux compétences DIFFÉRENTES : on n'y touche pas, et on le DIT.
    if (a.competenceId && b.competenceId && a.competenceId !== b.competenceId) {
      refus.push({ a, b, pourquoi: `deux compétences : ${a.competenceId} ≠ ${b.competenceId}` })
      continue
    }
    unir(a.id, b.id)
  }

const groupes = new Map()
for (const f of actifs) {
  const c = chef(f.id)
  const lot = groupes.get(c) ?? []
  lot.push(f)
  groupes.set(c, lot)
}
const aFusionner = [...groupes.values()].filter((l) => l.length > 1)

console.log(`compte : ${email} · ${actifs.length} faits actifs · CERTITUDE=${CERTITUDE}`)
console.log(`${aFusionner.length} groupe(s) à fusionner, ${aFusionner.reduce((n, l) => n + l.length - 1, 0)} ligne(s) absorbée(s)`)
if (refus.length) {
  console.log(`\n⚠️ ${refus.length} paire(s) laissée(s) de côté :`)
  for (const r of refus) console.log(`   ${r.a.object.slice(0, 40)} / ${r.b.object.slice(0, 40)} — ${r.pourquoi}`)
}

/** Qui reste : le mieux établi, puis le plus ancien. */
const elire = (lot) =>
  [...lot].sort(
    (a, b) => b.supportCount - a.supportCount || a.createdAt.getTime() - b.createdAt.getTime(),
  )[0]

const plan = aFusionner.map((lot) => {
  const garde = elire(lot)
  const absorbes = lot.filter((f) => f.id !== garde.id)
  return {
    garde,
    absorbes,
    nouveau: {
      // On garde le libellé le PLUS COURT : c'est la convention de
      // `reconcileFacts`, qui prend le plus court comme forme canonique.
      object: [...lot].sort((a, b) => a.object.length - b.object.length)[0].object,
      supportCount: lot.reduce((n, f) => n + f.supportCount, 0),
      createdAt: new Date(Math.min(...lot.map((f) => f.createdAt.getTime()))),
      lastSeenAt: new Date(Math.max(...lot.map((f) => f.lastSeenAt.getTime()))),
      importance: Math.max(...lot.map((f) => f.importance)),
      confidence: Math.min(Math.max(...lot.map((f) => f.confidence)), 0.99),
      competenceId: lot.find((f) => f.competenceId)?.competenceId ?? null,
    },
  }
})

for (const p of plan) {
  console.log(`\n   ${p.garde.predicate} → « ${p.nouveau.object} »  vu ${p.nouveau.supportCount}×  depuis ${p.nouveau.createdAt.toISOString().slice(0, 10)}`)
  for (const f of [p.garde, ...p.absorbes])
    console.log(
      `      ${f.id === p.garde.id ? 'GARDE   ' : 'absorbé '} [${f.category}${f.competenceId ? '/' + f.competenceId : ''}] vu ${f.supportCount}× : ${f.object.slice(0, 48)}`,
    )
}

if (!appliquer) {
  console.log('\nMODE SEC — rien n’a été écrit. Ajouter --appliquer pour écrire.')
  await db.$disconnect()
  process.exit(0)
}

// ── ② LA TRACE, AVANT TOUTE ÉCRITURE ──────────────────────────────────────
const quand = new Date().toISOString().replace(/[:.]/g, '-')
const chemin = `/opt/atline/data/faits-fusion-${email.replace(/[^a-z0-9]/gi, '_')}-${quand}.json`
try {
  writeFileSync(
    chemin,
    JSON.stringify({ email, quand, certitude: CERTITUDE, groupes: aFusionner, plan }, null, 2),
  )
} catch (e) {
  console.error(`✗ trace impossible à écrire (${chemin}) : ${e.message}`)
  console.error('  On n’écrit pas sans trace. Rien n’a été modifié.')
  await db.$disconnect()
  process.exit(1)
}
console.log(`\ntrace écrite : ${chemin}`)

let fusionnes = 0
for (const p of plan) {
  // Une transaction par groupe : un groupe en échec n'en laisse pas un autre
  // à moitié fusionné.
  await db.$transaction([
    db.atlasFact.update({ where: { id: p.garde.id }, data: p.nouveau }),
    ...p.absorbes.map((f) =>
      db.atlasFact.update({
        where: { id: f.id },
        // ① JAMAIS DE DELETE : elle reste, et elle dit qui l'a absorbée.
        data: { status: 'superseded', supersededById: p.garde.id },
      }),
    ),
  ])
  fusionnes++
}
console.log(`✓ ${fusionnes} groupe(s) fusionné(s). Vérifier avec : node scripts/faits-doublons.mjs ${email}`)
await db.$disconnect()
