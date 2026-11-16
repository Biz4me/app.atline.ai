#!/usr/bin/env node
/**
 * LES DOUZE FAITS QUI PARTENT DANS LE PROMPT — tels qu'Atlas les reçoit.
 *
 *   node scripts/faits-douze.mjs <email>        # sur le serveur
 *
 * ── 🔴 LES DEUX DÉFAUTS QU'ELLE GARDE (16 novembre 2026) ──────────────────
 *
 * ① **LA FENÊTRE COUPAIT AVANT D'AVOIR PESÉ.** Elle valait 80, triée par
 *    `importance` puis `supportCount` : un fait d'importance 0,95 vu UNE fois
 *    passait devant un fait d'importance 0,85 vu **96 fois**. Sur un compte à
 *    712 faits actifs, **deux des douze plus lourds n'étaient jamais pesés** —
 *    « langage vert marche froide » (96×) et « mauvaise réputation marketing
 *    réseau » (49×). Le calcul du poids était juste ; la présélection, non.
 *
 * ② **« DEMAIN » ÉTAIT VRAI LE JOUR OÙ ON L'A DIT.** `rendez-vous jean demain`,
 *    observé il y a neuf jours, annonçait à Atlas un rendez-vous pour demain.
 *    19 faits actifs sur 712 portent un mot de temps relatif, dont un de
 *    126 jours. Chaque fait part donc désormais avec SA DATE.
 *
 * 🧭 ELLE ÉCHOUE (code 1) SI LA FENÊTRE RECOMMENCE À COUPER. C'est un contrôle
 * de présélection, pas de goût : le vrai top 12, calculé sur TOUS les faits,
 * doit être exactement celui que la fenêtre laisse passer.
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

const email = process.argv[2]
if (!email) {
  console.error('usage : node scripts/faits-douze.mjs <email>')
  process.exit(1)
}

// ── Le code de production, découpé dans sa source ──────────────────────────
const source = readFileSync(join(racine, 'lib/atlas-memory.ts'), 'utf8')
const fonction = (nom, signature) => {
  const i = source.indexOf(`function ${nom}`)
  if (i < 0) throw new Error(`fonction ${nom} introuvable dans lib/atlas-memory.ts`)
  const j = source.indexOf('\n}', i)
  if (j < 0) throw new Error(`fin de ${nom} introuvable`)
  return source.slice(i, j + 2).replace(signature, '(x)')
}
const FENETRE = Number(source.match(/const FENETRE = (\d+)/)?.[1])
if (!FENETRE) throw new Error('FENETRE introuvable')
const { poids, depuisQuand } = eval(
  '(() => { ' +
    fonction('poids', '(f: { importance: number; supportCount: number; lastSeenAt: Date }): number').replace(
      '(x)',
      '(f)',
    ) +
    '\n' +
    fonction('depuisQuand', '(quand: Date): string').replace('(x)', '(quand)') +
    '\n return { poids, depuisQuand } })()',
)
// 🔴 Contrôles positifs : prouver les outils avant de juger quoi que ce soit.
if (
  !(
    poids({ importance: 0.5, supportCount: 10, lastSeenAt: new Date() }) >
    poids({ importance: 0.5, supportCount: 1, lastSeenAt: new Date(Date.now() - 200 * 86400000) })
  )
)
  throw new Error('poids découpé défaillant')
if (depuisQuand(new Date()) !== 'aujourd’hui' || !depuisQuand(new Date(Date.now() - 9 * 86400000)).includes('semaine'))
  throw new Error('depuisQuand découpé défaillant : ' + depuisQuand(new Date(Date.now() - 9 * 86400000)))

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

const u = await db.user.findUniqueOrThrow({ where: { email }, select: { id: true } })
const tous = await db.atlasFact.findMany({
  where: { userId: u.id, contactId: null, status: 'active' },
  select: {
    predicate: true, object: true, category: true,
    importance: true, supportCount: true, lastSeenAt: true,
  },
})

// La ligne telle que le prompt la reçoit — copiée sur `faitsSaillants`.
const ligne = (f) =>
  `- ${f.predicate.replace(/_/g, ' ')} : ${f.object} (${f.category}, vu ${f.supportCount}×, ${depuisQuand(f.lastSeenAt)})`

// La fenêtre, exactement comme `CADRE` la tire aujourd'hui.
const fenetre = [...tous]
  .sort((a, b) => b.supportCount - a.supportCount || b.importance - a.importance)
  .slice(0, FENETRE)
const servis = [...fenetre].sort((a, b) => poids(b) - poids(a)).slice(0, 12)
const vrais = [...tous].sort((a, b) => poids(b) - poids(a)).slice(0, 12)

console.log(`compte : ${email} · ${tous.length} faits actifs · FENETRE=${FENETRE}\n`)
console.log('CE QU’ATLAS REÇOIT')
for (const f of servis) console.log(`   ${poids(f).toFixed(2)}  ${ligne(f)}`)

const relatifs = tous.filter((f) =>
  /\b(demain|hier|aujourd|ce soir|cette semaine|ce matin|la semaine prochaine|\d+h)\b/i.test(f.object),
)
console.log(
  `\n⏰ ${relatifs.length} fait(s) actif(s) portent un mot de temps relatif. Ils partent désormais datés :`,
)
for (const f of relatifs.sort((a, b) => a.lastSeenAt - b.lastSeenAt).slice(0, 5))
  console.log(`   ${ligne(f)}`)

// 🔴 LE VERDICT : la présélection ne doit rien coûter.
const cle = (f) => f.predicate + '|' + f.object
const manques = vrais.filter((f) => !new Set(servis.map(cle)).has(cle(f)))
if (manques.length) {
  console.error(`\n✗ ${manques.length} fait(s) du vrai top 12 sont coupés par la fenêtre avant d’être pesés :`)
  for (const f of manques)
    console.error(`   ${poids(f).toFixed(2)}  imp ${f.importance.toFixed(2)}  vu ${f.supportCount}×  ${f.object.slice(0, 44)}`)
  await db.$disconnect()
  process.exit(1)
}
console.log('\n✓ La fenêtre ne coupe rien : les douze servis sont les douze plus lourds.')
await db.$disconnect()
