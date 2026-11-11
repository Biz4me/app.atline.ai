#!/usr/bin/env node
/**
 * QUELLES TABLES SONT DÉCLARÉES SANS QUE RIEN NE LES REMPLISSE ?
 *
 *   node scripts/tables-sans-ecriture.mjs          # sur le serveur
 *   node scripts/tables-sans-ecriture.mjs /chemin/depot1 /chemin/depot2 …
 *
 * ── 🔴 CE QUI L'A FAIT NAÎTRE (11 novembre 2026) ──────────────────────────
 *
 * `AtlasReport` était déclarée depuis juillet et n'avait **jamais porté une
 * ligne**. En cherchant pourquoi, on a compté : **60 tables vides sur 100**.
 * La plupart le sont légitimement — Stripe, le forum, le support : des
 * fonctions pas encore ouvertes. Mais le tri a sorti une famille qu'on ne
 * cherchait pas.
 *
 * ── LES TROIS FAMILLES, ET UNE SEULE EST GRAVE ────────────────────────────
 *
 *   ① **jamais touchée par Prisma** (44) — une déclaration, rien de plus.
 *      Sans gravité en soi, sauf qu'elle fait croire qu'une fonction existe.
 *      ⚠️ Quatre d'entre elles sont STRUCTURELLES : `Session`,
 *      `VerificationToken`, `PasswordResetToken` et `Account` appartiennent à
 *      l'adaptateur NextAuth, qui les écrit lui-même. `Session` est vide
 *      parce que les sessions sont en JWT, pas en base. Les supprimer
 *      casserait l'authentification.
 *
 *   ② 🔴 **LUE MAIS JAMAIS ÉCRITE** (10) — la seule famille dangereuse. Du
 *      code interroge une table que rien ne remplit. **Ça ne plante pas :**
 *      ça rend 0, ou `null`, et l'écran affiche le zéro comme s'il était
 *      mesuré. Relevé ce jour-là, sur des écrans réellement consultés :
 *        · admin, vue d'ensemble → « placements en attente », « tickets
 *          ouverts » : deux tuiles qui ne peuvent rien dire d'autre que 0 ;
 *        · V1, tableau de bord → « certificats », « leads » : pareil.
 *      🧭 **Un compteur qui ne peut pas bouger n'est pas une mesure, c'est un
 *      décor qui a l'air d'une mesure.** C'est pire qu'une absence : une
 *      absence se voit.
 *
 *   ③ **écrite quelque part, mais encore vide** (6) — une fonction construite
 *      et jamais exercée. C'est de l'attente, pas une faute.
 *
 * ⚠️ IL CHERCHE L'ACCÈS PRISMA, PAS LE NOM DU MODÈLE. Première version :
 * `\bNomDuModele\b` dans tout le code. Elle a rendu « Session citée dans 60
 * fichiers » et « Conversation dans 33 » — des mots courants, pas des accès.
 * On ne reconnaît une table qu'à `prisma.x.` / `db.x.` / `tx.x.`.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, extname } from 'node:path'

const DEPOTS_PAR_DEFAUT = [
  '/opt/atline/atline-app',
  '/opt/atline/atline-v2',
  '/opt/atline/atline-admin',
  '/opt/atline/apps/atline-ai-service',
]
const EXCLURE = new Set([
  'node_modules', '.next', '.git', 'worktrees', 'dist',
  '.venv', '__pycache__', 'migrations', '.claude',
])
const EXT = new Set(['.ts', '.tsx', '.js', '.cjs', '.mjs', '.py'])
const ECRITURES = ['create', 'createMany', 'upsert', 'update', 'updateMany', 'delete', 'deleteMany']

/** Celles que NextAuth écrit lui-même : les signaler serait un faux positif. */
const STRUCTURELLES = new Set(['Session', 'VerificationToken', 'PasswordResetToken', 'Account'])

const depots = process.argv.slice(2).length ? process.argv.slice(2) : DEPOTS_PAR_DEFAUT

// ── 1. les modèles déclarés ──
const schema = ['prisma/schema.prisma', '../atline-app/prisma/schema.prisma']
  .map((p) => join(depots[0], p))
  .find(existsSync)
if (!schema) {
  console.error('schema.prisma introuvable depuis', depots[0])
  process.exit(2)
}
const modeles = [...readFileSync(schema, 'utf8').matchAll(/^model\s+(\w+)\s*\{/gm)].map((m) => m[1])

// ── 2. le corpus de code ──
const corpus = []
const parcourir = (d) => {
  let entrees
  try {
    entrees = readdirSync(d)
  } catch {
    return
  }
  for (const e of entrees) {
    if (EXCLURE.has(e)) continue
    const p = join(d, e)
    let s
    try {
      s = statSync(p)
    } catch {
      continue
    }
    if (s.isDirectory()) parcourir(p)
    else if (EXT.has(extname(e))) {
      try {
        corpus.push(readFileSync(p, 'utf8'))
      } catch {
        /* illisible : on passe */
      }
    }
  }
}
depots.filter(existsSync).forEach(parcourir)
if (!corpus.length) {
  console.error('aucun fichier de code trouvé — mauvais chemins ?')
  process.exit(2)
}

// ── 3. les lignes en base ──
let url = process.env.DATABASE_URL
if (!url) {
  const env = join(depots[0], '.env.local')
  if (existsSync(env)) url = readFileSync(env, 'utf8').match(/^DATABASE_URL=(.*)$/m)?.[1]
}
if (!url) {
  console.error('DATABASE_URL introuvable')
  process.exit(2)
}
url = url.trim().replace(/^["']|["']$/g, '').split('?')[0]

// ⚠️ `count(*)`, PAS `reltuples`. Une table jamais analysée rend **−1**, et
// le premier relevé de ce chantier a failli conclure « vide » sur des tables
// qui portaient des milliers de lignes.
const sql = `SELECT c.relname, (xpath('/row/cnt/text()',
  query_to_xml(format('select count(*) as cnt from %I.%I', n.nspname, c.relname),
  false, true, '')))[1]::text::bigint
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind='r';`
const lignes = new Map(
  execFileSync('psql', [url, '-t', '-A', '-F', '|', '-c', sql], { encoding: 'utf8' })
    .trim()
    .split('\n')
    .map((l) => l.split('|'))
    .map(([t, n]) => [t, Number(n)]),
)

// ── 4. le tri ──
const jamais = []
const lue = []
const ecrite = []
for (const m of modeles) {
  if (lignes.get(m) !== 0) continue
  const acc = m[0].toLowerCase() + m.slice(1)
  const re = new RegExp(`(?:prisma|db|tx|client)\\.${acc}\\.(\\w+)`, 'g')
  const verbes = new Set()
  for (const t of corpus) for (const v of t.matchAll(re)) verbes.add(v[1])
  if (!verbes.size) jamais.push(m)
  else if (ECRITURES.some((v) => verbes.has(v))) ecrite.push(m)
  else lue.push(`${m} (${[...verbes].join(', ')})`)
}

const vides = modeles.filter((m) => lignes.get(m) === 0).length
console.log(`${modeles.length} modèles · ${vides} tables vides · ${corpus.length} fichiers de code\n`)
console.log(`① jamais touchée par Prisma (${jamais.length})`)
console.log(
  '   ' +
    jamais
      .map((m) => (STRUCTURELLES.has(m) ? `${m}[NextAuth]` : m))
      .join(' ') +
    '\n',
)
console.log(`③ écrite quelque part, encore vide (${ecrite.length})`)
console.log('   ' + ecrite.join(' ') + '\n')
console.log(`② 🔴 LUE MAIS JAMAIS ÉCRITE (${lue.length}) — un zéro qui a l'air mesuré`)
for (const l of lue) console.log('   ' + l)

// 🧭 Seule la famille ② fait échouer : les deux autres sont des constats, pas
// des défauts, et un script qui crie pour tout ne se relit plus.
process.exit(lue.length ? 1 : 0)
