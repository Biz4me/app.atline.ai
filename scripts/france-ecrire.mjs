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
import { decoder, enFrance, identite } from './lib/tester-lien.mjs'

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
  // [survivant, [à archiver…], { renommer? }]
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
  // justement porter les deux liens sur une seule. C'est la DONATION qui
  // ramène le lien français sur le survivant.
  ['stampin-up-review-us', ['stampin-up-france'], { renommer: "Stampin' Up!" }],

  /**
   * ── 🎯 LA DEUXIÈME FOURNÉE, TROUVÉE PAR UN SIGNAL QUI N'EXISTAIT PAS ─────
   *
   * Grouper sur le lien MONDE ne donnait que 4 grappes. Grouper sur le site
   * **FRANÇAIS** en donne 5 de plus, et **les 5 sont vraies** : deux lignes ne
   * peuvent atterrir sur le même domaine français que si c'est la même
   * opération française.
   *
   * 🧭 Le signal le plus sûr est celui qui a coûté le plus cher à produire —
   * il a fallu prouver 191 sites français pour pouvoir s'en servir.
   */
  ['vabo-n-at', ['vabon-at']], // deux lignes, 179 produits chacune : le même import deux fois
  /**
   * ⚠️ ICI J'AVAIS CHOISI LE MAUVAIS SURVIVANT, et pour une mauvaise raison :
   * « l'entité FVD porte la déclaration ». Mais son lien MONDE est
   * `reliv.fr/reliv-international-world-wide-offices`, une page profonde du
   * site français. L'autre ligne porte `reliv.com`, le vrai site monde.
   * 🧭 Le survivant se choisit sur la donnée, pas sur l'autorité de la source :
   * l'adhésion FVD, elle, se donne — c'est à ça que sert la donation.
   */
  ['reliv-international-review-us', ['reliv-europe-limited']],
  ['engie-acteur-mondial-de-l-energie', ['engie'], { renommer: 'Engie' }], // un pitch tenait lieu de nom
  ['pink-au-moulin-rose', ['au-moulin-rose']],
  ['groupe-horizon-conseil-horizon-renov', ['horizon-renov']],
  ['welltures-global-tr', ['welltures-global-medikal-kozmetik-tr']],
]

/**
 * ⚠️ CE QUI N'EST **PAS** UN DOUBLON, ET QUE J'ALLAIS ARCHIVER SUR SON NOM.
 *
 * `SD Distribution` porte comme lien `xrvap.com/sd-distribution/`, une page du
 * site de `XrVap`. Un nom en « Distribution » plus l'hébergement chez un autre :
 * tout disait « façade de distributeur ». **Les deux sont adhérentes de la
 * FVD**, chacune sous son nom. La fédération tranche, pas la forme de l'URL.
 *
 * `HPH` et `Nafis Network` partagent `hph.co.ir` et restent séparées aussi :
 * deux noms sur un hôte, ce n'est pas une preuve d'identité.
 */

/**
 * ── 🔴 LE LIEN MONDE N'AVAIT JAMAIS ÉTÉ CONTRÔLÉ, LUI ─────────────────────
 *
 * `identite()` ne tournait que sur le lien France. Résultat : Herbalife a
 * récupéré son vrai site français grâce à la FVD, et **gardait `hlfshop.fr`
 * comme lien MONDE** — la boutique du distributeur venait juste de changer de
 * colonne. Passé sur les 771 liens monde, le contrôle en sort 33, dont la
 * grande majorité sont des faux positifs assumés (`Rexair → rainbowsystem`,
 * `Utility Warehouse → uw.co.uk`, `Global Domains International →
 * website.ws`, tous légitimes). Quatre sont vrais, et deux se corrigent ici.
 */
const LIENS_MONDE = [
  // ⚠️ `herbalife-fr`, pas `herbalife` : ma première correction visait un slug
  // inexistant, et le script l'a dit — dans un avertissement que j'avais
  // coupé de l'affichage. Cette ligne porte 47 produits et 4 activités.
  ['herbalife-fr', 'https://www.herbalife.com', 'hlfshop.fr est la boutique d un distributeur, pas le site de la marque'],
  ['yes-global-marketing-sdn-bhd-my', 'https://yes.global', 'schéma doublé : https://HTTPS://YES.GLOBAL'],
  ['groupe-horizon-conseil-horizon-renov', 'https://www.horizonrenov.fr', 'seule adresse en http simple du référentiel'],
]

/**
 * ── LES DOMAINES QU'UN HUMAIN A CONFIRMÉS ─────────────────────────────────
 *
 * `identite()` se trompe une fois sur cinq, et c'est assumé : il trie. Mais
 * ce qui a été relu une fois ne doit pas repasser devant lui à chaque
 * exécution. Ces domaines ne portent pas le nom de la marque et sont pourtant
 * bien les siens : un acronyme, un nom de produit, une maison mère.
 */
const IDENTITE_CONFIRMEE = [
  'lrworld.com', // LR Health & Beauty
  'smhtoiture.fr', // Solution Max Home
  'rainbowsystem.com', // Rexair fabrique les aspirateurs Rainbow
  'rtpr.com', // Real Time Pain Relief
  'uw.co.uk', // Utility Warehouse
  'website.ws', // Global Domains International vend justement des .ws
  'thegoodinside.com', // Touchstone Essentials
  'naturalhealthtrendscorp.com', // la maison mère de NHT Global
  'crowd1.com', // notre fiche s'appelle « C1 »
  'nvisionu.com', // NVU
  'xrvap.com', // SD Distribution, adhérente FVD hébergée chez XrVap
]

/** Ce qu'on ramène d'un doublon archivé vers son survivant, s'il ne l'a pas. */
const A_DONNER = [
  'officialUrl', 'siteFrance', 'siteFranceSource', 'fvdMembre', 'fvdDepuis',
  'siret', 'anneeCreation', 'caMondialM', 'category', 'secteurs', 'multiniveau',
]
const vide = (v) => v == null || v === '' || v === false || (Array.isArray(v) && !v.length)

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
    select: {
      id: true, name: true, slug: true, sources: true, franceOperee: true,
      officialUrl: true, siteFrance: true, siteFranceSource: true, secteurs: true,
      fvdMembre: true, fvdDepuis: true, siret: true, anneeCreation: true,
      caMondialM: true, category: true, multiniveau: true,
    },
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
    for (const p of perdants) {
      const l = parSlug.get(p)
      if (!l) {
        console.log(`  ⚠️ doublon introuvable : ${p}`)
        continue
      }
      /**
       * 🧭 ARCHIVER NE DOIT PAS PERDRE CE QUE LE SURVIVANT N'A PAS.
       *
       * `Stampin'up ! France` portait le seul lien français du couple ; `Reliv
       * Europe Limited` porte l'adhésion FVD. Les ramener à la main, cas par
       * cas, aurait oublié le troisième. Une donation générique ne peut pas
       * oublier : elle passe sur chaque champ.
       */
      const dons = {}
      for (const champ of A_DONNER)
        if (vide(s[champ]) && !vide(l[champ]) && vide(plan.get(s.id)?.quoi?.[champ])) dons[champ] = l[champ]
      if (Object.keys(dons).length) {
        if (dons.siteFrance) dons.franceOperee = true
        poser(s.id, dons, `reçoit de « ${decoder(l.name)} » : ${Object.keys(dons).join(', ')}`)
      }
      archiver.push({
        id: l.id, nom: decoder(l.name), slug: p, vers: s.id,
        versNom: opts.renommer || decoder(s.name), dons: Object.keys(dons),
      })
    }
  }

  // ── ②bis LES LIENS MONDE CORRIGÉS À LA MAIN
  for (const [slug, bon, pourquoi] of LIENS_MONDE) {
    const c = parSlug.get(slug)
    if (!c) {
      console.log(`  ⚠️ slug introuvable pour un lien monde : ${slug}`)
      continue
    }
    const src = typeof c.sources === 'object' && c.sources ? c.sources : {}
    poser(
      c.id,
      {
        officialUrl: bon,
        sources: {
          ...src,
          liensRetires: [
            ...(Array.isArray(src.liensRetires) ? src.liensRetires : []),
            { champ: 'officialUrl', valeur: c.officialUrl, pourquoi, quand: MAINTENANT.toISOString() },
          ],
        },
      },
      `lien monde corrigé → ${bon}`,
    )
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
      const declare = (m.retenu.finale || m.retenu.url).replace(/\/$/, '')
      /**
       * ── 🧭 LA FVD PROUVE DE QUI EST LE SITE, PAS QUELLE PAGE OUVRIR ──────
       *
       * Sa fiche adhérent pointe parfois une page profonde. `Reliv
       * International` portait un propre `reliv.fr`, trouvé par motif, et la
       * déclaration FVD l'a écrasé par
       * `reliv.fr/reliv-international-world-wide-offices`.
       *
       * Même domaine, adresse plus courte : on garde la nôtre, et on garde la
       * FVD comme **source de la preuve**. Les deux informations sont vraies
       * et ne portent pas sur la même chose.
       */
      const deja = plan.get(c.id)?.quoi?.siteFrance ?? c.siteFrance
      const memeDomaine = (a, b) => {
        try {
          return new URL(a).hostname.replace(/^www\./, '') === new URL(b).hostname.replace(/^www\./, '')
        } catch {
          return false
        }
      }
      quoi.siteFrance = deja && memeDomaine(deja, declare) && deja.length < declare.length ? deja : declare
      quoi.siteFranceSource = 'FVD'
      quoi.franceOperee = true
    }
    poser(c.id, quoi, 'FVD')
  }

  /**
   * ── ④ LE CONTRÔLE FINAL DU LIEN FRANCE, et le retrait des mauvais ───────
   *
   * 🔴 Il passe sur ce qui est DÉJÀ EN BASE autant que sur ce qu'on s'apprête
   * à écrire. Sans ça, une correction ne corrige que l'avenir : les sept
   * mauvais liens écrits à la première passe y seraient restés.
   *
   * 🧭 Et un lien retiré vaut mieux qu'un lien faux. Un distributeur envoyé
   * sur le tarif belge y lira des prix qui ne sont pas les siens ; envoyé sur
   * une annonce d'emploi, il se demandera ce qu'on lui vend.
   */
  const retiresFrance = []
  for (const c of vivantes) {
    const p = plan.get(c.id)
    const propose = p?.quoi?.siteFrance !== undefined ? p.quoi.siteFrance : c.siteFrance
    if (!propose) continue
    const nom = p?.quoi?.name ?? decoder(c.name)
    const pays = enFrance(propose)
    const marque = identite(nom, propose)
    const refus = !pays.ok
      ? pays.pourquoi
      : !marque.colle && !IDENTITE_CONFIRMEE.some((d) => propose.includes(d))
        ? marque.pourquoi
        : null
    if (!refus) continue
    const src = typeof c.sources === 'object' && c.sources ? c.sources : {}
    poser(
      c.id,
      {
        siteFrance: null,
        siteFranceSource: null,
        sources: {
          ...src,
          liensRetires: [
            ...(Array.isArray(src.liensRetires) ? src.liensRetires : []),
            { champ: 'siteFrance', valeur: propose, pourquoi: refus, quand: MAINTENANT.toISOString() },
          ],
        },
      },
      `🔴 France retiré`,
    )
    retiresFrance.push({ nom, url: propose, pourquoi: refus })
  }

  // ── ⑤ LES ENTITÉS HTML DANS LES NOMS — un défaut d'affichage, mécanique
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
  console.log(`  🔴 lien France RETIRÉ       : ${retiresFrance.length}`)
  for (const r of retiresFrance) console.log(`       ${r.nom.slice(0, 24).padEnd(26)}${r.pourquoi}`)

  console.log('\n── LES DOUBLONS')
  for (const a of archiver)
    console.log(`  « ${a.nom} »  →  « ${a.versNom} »${a.dons.length ? `  ⟵ donne : ${a.dons.join(', ')}` : ''}`)

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
