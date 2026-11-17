#!/usr/bin/env node
/**
 * DONNER UNE POSITION AUX CONTACTS QUI ONT DÉJÀ UNE ADRESSE.
 *
 *   node scripts/contacts-geocoder.mjs              # montre, n'écrit RIEN
 *   node scripts/contacts-geocoder.mjs --appliquer  # écrit
 *
 * ── 🔴 POURQUOI CE RATTRAPAGE EXISTE ──────────────────────────────────────
 *
 * La recherche d'adresse livrée le 16 novembre 2026 écrit `lat`/`lng` à
 * chaque choix. Mais elle n'écrit que pour l'AVENIR : mesuré le même jour,
 * **0 contact sur 44 porte une position**, alors que 31 portent une ville et
 * 5 une rue. Une carte branchée aujourd'hui serait vide — et personne ne
 * saurait dire si c'est la carte qui est cassée ou le carnet qui est vide.
 *
 * ── 🧭 LA PRÉCISION N'EST PAS UNE COLONNE, ELLE SE DÉDUIT ─────────────────
 *
 * Un contact qui n'a QUE sa ville sera posé au centre de la commune : tous
 * les Parisiens au même point. Ce n'est pas une erreur tant que la carte le
 * DIT — d'où la forme large et floue prévue pour eux, par opposition au point
 * net d'une adresse de rue. Aucune colonne de plus n'est nécessaire : la
 * précision se lit sur `address`, qui est nul ou non.
 *
 * ⚠️ ON NE GÉOCODE JAMAIS UN CONTACT SANS VILLE. Avec la seule rue, le
 * service rendrait la première « rue de la Paix » de France, c'est-à-dire
 * quelqu'un posé à 400 km de chez lui. Un trou honnête vaut mieux qu'une case
 * remplie au hasard — la maison l'a déjà tranché pour les slugs.
 *
 * ── 🔴 CE QUI SORT DE LA MACHINE ──────────────────────────────────────────
 *
 * L'adresse part vers la Géoplateforme de l'IGN, comme depuis le navigateur.
 * Rien d'autre : pas de nom, pas d'identifiant, pas de compte. Le service ne
 * peut pas savoir de qui est l'adresse qu'il résout.
 *
 * ⚠️ Et on reste LOIN sous le plafond : 50 requêtes par seconde et par IP, on
 * en fait une toutes les 250 ms. Il y a 44 contacts, pas 44 000.
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

const SERVICE = 'https://data.geopf.fr/geocodage/search'
/** Entre deux appels. Le plafond est de 50/s ; on en fait 4. */
const REPOS = 250
/**
 * EN DESSOUS, ON NE GARDE PAS. Le service rend un `score` entre 0 et 1.
 * ⚠️ CE SEUIL SE MESURE, IL NE SE CHOISIT PAS : le mode sec imprime le score
 * de chaque réponse, et c'est en les lisant qu'on tranche.
 */
const seuilArg = Number((process.argv.find((a) => a.startsWith('--seuil=')) || '').split('=')[1])
const SEUIL = Number.isFinite(seuilArg) ? seuilArg : 0.4

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

const dormir = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * 🔴 ON PROUVE L'OUTIL SUR UN CAS CONNU AVANT DE COMPTER QUOI QUE CE SOIT.
 *
 * Une sonde qui ne sait pas qu'elle est cassée rend des zéros qui ressemblent
 * à une mesure. Ici le risque est précis : si le service répondait autre chose
 * — une page d'erreur, un format changé — on écrirait « 0 géocodable » et on
 * en conclurait que le carnet est vide.
 */
async function interroger(q, genre) {
  const u = new URL(SERVICE)
  u.searchParams.set('q', q)
  u.searchParams.set('limit', '1')
  if (genre) u.searchParams.set('type', genre)
  const r = await fetch(u)
  if (!r.ok) throw new Error(`le service a répondu ${r.status}`)
  const j = await r.json()
  const f = j?.features?.[0]
  if (!f) return null
  const c = f.geometry?.coordinates
  if (!Array.isArray(c) || c.length < 2) return null
  // GeoJSON range la LONGITUDE en premier. L'inverser poserait tout le monde
  // au large de la Somalie, et ça ne se verrait qu'une fois la carte faite.
  return {
    lng: Number(c[0]),
    lat: Number(c[1]),
    label: String(f.properties?.label ?? ''),
    score: Number(f.properties?.score ?? 0),
    genre: String(f.properties?.type ?? ''),
  }
}

const temoin = await interroger('8 boulevard du port 80000 amiens')
if (!temoin) throw new Error('le service ne rend rien sur un cas connu : on ne mesure rien')
if (Math.abs(temoin.lat - 49.8974) > 0.02 || Math.abs(temoin.lng - 2.2901) > 0.02) {
  throw new Error(
    `témoin hors position : ${temoin.lat}/${temoin.lng} au lieu de ~49.8974/2.2901 — ` +
      'latitude et longitude sont peut-être inversées',
  )
}
console.log(`témoin : « ${temoin.label} » ${temoin.lat}/${temoin.lng} (score ${temoin.score})\n`)

const contacts = await db.contact.findMany({
  where: { lat: null },
  select: { id: true, name: true, address: true, postal: true, city: true, country: true },
  orderBy: { createdAt: 'asc' },
})

const total = await db.contact.count()
const avecPosition = await db.contact.count({ where: { lat: { not: null } } })
console.log(`${total} contacts · ${avecPosition} portent déjà une position · ${contacts.length} sans\n`)

const plan = []
const ecartes = []

for (const c of contacts) {
  const ville = (c.city ?? '').trim()
  const rue = (c.address ?? '').trim()
  const cp = (c.postal ?? '').trim()
  const pays = (c.country ?? '').trim()

  if (!ville) {
    ecartes.push({ id: c.id, nom: c.name, pourquoi: 'aucune ville' })
    continue
  }
  /**
   * ⚠️ LA BASE ADRESSE NATIONALE S'ARRÊTE AUX FRONTIÈRES. Un contact déclaré
   * en Belgique serait résolu sur une commune française qui porte le même nom
   * — et il y en a. On l'écarte, on le dit, et sa position reste vide.
   */
  if (pays && !/^france$/i.test(pays)) {
    ecartes.push({ id: c.id, nom: c.name, pourquoi: `hors France (${pays})` })
    continue
  }

  // Avec une rue, on cherche l'adresse ; sans, on cherche LA COMMUNE, et on
  // le demande explicitement au service pour qu'il ne rende pas une rue
  // homonyme ailleurs.
  const precis = Boolean(rue)
  const q = [rue, cp, ville].filter(Boolean).join(' ')
  let r = null
  try {
    r = await interroger(q, precis ? null : 'municipality')
  } catch (e) {
    ecartes.push({ id: c.id, nom: c.name, pourquoi: `service : ${e.message}` })
    await dormir(REPOS)
    continue
  }
  await dormir(REPOS)

  if (!r) {
    ecartes.push({ id: c.id, nom: c.name, pourquoi: `rien trouvé pour « ${q} »` })
    continue
  }
  if (r.score < SEUIL) {
    ecartes.push({
      id: c.id,
      nom: c.name,
      pourquoi: `score ${r.score.toFixed(2)} < ${SEUIL} — « ${q} » → « ${r.label} »`,
    })
    continue
  }
  plan.push({
    id: c.id,
    nom: c.name,
    cherche: q,
    trouve: r.label,
    score: Number(r.score.toFixed(3)),
    precision: precis ? 'adresse' : 'commune',
    lat: r.lat,
    lng: r.lng,
  })
}

console.log(`── ${plan.length} à poser ──`)
for (const p of plan) {
  console.log(
    `  ${p.precision === 'adresse' ? '📍' : '◯'} ${p.nom}\n` +
      `     « ${p.cherche} » → « ${p.trouve} » (${p.score})\n` +
      `     ${p.lat}, ${p.lng}`,
  )
}
console.log(`\n── ${ecartes.length} écartés ──`)
for (const e of ecartes) console.log(`  ${e.nom} : ${e.pourquoi}`)

const precises = plan.filter((p) => p.precision === 'adresse').length
console.log(
  `\nrésumé : ${precises} au point exact · ${plan.length - precises} au centre de leur commune · ` +
    `${ecartes.length} sans position`,
)

if (!appliquer) {
  console.log('\nMODE SEC — rien n’a été écrit. Ajouter --appliquer pour écrire.')
  await db.$disconnect()
  process.exit(0)
}

const quand = new Date().toISOString().replace(/[:.]/g, '-')
const chemin = `/opt/atline/data/contacts-geocodage-${quand}.json`
try {
  writeFileSync(chemin, JSON.stringify({ quand, seuil: SEUIL, plan, ecartes }, null, 2))
} catch (e) {
  console.error(`✗ trace impossible à écrire (${chemin}) : ${e.message}`)
  console.error('  On n’écrit pas sans trace. Rien n’a été modifié.')
  await db.$disconnect()
  process.exit(1)
}
console.log(`\ntrace écrite : ${chemin}`)

for (const p of plan) {
  // ⚠️ `lat: null` DANS LE `where` : si quelqu'un a posé une position entre
  // la mesure et l'écriture — par la recherche d'adresse, par exemple — on ne
  // l'écrase pas avec un centre de commune.
  const r = await db.contact.updateMany({
    where: { id: p.id, lat: null },
    data: { lat: p.lat, lng: p.lng },
  })
  console.log(`  ${r.count ? '✓' : '—'} ${p.nom}`)
}

const apres = await db.contact.count({ where: { lat: { not: null } } })
console.log(`\n${apres} contacts portent une position (ils étaient ${avecPosition}).`)
await db.$disconnect()
