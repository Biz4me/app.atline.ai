// L'ÉTAGE GRATUIT entre `shop-harvest.mjs` (Shopify/Woo) et `shop-firecrawl.mjs`
// (crédits + IA). Pour les boutiques que la moisson structurée a refusées :
//   1. sitemap  → les URL de produits, gratuitement (scripts/lib/sitemap-produits.mjs)
//   2. sonde    → 5 pages, lues par 4 méthodes STANDARD et gratuites
//   3. si ça se lit → on moissonne. Sinon on s'arrête et on NOTE le sitemap,
//      pour que Firecrawl scrape les bonnes pages au lieu d'en deviner 50.
//
// 🔴 CE QUE LA MESURE DIT, ET IL FAUT LA CROIRE PLUTÔT QUE L'ESPOIR.
// Le 1er novembre 2026, sur 25 sociétés avec sitemap : les URL de produits
// sortent pour 12 d'entre elles (22 321 URL), mais le JSON-LD `Product` n'est
// lisible que sur 2. La valeur principale de ce script n'est donc PAS de
// moissonner : c'est de donner à Firecrawl une liste d'URL juste et gratuite.
// Les quelques sociétés entièrement lisibles sont un bonus.
//
// Usage :  node scripts/shop-sitemap.mjs --dry https://scentsy.com
//          node scripts/shop-sitemap.mjs --test
//          node scripts/shop-sitemap.mjs [--limit 40] [--only slug1,slug2]

import { urlsProduits, autoTest } from './lib/sitemap-produits.mjs'

const arg = (nom, defaut = null) => {
  const i = process.argv.indexOf(nom)
  return i > -1 ? process.argv[i + 1] : defaut
}
const DRY = process.argv.includes('--dry')
const DRY_URL = DRY ? arg('--dry') : null
const TEST = process.argv.includes('--test')
const LIMIT = parseInt(arg('--limit', '0'), 10)
const ONLY = (arg('--only', '') || '').split(',').filter(Boolean)

const CONCURRENCE = 5
const SONDE = 5 // pages lues avant de décider si ça vaut le coup de continuer
const SONDE_MIN = 2 // il en faut au moins 2 lisibles sur 5
const MAX_PRODUITS = parseInt(arg('--max', '300'), 10)
const MIN_POUR_PUBLIER = 3
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

const EUR = new Set(['DE','FR','IT','ES','NL','BE','AT','PT','IE','FI','GR','SI','SK','EE','LV','LT','LU','CY','MT'])
const CUR = { US:'USD',PR:'USD',CA:'CAD',GB:'GBP',AU:'AUD',NZ:'NZD',JP:'JPY',CH:'CHF',SE:'SEK',NO:'NOK',DK:'DKK',PL:'PLN',CZ:'CZK',HU:'HUF',RO:'RON',TR:'TRY',IN:'INR',MY:'MYR',SG:'SGD',TH:'THB',ID:'IDR',PH:'PHP',KR:'KRW',CN:'CNY',HK:'HKD',TW:'TWD',BR:'BRL',MX:'MXN',AE:'AED',ZA:'ZAR',UA:'UAH',VN:'VND',IS:'ISK' }
const deviseDe = (cc) => CUR[cc] || (EUR.has(cc) ? 'EUR' : 'USD')

// Repris tel quel de shop-harvest.mjs : Postgres refuse les caractères de
// contrôle, et un demi-surrogate fait tomber l'insertion. Volontairement
// recopié plutôt que partagé : chaque script d'ingestion est autonome ici.
// 🔴 Les entités NUMÉRIQUES doivent être décodées, pas seulement les nommées.
// Sans ça, Scentsy livrait « Sorrento Lemon&#xA0;Scentsy&#xA0;Charm Clip » et
// doTERRA des descriptions pleines de `&#xA;` et `&#x2019;` : ces noms seraient
// partis en base et se seraient affichés tels quels dans l'app.
const unPoint = (n) => {
  try { return n >= 0 && n <= 0x10ffff ? String.fromCodePoint(n) : '' } catch { return '' }
}
const decode = (s) =>
  s
    .replace(/&#x([0-9a-f]{1,6});/gi, (_, h) => unPoint(parseInt(h, 16)))
    .replace(/&#(\d{1,7});/g, (_, d) => unPoint(parseInt(d, 10)))
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    // `&amp;` en DERNIER : décodé en premier, « &amp;#39; » deviendrait « ' ».
    .replace(/&amp;/g, '&')

// Ordre imposé : on décode AVANT de nettoyer, sinon un `&#1;` décodé
// réintroduit un caractère de contrôle que Postgres refuse.
const strip = (s) =>
  decode(String(s || ''))
    .replace(/<[^>]+>/g, ' ')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '')
    .replace(/(^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
// 🔴 `strip` AVANT de slugifier, toujours. Slugifier le nom brut transformait
// « Sorrento Lemon&#xA0;Scentsy&#xA0;Charm Clip » en
// « sorrento-lemon-xa0-scentsy-xa0-charm-clip » — et le slug porte la contrainte
// `@@unique([companyId, slug])`, donc c'est du déchet qui reste.
const slugify = (s) =>
  strip(s).toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// Un prix doit être un NOMBRE plausible. « 1 299,00 » et « $19.90 » doivent
// passer ; un numéro d'article ou une année ne doivent pas devenir un prix.
// 🔴 Le plafond est celui de la BASE, pas une intuition sur « ce qu'un produit
// peut coûter ». `MlmProduct.price` est un `Decimal(10,2)`, donc 99 999 999,99
// au maximum : au-delà, l'insertion échoue. Et il FAUT aller si haut, parce
// qu'un produit à 150 000 IDR, 2 000 000 VND ou 5 582 ISK est banal — un
// plafond à 1 000 000 (première version) jetait ces prix en silence.
const PRIX_MAX = 1e8
const prixValide = (n) => (isFinite(n) && n > 0 && n < PRIX_MAX ? n : null)

function prixDe(v) {
  if (v == null) return null
  if (typeof v === 'number') return prixValide(v)
  // 🔴 ON EXTRAIT un nombre commençant par un CHIFFRE, on ne « nettoie » pas la
  // chaîne. Première version : `String(v).replace(/[^\d.,-]/g,'')` transformait
  // « réf. 20260101 » en « .20260101 », soit un prix de 0,20 € écrit en base.
  // Le point de « réf. » survivait au nettoyage. Attrapé par un témoin.
  // ⚠️ LIMITE ASSUMÉE : l'espace comme séparateur de milliers (« 1 299,50 »)
  // n'est pas géré, et le motif s'arrête au premier espace. C'est volontaire :
  // les trois lectures de ce script portent sur des champs STRUCTURÉS
  // (`offers.price`, `og:price:amount`, `itemprop="price"`) qui écrivent un
  // nombre nu. Le texte libre du HTML n'est jamais analysé ici — et c'est là
  // que « 12 produits en stock » deviendrait un prix de 12.
  const m = String(v).match(/\d[\d.,]*/)
  if (!m) return null
  const s = m[0].replace(/[.,]+$/, '')
  const dernier = Math.max(s.lastIndexOf('.'), s.lastIndexOf(','))
  const apres = dernier > -1 ? s.length - dernier - 1 : -1
  const deuxTypes = s.includes('.') && s.includes(',')
  const combien = (s.match(/[.,]/g) || []).length
  // 🔴 « 18.0000 » vaut 18, pas 180000. Première règle écrite ici : « le
  // séparateur décimal ne précède que 1 ou 2 chiffres » — elle prenait les
  // QUATRE décimales du JSON-LD de Scentsy pour des milliers et écrivait des
  // prix multipliés par 10 000. Vu dans l'échantillon, pas par un témoin.
  // La règle juste :
  //   deux types de séparateurs  → le DERNIER est décimal, l'autre les milliers
  //   un seul type, répété       → séparateur de milliers (1.234.567)
  //   un seul, 3 chiffres après  → milliers (1.299 = 1299)
  //   un seul, 1-2 ou 4+ après   → décimal (19,90 · 18.0000)
  const decimal = dernier > -1 && (deuxTypes || combien === 1) && apres !== 3
  const nettoye = decimal
    ? s.slice(0, dernier).replace(/[.,]/g, '') + '.' + s.slice(dernier + 1)
    : s.replace(/[.,]/g, '')
  return prixValide(parseFloat(nettoye))
}

async function get(url, { asJson = false, timeout = 15000 } = {}) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeout)
  try {
    const r = await fetch(url, {
      signal: ctrl.signal, redirect: 'follow',
      headers: { 'user-agent': UA, accept: asJson ? 'application/json,*/*;q=0.8' : 'text/html,application/xhtml+xml,*/*;q=0.8' },
    })
    if (!r.ok) return null
    if (asJson) return (r.headers.get('content-type') || '').includes('json') ? await r.json().catch(() => null) : null
    return await r.text()
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

// ── les 4 lectures gratuites, de la plus fiable à la plus approximative ────

// 1. Shopify : une URL de produit suffixée `.json` rend l'objet complet. Des
//    boutiques Shopify passent au travers de shop-harvest quand /products.json
//    est fermé à la racine mais ouvert produit par produit.
async function viaShopifyJson(url) {
  const d = await get(`${url.replace(/\/$/, '')}.json`, { asJson: true })
  const p = d?.product
  if (!p?.title) return null
  const prix = (p.variants || []).map((v) => prixDe(v.price)).filter(Boolean)
  return {
    methode: 'shopify-json',
    name: strip(p.title),
    slug: p.handle || slugify(p.title),
    category: strip(p.product_type) || null,
    description: strip(p.body_html).slice(0, 800) || null,
    price: prix.length ? Math.min(...prix) : null,
    currency: null,
    format: p.variants?.[0]?.title && p.variants[0].title !== 'Default Title' ? strip(p.variants[0].title).slice(0, 120) : null,
    imageUrl: p.images?.[0]?.src || p.image?.src || null,
  }
}

// 2. JSON-LD `Product` : le format que Google exige pour les résultats
//    enrichis. 🔴 Trois formes dans la vraie vie — objet seul, tableau,
//    ou imbriqué dans un `@graph`. N'en gérer qu'une, c'est rater les autres.
function viaJsonLd(html) {
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    let d
    try { d = JSON.parse(m[1].trim()) } catch { continue }
    const file = Array.isArray(d) ? [...d] : [d]
    while (file.length) {
      const n = file.shift()
      if (!n || typeof n !== 'object') continue
      if (Array.isArray(n['@graph'])) file.push(...n['@graph'])
      if (Array.isArray(n.itemListElement)) file.push(...n.itemListElement.map((x) => x?.item ?? x))
      const t = Array.isArray(n['@type']) ? n['@type'] : [n['@type']]
      if (!t.some((x) => typeof x === 'string' && /(^|\/)product$/i.test(x))) continue
      if (typeof n.name !== 'string' || !n.name.trim()) continue
      const o = Array.isArray(n.offers) ? n.offers[0] : n.offers
      const img = Array.isArray(n.image) ? n.image[0] : n.image
      return {
        methode: 'json-ld',
        name: strip(n.name),
        slug: slugify(n.sku || n.name),
        category: strip(typeof n.category === 'string' ? n.category : '') || null,
        description: strip(typeof n.description === 'string' ? n.description : '').slice(0, 800) || null,
        price: prixDe(o?.price ?? o?.lowPrice),
        currency: typeof o?.priceCurrency === 'string' ? o.priceCurrency.toUpperCase().slice(0, 3) : null,
        format: null,
        imageUrl: typeof img === 'string' ? img : img?.url || null,
      }
    }
  }
  return null
}

// 3. Open Graph produit : `product:price:amount` est posé par la plupart des
//    moteurs de boutique, même sans JSON-LD.
function viaOpenGraph(html) {
  const meta = (n) => {
    const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${n}["'][^>]+content=["']([^"']*)["']`, 'i'))
      || html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${n}["']`, 'i'))
    return m ? strip(m[1]) : null
  }
  const nom = meta('og:title')
  const prix = prixDe(meta('product:price:amount') || meta('og:price:amount'))
  if (!nom || !prix) return null
  return {
    methode: 'open-graph',
    name: nom, slug: slugify(nom),
    category: null,
    description: (meta('og:description') || '').slice(0, 800) || null,
    price: prix,
    currency: (meta('product:price:currency') || meta('og:price:currency') || '').toUpperCase().slice(0, 3) || null,
    format: null,
    imageUrl: meta('og:image'),
  }
}

// 4. Microdonnées schema.org : le plus vieux format, encore très présent.
function viaMicrodonnees(html) {
  if (!/itemtype=["']https?:\/\/schema\.org\/Product["']/i.test(html)) return null
  const prop = (p) => {
    const m = html.match(new RegExp(`itemprop=["']${p}["'][^>]*content=["']([^"']*)["']`, 'i'))
      || html.match(new RegExp(`itemprop=["']${p}["'][^>]*>([^<]{1,200})<`, 'i'))
    return m ? strip(m[1]) : null
  }
  const nom = prop('name')
  const prix = prixDe(prop('price'))
  if (!nom || !prix) return null
  return {
    methode: 'microdonnees',
    name: nom, slug: slugify(nom),
    category: null,
    description: (prop('description') || '').slice(0, 800) || null,
    price: prix,
    currency: (prop('priceCurrency') || '').toUpperCase().slice(0, 3) || null,
    format: null,
    imageUrl: prop('image'),
  }
}

// 🔴 `usage` (mode d'emploi) n'est JAMAIS rempli ici, comme dans les deux autres
// scripts : un dosage inventé sur un complément alimentaire est dangereux. Le
// champ reste vide jusqu'à ce qu'une source officielle le donne mot pour mot.
async function lireProduit(url) {
  const sj = await viaShopifyJson(url)
  if (sj) return { ...sj, sourceUrl: url }
  const html = await get(url)
  if (!html) return null
  const r = viaJsonLd(html) || viaOpenGraph(html) || viaMicrodonnees(html)
  return r ? { ...r, sourceUrl: url } : null
}

async function moissonner(origine) {
  const carte = await urlsProduits(origine)
  if (!carte) return { sitemap: null }

  // La sonde : 5 pages. Si rien ne se lit, on n'en charge pas 300 pour rien.
  const sonde = []
  for (const u of carte.urls.slice(0, SONDE)) {
    const p = await lireProduit(u)
    if (p?.name && p.price != null) sonde.push(p)
  }
  if (sonde.length < SONDE_MIN) {
    return { sitemap: carte, lisible: false, sonde: sonde.length }
  }

  const items = [...sonde]
  const vus = new Set(items.map((p) => p.slug))
  for (const u of carte.urls.slice(SONDE, MAX_PRODUITS)) {
    const p = await lireProduit(u)
    if (!p?.name || p.price == null || !p.slug || vus.has(p.slug)) continue
    vus.add(p.slug)
    items.push(p)
  }
  const methodes = [...new Set(items.map((p) => p.methode))]
  return { sitemap: carte, lisible: true, sonde: sonde.length, items, methodes }
}

// ── le programme ───────────────────────────────────────────────────────────
async function main() {
  if (TEST) {
    const ratés = autoTest()
    const essais = [
      ['prix 19,90', prixDe('19,90 €'), 19.9],
      ['prix 1.299,00', prixDe('1.299,00'), 1299],
      ['prix $1,299.00', prixDe('$1,299.00'), 1299],
      // 🔴 Le vrai défaut de la première version : le point de « réf. » était
      // absorbé et « réf. 20260101 » devenait un prix de 0,20 €. Ce témoin
      // garde CE défaut, pas une intuition de grandeur : dans un champ de prix
      // structuré, un nombre EST un prix, quelle que soit sa taille.
      ['pas de point parasite', prixDe('réf. 20260101') < 1 ? 'BUG' : 'ok', 'ok'],
      ['prix zéro', prixDe('0'), null],
      ['prix en IDR', prixDe('150000'), 150000],
      ['au-delà du Decimal(10,2)', prixDe('999999999'), null],
      ['sans chiffre', prixDe('sur devis'), null],
      ['prix 1.299 (milliers)', prixDe('1.299'), 1299],
      ['prix 19.9', prixDe('19.9'), 19.9],
      ['prix nombre', prixDe(24.5), 24.5],
      // 🔴 le cas Scentsy : 4 décimales, lu 180000 par la première version
      ['prix 18.0000 (4 décimales)', prixDe('18.0000'), 18],
      ['prix 1,2345', prixDe('1,2345'), 1.2345],
      ['prix 1.234.567', prixDe('1.234.567'), 1234567],
    ]
    for (const [nom, obtenu, attendu] of essais) {
      if (obtenu !== attendu) ratés.push(`${nom} : ${obtenu} obtenu, ${attendu} attendu`)
    }
    const ld = viaJsonLd('<script type="application/ld+json">{"@graph":[{"@type":"WebSite"},{"@type":"Product","name":"A","offers":{"price":"9.90","priceCurrency":"eur"}}]}</script>')
    if (ld?.price !== 9.9 || ld?.currency !== 'EUR') ratés.push('json-ld @graph mal lu')
    // 🔴 Le piège du 1er novembre : une page qui porte du ld+json de type
    // WebSite ne doit PAS passer pour un produit.
    if (viaJsonLd('<script type="application/ld+json">{"@type":"WebSite","name":"doTERRA"}</script>')) {
      ratés.push('un ld+json WebSite a été pris pour un Product')
    }
    // 🔴 les entités numériques, vues en vrai chez Scentsy et doTERRA
    const ent = [
      ['&#xA0; → espace', strip('Lemon&#xA0;Scentsy&#xA0;Charm'), 'Lemon Scentsy Charm'],
      ['&#x2019; → apostrophe', strip('It&#x2019;s'), 'It’s'],
      ['&#xA; → espace', strip('a&#xA;&#xA;b'), 'a b'],
      ['&amp; en dernier', strip('Thé &amp;#39;vert'), "Thé &#39;vert"],
      ['entité hors limites', strip('x&#x999999;y'), 'xy'],
      ['balises retirées', strip('<p>Huile <b>bio</b></p>'), 'Huile bio'],
      // 🔴 le slug porte une contrainte d'unicité : une entité non décodée y
      // laisserait « xa0 » pour toujours
      ['slug sans entité', slugify('Sorrento Lemon&#xA0;Scentsy Charm'), 'sorrento-lemon-scentsy-charm'],
      ['slug sans accent', slugify('Thé vert bio'), 'the-vert-bio'],
    ]
    for (const [nom, obtenu, attendu] of ent) {
      if (obtenu !== attendu) ratés.push(`${nom} : « ${obtenu} » obtenu, « ${attendu} » attendu`)
    }
    if (ratés.length) { console.error('🔴 témoins ratés :'); for (const r of ratés) console.error('   ' + r); process.exit(1) }
    console.log('✅ tous les témoins passent (motif d\'URL, lecture des prix, json-ld @graph, et le piège WebSite)')
    return
  }

  if (DRY) {
    if (!DRY_URL) throw new Error('--dry <url>')
    const r = await moissonner(new URL(DRY_URL).origin)
    console.log(JSON.stringify({
      sitemap: r.sitemap ? { via: r.sitemap.via, total: r.sitemap.total, cartes: r.sitemap.cartes } : null,
      lisible: r.lisible ?? false, sonde: r.sonde ?? 0, methodes: r.methodes,
      produits: r.items?.length ?? 0, echantillon: r.items?.slice(0, 3),
    }, null, 2))
    return
  }

  const { PrismaClient } = await import('@prisma/client')
  const prisma = new PrismaClient()
  const toutes = await prisma.mlmCompany.findMany({
    where: {
      status: { not: 'ARCHIVED' },
      products: { none: {} },
      ...(ONLY.length ? { brandSlug: { in: ONLY } } : {}),
    },
    select: { id: true, brandSlug: true, country: true, officialUrl: true, status: true, sources: true },
  })
  // La file de CE script : boutique connue, refusée par la moisson structurée.
  let societes = toutes.filter((c) => c.sources?.bfh?.shopUrl && c.sources?.bfh?.shopStructured === false)
  // 🔴 TRIER par rang de momentum, en JS parce que le rang vit dans le JSON
  // `sources.bfh.momentumRank` et que Prisma ne sait pas l'ordonner. Sans ce
  // tri, `--limit 10` prend dix sociétés au hasard dans l'ordre de la base :
  // le premier essai a ainsi rendu « 9 sans sitemap sur 10 », alors que la
  // mesure sur les 80 mieux classées en donnait 40 % avec sitemap. Un
  // échantillon non ordonné ne dit rien de ce que le script vaut.
  const rang = (c) => parseInt(c.sources?.bfh?.momentumRank ?? '99999', 10) || 99999
  societes.sort((a, b) => rang(a) - rang(b))
  if (LIMIT > 0) societes = societes.slice(0, LIMIT)
  console.log(`sociétés à traiter : ${societes.length}`)

  const bilan = { moissonnees: 0, publiees: 0, produits: 0, listesNotees: 0, urls: 0, sansSitemap: 0, erreurs: 0 }
  let i = 0
  async function ouvrier() {
    while (i < societes.length) {
      const c = societes[i++]
      try {
        let origine
        try { origine = new URL(c.sources.bfh.shopUrl).origin } catch { bilan.erreurs++; continue }
        const r = await moissonner(origine)
        const src = c.sources && typeof c.sources === 'object' ? c.sources : {}
        const bfh = src.bfh && typeof src.bfh === 'object' ? src.bfh : {}

        if (!r.sitemap) {
          await prisma.mlmCompany.update({
            where: { id: c.id },
            data: { sources: { ...src, bfh: { ...bfh, sitemap: { trouve: false, testeLe: new Date().toISOString() } } } },
          })
          bilan.sansSitemap++
          // 🔴 Dire lesquelles. Première version : cette branche était MUETTE,
          // donc un essai qui rendait « 9 sans sitemap » ne permettait pas de
          // savoir lesquelles, ni de vérifier à la main si c'était vrai.
          console.log(`· ${c.brandSlug.padEnd(30)} aucun sitemap exploitable sur ${origine}`)
          continue
        }

        // Toujours noter la liste : c'est la valeur principale de ce script.
        const noteSitemap = {
          trouve: true, via: r.sitemap.via, urls: r.sitemap.total,
          lisible: !!r.lisible, testeLe: new Date().toISOString(),
        }
        bilan.urls += r.sitemap.total

        if (r.lisible && r.items?.length) {
          const devise = r.items.find((p) => p.currency)?.currency || deviseDe(c.country)
          const lignes = r.items.slice(0, MAX_PRODUITS).map((p, idx) => ({
            companyId: c.id, name: p.name, slug: p.slug, category: p.category,
            description: p.description, price: p.price, currency: p.currency || devise,
            format: p.format, imageUrl: p.imageUrl, sourceUrl: p.sourceUrl, position: idx,
          }))
          await prisma.mlmProduct.createMany({ data: lignes, skipDuplicates: true })
          const publier = c.status === 'DRAFT' && lignes.length >= MIN_POUR_PUBLIER
          await prisma.mlmCompany.update({
            where: { id: c.id },
            data: {
              sources: { ...src, bfh: { ...bfh, sitemap: noteSitemap,
                shop: { url: origine, platform: `sitemap+${r.methodes.join('+')}`, currency: devise, count: lignes.length, harvestedAt: new Date().toISOString() } } },
              ...(publier ? { status: 'PUBLISHED', publishedAt: new Date() } : {}),
            },
          })
          bilan.moissonnees++
          bilan.produits += lignes.length
          if (publier) bilan.publiees++
          console.log(`✓ ${c.brandSlug.padEnd(30)} ${String(lignes.length).padStart(4)} produits · ${r.methodes.join('+')}${publier ? ' → PUBLIÉE' : ''}`)
        } else {
          await prisma.mlmCompany.update({
            where: { id: c.id },
            data: { sources: { ...src, bfh: { ...bfh, sitemap: noteSitemap } } },
          })
          bilan.listesNotees++
          console.log(`~ ${c.brandSlug.padEnd(30)} ${String(r.sitemap.total).padStart(4)} URL notées pour Firecrawl (sonde ${r.sonde}/${SONDE})`)
        }
      } catch (e) {
        bilan.erreurs++
        console.log(`✗ ${c.brandSlug} : ${String(e?.message || e).replace(/\s+/g, ' ').slice(0, 140)}`)
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCE }, ouvrier))

  console.log(`\nRésultat : ${bilan.moissonnees} moissonnées gratuitement (${bilan.produits} produits, ${bilan.publiees} publiées)`)
  console.log(`           ${bilan.listesNotees} listes d'URL notées pour Firecrawl · ${bilan.urls} URL de produits trouvées au total`)
  console.log(`           ${bilan.sansSitemap} sans sitemap · ${bilan.erreurs} erreurs`)
  await prisma.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
