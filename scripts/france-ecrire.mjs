#!/usr/bin/env node
/**
 * ÉCRIRE EN BASE CE QUE LE BALAYAGE A PROUVÉ.
 *
 * ── 🔴 POURQUOI L'ESSAI À BLANC EST LE DÉFAUT ─────────────────────────────
 *
 * Ce script touche 866 lignes du référentiel que tous les distributeurs vont
 * lire. La version qui écrit vraiment demande `--pour-de-vrai`. Sans ce
 * drapeau, il IMPRIME ce qu'il ferait et ne touche à rien.
 *
 * 🧭 Les décisions humaines — quel doublon survit — vivent dans une TABLE
 * qu'on relit ligne par ligne, pas dans une règle qu'il faut croire. Une
 * règle automatique aurait gardé `forever-living-products-us` pour ses
 * 24 produits ; elle aurait aussi gardé le plus beau nom ailleurs. Ce qui a
 * tranché est ailleurs : **cette ligne porte 3 activités de distributeurs**,
 * et les archiver les détacherait de leur société.
 *
 *   node scripts/france-ecrire.mjs                  → essai à blanc
 *   node scripts/france-ecrire.mjs --pour-de-vrai    → écrit
 */

import { readFileSync } from 'node:fs'
import { PrismaClient } from '@prisma/client'
import { decoder } from './lib/tester-lien.mjs'

const db = new PrismaClient()
const pourDeVrai = process.argv.includes('--pour-de-vrai')
const MAINTENANT = new Date()

/**
 * ── LES DOUBLONS, TRANCHÉS À LA MAIN ──────────────────────────────────────
 *
 * Trouvés par deux voies : même lien monde, et même nom une fois les mots
 * passe-partout retirés (`international`, `products`, `the`, `et`…). Le
 * survivant est choisi sur ce qu'il porte, dans cet ordre : des activités de
 * distributeurs d'abord, puis des produits, puis un lien.
 *
 * ⚠️ `HPH` et `Nafis Network` partagent `hph.co.ir` et ne sont PAS fusionnés :
 * deux noms différents sur un même hôte, c'est peut-être un groupe et son
 * réseau. On ne fusionne pas sur une ressemblance d'URL seule.
 */
const DOUBLONS = [
  // [survivant, [à archiver…], { renommer?, siteFranceDonne? }]
  ['energetix-review-de', ['energetix-gmbh-co-kg']],
  ['top-balance-es', ['top-bal-es']],
  ['lr-health-et-beauty', ['lr-health-and-beauty-de', 'lr-health-beauty'], { renommer: 'LR Health & Beauty' }],
  ['forever-living-products-us', ['forever-living']], // 3 activités : c'est LUI
  ['natures-sunshine-us', ['nature-s-sunshine'], { renommer: "Nature's Sunshine" }],
  ['partylite-review-us', ['partylite-bougies']],
  ['juice-plus-us', ['the-juice-plus-company']],
  ['ace-consulting-reseau-aceh', ['ace-consulting']],
  ['pampered-chef-us', ['the-pampered-chef']],
  // 🎯 CELUI-LÀ N'ÉTAIT PAS UN DOUBLON, C'ÉTAIT LA PAIRE QU'ON CHERCHE.
  // « Stampin' Up! » porte le site monde, « Stampin'up ! France » le site
  // français. Deux lignes pour une société, alors que le nouveau modèle sait
  // justement porter les deux liens sur une seule.
  [
    'stampin-up-review-us',
    ['stampin-up-france'],
    { renommer: "Stampin' Up!", siteFranceDonne: 'https://www.stampinup.fr' },
  ],
]

/** Les mots qui ne distinguent pas deux sociétés. */
const BRUIT =
  /\b(international|intl|group|groupe|global|worldwide|world|company|corporation|corp|inc|llc|ltd|products?|produits?|france|europe|and|et|the)\b/g
const cle = (n) =>
  decoder(n)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-z0-9 &]/g, ' ')
    .replace(/&/g, ' and ')
    .replace(BRUIT, ' ')
    .replace(/\s+/g, '')

const lire = (p) => {
  try {
    return JSON.parse(readFileSync(p, 'utf8'))
  } catch {
    return null
  }
}

const main = async () => {
  const balayage = lire('/tmp/france-societes.json')
  const fvd = lire('/tmp/france-liens.json')
  if (!balayage) throw new Error('/tmp/france-societes.json absent — relancer france-societes.mjs --toutes')

  const societes = await db.mlmCompany.findMany({
    where: { status: { not: 'ARCHIVED' } },
    select: { id: true, name: true, slug: true, officialUrl: true, secteurs: true, siteFrance: true, franceOperee: true, fvdMembre: true, sources: true },
  })
  const parId = new Map(societes.map((c) => [c.id, c]))
  const parSlug = new Map(societes.map((c) => [c.slug, c]))

  /** Ce qu'on va écrire, ligne par ligne, avant d'écrire quoi que ce soit. */
  const plan = new Map() // id → { quoi: {}, pourquoi: [] }
  const poser = (id, quoi, pourquoi) => {
    const p = plan.get(id) ?? { quoi: {}, pourquoi: [] }
    Object.assign(p.quoi, quoi)
    p.pourquoi.push(pourquoi)
    plan.set(id, p)
  }

  // ── ① LE BALAYAGE DES 866 : le lien France, les secteurs, la date
  let retires = 0
  for (const c of balayage.fini) {
    const en = parId.get(c.id)
    if (!en) continue

    // La date de vérification se pose MÊME quand on n'a rien trouvé : savoir
    // quand on a regardé pour la dernière fois est l'information principale.
    poser(c.id, { liensVerifiesLe: MAINTENANT }, 'vérifié')

    if (c.france?.etat === 'ok' && !c.suspect) {
      const url = (c.france.finale || c.france.url).replace(/\/$/, '')
      poser(
        c.id,
        { siteFrance: url, siteFranceSource: c.franceVia || 'motif', franceOperee: true },
        `France ${c.franceVia}`,
      )
    }

    if (c.secteursProposes?.length) poser(c.id, { secteurs: c.secteursProposes }, 'secteurs')

    /**
     * 🔴 LE DOMAINE PARQUÉ EST LE SEUL LIEN MONDE QU'ON RETIRE.
     *
     * 145 liens monde ne répondent pas, mais « ne répond pas » mesuré une
     * fois, depuis une seule adresse IP en Allemagne, peut être un pare-feu
     * ou un délai. Un domaine PARQUÉ, lui, affiche littéralement qu'il est à
     * vendre : il n'y a pas d'ambiguïté, et laisser un distributeur cliquer
     * dessus est pire que ne rien afficher.
     *
     * ⚠️ On ne jette pas la valeur : elle part dans `sources.liensRetires`.
     */
    if (c.monde?.etat === 'parque' && en.officialUrl) {
      const src = typeof en.sources === 'object' && en.sources ? en.sources : {}
      poser(
        c.id,
        {
          officialUrl: null,
          sources: {
            ...src,
            liensRetires: [
              ...(Array.isArray(src.liensRetires) ? src.liensRetires : []),
              { champ: 'officialUrl', valeur: en.officialUrl, pourquoi: 'domaine parqué, à vendre', quand: MAINTENANT.toISOString() },
            ],
          },
        },
        '🔴 lien monde parqué, retiré',
      )
      retires++
    }
  }

  // ── ② LES DOUBLONS, TRANCHÉS AVANT TOUT LE RESTE
  //
  // 🧭 L'ORDRE EST LA CORRECTION. Mon premier jet appariait la FVD d'abord :
  // « Pampered Chef » ressortait en deux candidates, « LR Health et Beauty »
  // en trois, et je renonçais à les apparier — alors que deux des trois
  // partaient justement à l'archive. Archiver d'abord résout l'ambiguïté au
  // lieu de la contourner.
  const archiver = []
  for (const [slugSurvivant, perdants, opts = {}] of DOUBLONS) {
    const s = parSlug.get(slugSurvivant)
    if (!s) {
      console.log(`  ⚠️ survivant introuvable : ${slugSurvivant}`)
      continue
    }
    if (opts.renommer) poser(s.id, { name: opts.renommer }, `renommé « ${opts.renommer} »`)
    if (opts.siteFranceDonne)
      poser(s.id, { siteFrance: opts.siteFranceDonne, siteFranceSource: 'autre ligne', franceOperee: true }, 'France donnée par le doublon')
    for (const p of perdants) {
      const l = parSlug.get(p)
      if (!l) {
        console.log(`  ⚠️ doublon introuvable : ${p}`)
        continue
      }
      archiver.push({ id: l.id, nom: decoder(l.name), slug: p, vers: s.id, versNom: opts.renommer || decoder(s.name) })
    }
  }
  const partantes = new Set(archiver.map((a) => a.id))
  const vivantes = societes.filter((c) => !partantes.has(c.id))

  // ── ③ LA FVD : elle DÉCLARE le lien et les secteurs. Sa parole gagne.
  const fvdRes = fvd?.resultat ?? []
  const apparies = []
  const orphelins = []
  for (const m of fvdRes) {
    const k = cle(m.nom)
    /**
     * ⚠️ LES DEUX CLÉS DOIVENT ÊTRE LONGUES, PAS SEULEMENT CELLE DE LA FVD.
     *
     * Je ne bornais que `k`. `Max International` se réduit à « max », trois
     * lettres, et « solutionmaxhome » les contient : la FVD « Solution Max
     * Home » s'appariait donc à **Max International**, une autre société.
     * Pareil pour `Reliv International` contre `Reliv Europe Limited`.
     */
    const exactes = vivantes.filter((c) => cle(c.name) === k)
    const cand = exactes.length
      ? exactes
      : vivantes.filter((c) => {
          const ck = cle(c.name)
          return ck.length >= 5 && k.length >= 5 && (ck.includes(k) || k.includes(ck))
        })
    if (cand.length !== 1) {
      orphelins.push({ nom: m.nom, n: cand.length, qui: cand.map((c) => decoder(c.name)).slice(0, 3) })
      continue
    }
    const c = cand[0]
    // 🧭 On distingue l'appariement EXACT de celui qui ne tient qu'à une
    // ressemblance : le second doit se relire, pas se croire. C'est là que
    // « Solution Max Home » était parti chez « Max International ».
    apparies.push({ fvd: m.nom, nous: decoder(c.name), slug: c.slug, exact: exactes.length > 0 })
    const quoi = { fvdMembre: true, liensVerifiesLe: MAINTENANT }
    if (m.secteurs?.length) quoi.secteurs = m.secteurs
    if (m.retenu?.etat === 'ok') {
      quoi.siteFrance = (m.retenu.finale || m.retenu.url).replace(/\/$/, '')
      quoi.siteFranceSource = 'FVD'
      quoi.franceOperee = true
    }
    poser(c.id, quoi, 'FVD')
  }

  // ── ④ LES ENTITÉS HTML DANS LES NOMS — un défaut d'affichage, mécanique
  const aDecoder = vivantes.filter((c) => /&#?\w+;/.test(c.name))
  for (const c of aDecoder) {
    const p = plan.get(c.id)
    if (p?.quoi.name) continue // déjà renommé par la table des doublons
    poser(c.id, { name: decoder(c.name) }, 'nom décodé')
  }

  // ── LE RAPPORT, AVANT TOUTE ÉCRITURE
  const n = (f) => [...plan.values()].filter(f).length
  console.log(`\n══ ${pourDeVrai ? 'ÉCRITURE' : 'ESSAI À BLANC — rien ne sera écrit'}`)
  console.log(`  lignes touchées            : ${plan.size}`)
  console.log(`  🇫🇷 siteFrance posé         : ${n((p) => p.quoi.siteFrance)}`)
  console.log(`     dont déclaré par la FVD : ${n((p) => p.quoi.siteFranceSource === 'FVD')}`)
  console.log(`  secteurs posés             : ${n((p) => p.quoi.secteurs)}`)
  console.log(`  fvdMembre posé             : ${n((p) => p.quoi.fvdMembre)}`)
  console.log(`  🔴 lien monde parqué retiré : ${retires}`)
  console.log(`  noms décodés               : ${aDecoder.length}`)
  console.log(`  noms corrigés à la main    : ${n((p) => p.pourquoi.some((x) => x.startsWith('renommé')))}`)
  console.log(`  doublons à archiver        : ${archiver.length}`)

  console.log('\n── LES DOUBLONS')
  for (const a of archiver) console.log(`  « ${a.nom} »  →  archivé, doublonDe « ${a.versNom} »`)

  const parRessemblance = apparies.filter((a) => !a.exact)
  console.log(`\n── LA FVD : ${apparies.length} adhérents appariés (${apparies.length - parRessemblance.length} à l'identique), ${orphelins.length} sans correspondance`)
  console.log(`\n  ⚠️ ${parRessemblance.length} appariés par RESSEMBLANCE — à relire :`)
  for (const a of parRessemblance) console.log(`     FVD « ${a.fvd.slice(0, 34)} »${' '.repeat(Math.max(1, 36 - a.fvd.slice(0, 34).length))}→  nous « ${a.nous} »`)
  console.log()
  for (const o of orphelins.slice(0, 18))
    console.log(`  ${o.nom.slice(0, 32).padEnd(34)} ${o.n === 0 ? 'ABSENTE de notre base' : `${o.n} candidates : ${o.qui.join(' / ')}`}`)
  if (orphelins.length > 18) console.log(`  … et ${orphelins.length - 18} autres`)

  if (!pourDeVrai) {
    console.log('\n  🧭 Essai à blanc. Relancer avec --pour-de-vrai pour écrire.')
    await db.$disconnect()
    return
  }

  // ── L'ÉCRITURE
  let k = 0
  for (const [id, p] of plan) {
    await db.mlmCompany.update({ where: { id }, data: p.quoi })
    if (++k % 100 === 0) process.stderr.write(`\r  ${k}/${plan.size}   `)
  }
  process.stderr.write(`\r  ${k}/${plan.size} écrites\n`)

  for (const a of archiver)
    await db.mlmCompany.update({ where: { id: a.id }, data: { status: 'ARCHIVED', doublonDe: a.vers } })
  console.log(`  ${archiver.length} doublons archivés`)

  const compte = await db.mlmCompany.count({ where: { siteFrance: { not: null }, status: { not: 'ARCHIVED' } } })
  console.log(`\n  ✅ EN BASE : ${compte} sociétés avec un site français`)
  await db.$disconnect()
}

main().catch(async (e) => {
  console.error(e)
  await db.$disconnect()
  process.exit(1)
})
