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
 * ⚠️ SON ANGLE MORT, DIT EN TOUTES LETTRES : il ne voit que `prisma.x.verbe`.
 * Un comptage par RELATION — `include: { _count: { select: { leads: true } } }`
 * — lui échappe complètement, et c'est exactement sous cette forme que la page
 * Nova lisait `Lead`. Le jour où un écran n'affiche QUE des comptes de
 * relation sur une table vide, ce garde ne dira rien. Le savoir vaut mieux que
 * de le croire complet.
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
/**
 * ── ⚠️ CE QU'ON NE LIT PAS, ET POURQUOI CHAQUE LIGNE A ÉTÉ PAYÉE ─────────
 *
 * · `venv` SANS POINT : le service IA porte son environnement Python là, et
 *   l'oublier faisait lire **36 000 fichiers au lieu de 1 600**, sympy
 *   compris — le garde y perdait l'essentiel de son temps ;
 * · 🔴 `.next-old` ET `.next-new`, pas seulement `.next`. L'échange atomique
 *   du déploiement LAISSE le build précédent sur le disque, et le script y
 *   lisait du code compilé : il a signalé `Certificate` comme encore lue
 *   **une heure après qu'on l'ait retirée de la source**. 🧭 Un outil qui
 *   lit le passé rend un verdict sur le passé.
 */
const EXCLURE = new Set([
  'node_modules', '.git', 'worktrees', 'dist',
  'venv', '.venv', '__pycache__', 'migrations', '.claude', 'site-packages',
])
const ignorer = (nom) => EXCLURE.has(nom) || nom.startsWith('.next')
const EXT = new Set(['.ts', '.tsx', '.js', '.cjs', '.mjs', '.py'])
const ECRITURES = ['create', 'createMany', 'upsert', 'update', 'updateMany', 'delete', 'deleteMany']

/** Celles que NextAuth écrit lui-même : les signaler serait un faux positif. */
const STRUCTURELLES = new Set(['Session', 'VerificationToken', 'PasswordResetToken', 'Account'])

/**
 * ── CE QUE CHAQUE LECTURE SANS ÉCRIVAIN ATTEND ───────────────────────────
 *
 * 🔴 UNE LIGNE ICI N'EST PAS UNE EXCUSE, C'EST UNE DETTE SIGNÉE. Le garde
 * plus bas exige que la famille ② soit EXACTEMENT cette liste : une table de
 * plus arrête le déploiement, une ligne qui ne correspond plus à rien aussi.
 * 🧭 On ne paie donc pas l'oubli, on paie l'explication — et c'est tout ce
 * qu'on veut.
 *
 * ⚠️ Les quatre du haut affichent leur zéro À L'ÉCRAN, les cinq du bas sont
 * des branches qui ne se déclenchent simplement jamais. Ce n'est pas la même
 * gravité : un zéro affiché se lit comme une mesure.
 */
const EN_ATTENTE = {
  // ✅ `Placement` et `SupportTicket` sont sortis d'ici le 11 novembre 2026 :
  // leurs deux tuiles de l'admin ne portent plus de chiffre, elles disent ce
  // qu'elles attendent. Les tables restent, les fonctions sont prévues.
  // ✅ `Lead` et `AtlineCommission` sont sortis d'ici le 11 novembre 2026 :
  // l'accueil n'annonce plus « 0 lead », les trois KPI de Nova et les deux
  // montants du parrainage rendent `null` et s'affichent « — ». Zéro est un
  // résultat, `null` dit qu'il n'y a pas de mécanisme.
  MlmBook:
    "plan du jour → la branche « lecture » ne peut jamais proposer un livre. La bibliothèque MLM n'a jamais été chargée (MlmProduct en a 19 121, MlmBook zéro). ⚠️ Dans un try/catch : muette à jamais.",
  UserBookInteraction: "plan du jour → suit MlmBook : sans livre, aucun livre lu.",
  PostAnalytics:
    "journal des agents → la branche « cliqué » ne peut jamais se déclencher. Rien ne remonte les statistiques d'un post.",
  ContentIdea: "fils proactifs → une proposition de contenu qui ne survient jamais.",
  ForumPost: "fils proactifs → un extrait de forum qui ne survient jamais ; le forum n'est pas ouvert.",
}

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
    if (ignorer(e)) continue
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
/**
 * ⚠️ UNE SEULE PASSE SUR LE CORPUS, PAS UNE PAR MODÈLE. La première version
 * lançait les 60 expressions sur chacun des 36 000 fichiers : **2,1 millions
 * d'exécutions, 30 secondes**. Beaucoup trop pour un garde qui s'exécute à
 * chaque déploiement — et 🧭 **un garde trop lent finit par être contourné**,
 * ce qui est la seule façon certaine de le rendre inutile. Ici on relève tous
 * les accès d'un coup, puis on interroge la table obtenue.
 */
const ACCES = /(?:prisma|db|tx|client)\.([a-z]\w*)\.(\w+)/g
const parAccesseur = new Map()
for (const t of corpus) {
  for (const [, acc, verbe] of t.matchAll(ACCES)) {
    let v = parAccesseur.get(acc)
    if (!v) parAccesseur.set(acc, (v = new Set()))
    v.add(verbe)
  }
}

const jamais = []
const lue = []
const ecrite = []
for (const m of modeles) {
  if (lignes.get(m) !== 0) continue
  const verbes = parAccesseur.get(m[0].toLowerCase() + m.slice(1)) ?? new Set()
  if (!verbes.size) jamais.push(m)
  else if (ECRITURES.some((v) => verbes.has(v))) ecrite.push(m)
  else lue.push({ m, verbes: [...verbes].join(', ') })
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
for (const l of lue) console.log(`   ${l.m} (${l.verbes})${EN_ATTENTE[l.m] ? '' : '   ⟵ NON DÉCLARÉE'}`)

/**
 * ── 🔴 LE GARDE : LA FAMILLE ② DOIT ÊTRE EXACTEMENT CELLE QU'ON A DÉCLARÉE ──
 *
 * 🧭 Pas « zéro », et c'est le point. Cinq de ces lectures sont du code JUSTE
 * qui attend sa donnée : les supprimer effacerait une fonction. Exiger zéro
 * rendrait donc le garde intenable, et un garde intenable se contourne.
 *
 * On exige l'ÉGALITÉ, dans les deux sens :
 *
 *   · une table apparaît sans être déclarée → **le déploiement s'arrête**, et
 *     il faut écrire ce qu'elle attend. La justification est le prix d'entrée.
 *   · une ligne déclarée ne correspond plus à rien → **on crie, sans
 *     bloquer**.
 *
 * ⚠️ LES DEUX SENS NE PÈSENT PAS PAREIL, ET J'AI DÛ LE CORRIGER le jour même.
 * Première version : les deux arrêtaient le déploiement. 🔴 Le piège s'est
 * montré à la première utilisation — ce garde lit LA BASE et LES QUATRE
 * DÉPÔTS d'un coup, donc corriger un écran de l'admin retire sa table de la
 * famille ② et rend sa ligne périmée **dans le dépôt de l'app**. Entre les
 * deux `git pull`, il existe toujours un instant où le garde refuse, pour un
 * travail en train de se faire correctement.
 *
 * 🧭 Et un garde qui bloque pour un NON-DÉFAUT apprend à être contourné, ce
 * qui est la seule façon certaine de le perdre. Même leçon que le détecteur
 * de dérive rendu rouge par ses propres sauvegardes, le même jour. Une ligne
 * périmée n'est pas un défaut, c'est du ménage — mais un ménage qu'on voit à
 * chaque déploiement finit par se faire.
 */
const declarees = new Set(Object.keys(EN_ATTENTE))
const vues = new Set(lue.map((l) => l.m))
const nouvelles = [...vues].filter((m) => !declarees.has(m))
const perimees = [...declarees].filter((m) => !vues.has(m))

if (perimees.length)
  console.log(
    `\n⚠️ ${perimees.length} ligne(s) de EN_ATTENTE ne correspondent plus à rien : ${perimees.join(', ')}\n` +
      `   À retirer de ce fichier : la table est remplie, ou plus personne ne la lit.`,
  )

if (nouvelles.length) {
  console.log(
    `\n🔴 ${nouvelles.length} table(s) lue(s) sans écrivain et NON DÉCLARÉE(S) : ${nouvelles.join(', ')}\n` +
      `   Ajouter chacune à EN_ATTENTE dans ce fichier, avec CE QU'ELLE ATTEND.\n` +
      `   Si l'écran affiche son zéro comme une mesure, c'est l'écran qu'il faut corriger.`,
  )
  process.exit(1)
}
if (!perimees.length) console.log('\n✓ la famille ② est exactement celle qui est déclarée.')
