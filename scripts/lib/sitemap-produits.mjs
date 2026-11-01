// Trouver les URL de produits d'une boutique par son SITEMAP. Gratuit, sans JS,
// sans IA, toutes plateformes.
//
// 🔴 POURQUOI CE MODULE EXISTE.
// `shop-firecrawl.mjs` payait Firecrawl pour ce travail : deux appels `/v1/map`
// par société, dont le second porte `search: 'product'` avec, en commentaire,
// « ressort les URLs produit des sitemaps (vérifié sur USANA) ». On payait donc
// la lecture d'un fichier public. Et le plafond de Firecrawl (400 liens, puis
// 50 pages scrapées) était bien en dessous de ce que les sitemaps contiennent :
// mesuré le 1er novembre 2026, doTERRA en déclare 5 999, Forever Living 8 265,
// Nu Skin 4 987 — 22 321 URL sur 12 sociétés.
//
// Mesure du même jour, sur les 80 boutiques non structurées les mieux classées :
// 32 ont un sitemap de produits exploitable, soit 40 %.
//
// Utilisé par `shop-sitemap.mjs` (étage gratuit) ET par `shop-firecrawl.mjs`
// (qui s'en sert avant de dépenser). Un seul endroit : deux copies divergent.

import { gunzipSync } from 'node:zlib'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

// Combien de cartes on accepte d'ouvrir. Un index peut en déclarer des
// centaines ; au-delà on a largement de quoi faire et on arrête d'insister.
const CARTES_MAX = 8
const URLS_MAX = 5000

// 🔴 DEUX FORMES, et la seconde m'a échappé au premier essai.
//  · segment au MILIEU du chemin : /products/x, /produit/x, /p/x
//  · segment `/p` À LA FIN, sans barre oblique : c'est la convention VTEX, très
//    répandue au Brésil et en Amérique latine. Amakha Paris déclare
//    « /shampoo-mel-capilar-300ml/p » et mon motif, qui exigeait « /p/ », le
//    rejetait — donc « aucun sitemap exploitable » sur un site qui en a un.
// Le pluriel « /products » n'accepte PAS la fin de chemin : ce serait la page
// de catégorie, pas un produit.
export const EST_URL_PRODUIT =
  /\/(?:products?|produits?|productos?|produkte?|prodott[io]|produtos?|artikel|item)\/|\/p(?:\/|\?|$)/i

// 🔴 PAS de `item` ici. « item » est contenu dans « s-i-t-e-m-ap » : avec lui,
// TOUTE carte de sitemap passait pour une carte de produits, donc toutes leurs
// URL étaient crues sur parole — la page d'accueil et des articles de blog
// entraient parmi les produits, et doTERRA passait de 5 999 à 15 306 « URL de
// produits ». Troisième faute de ce type en une journée, après `mage\/` qui
// matchait `image/` et `Pro` qui matchait `Promise`.
const NOM_CARTE_PRODUIT =
  /(product|produit|producto|produkt|prodott|produto|shop|store|catalog|katalog)/i

// 🔴 Une carte nommée « product_cat » ou « taxonomies-product_brand » contient
// des CATÉGORIES, pas des produits. Sans cette exclusion, WordPress ferait
// entrer ses pages de taxonomie parmi les produits. ⚠️ Ne PAS exclure « post »
// ni « page » : WordPress nomme sa vraie carte produits
// « wp-sitemap-posts-product-1.xml », et BigCommerce la sienne
// « xmlsitemap.php?type=products&page=1 ».
const EXCLURE_CARTE = /categor|taxonom|_cat|brand|marque|\/tag|news|blog|article|author/i

// 🔴 On distingue « injoignable » de « rien trouvé ». Le `fetch` de Node
// (undici) échoue en UND_ERR_SOCKET sur certains serveurs là où curl réussit —
// soulpurpose.com en est un, et il A un sitemap WordPress bien formé. Annoncer
// « aucun sitemap » dans ce cas, c'est ranger un problème de transport parmi
// les sites qui n'en ont pas : la classe réparable disparaît du relevé.
let injoignables = 0
export const compteurInjoignables = () => injoignables

async function lire(url, timeout = 15000) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeout)
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { 'user-agent': UA, accept: 'application/xml,text/xml,text/plain,*/*;q=0.8' },
    })
    if (!r.ok) return null
    const brut = Buffer.from(await r.arrayBuffer())
    // 🔴 Un sitemap compressé est COURANT (`sitemap.xml.gz`). `fetch` décompresse
    // le Content-Encoding, pas un fichier .gz : sans ce test on lit des octets
    // binaires et on conclut « aucun sitemap » sur des sites qui en ont un.
    const gz = brut.length > 2 && brut[0] === 0x1f && brut[1] === 0x8b
    return (gz ? gunzipSync(brut) : brut).toString('utf8')
  } catch (e) {
    // UND_ERR_SOCKET / ECONNRESET / EPROTO : le serveur refuse CE client, pas
    // le chemin demandé. ENOTFOUND / 404 ne passent pas ici (null plus haut).
    if (/SOCKET|ECONNRESET|EPROTO|ETIMEDOUT/i.test(String(e?.cause?.code || e?.message || ''))) injoignables++
    return null
  } finally {
    clearTimeout(t)
  }
}

const locs = (xml) =>
  [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) =>
    m[1].replace(/&amp;/g, '&').replace(/&#38;/g, '&')
  )

// Les sitemaps que le site DÉCLARE, plus les emplacements conventionnels.
async function departs(origine) {
  const liste = []
  const robots = await lire(`${origine}/robots.txt`, 9000)
  if (robots) {
    for (const m of robots.matchAll(/^\s*sitemap:\s*(\S+)/gim)) {
      try { liste.push(new URL(m[1], origine).href) } catch { /* ligne illisible */ }
    }
  }
  for (const p of [
    '/sitemap.xml', '/sitemap_index.xml', '/sitemap-index.xml', '/sitemap.xml.gz',
    '/wp-sitemap.xml', // WordPress depuis la 5.5, quand robots.txt ne le dit pas
    '/xmlsitemap.php', // 🔴 BigCommerce : adornableu.com n'a NI robots.txt qui le
                       // déclare NI /sitemap.xml (404), et c'est là que vit le sien
    '/sitemap_products_1.xml', // Shopify, quand la racine est fermée
  ]) {
    liste.push(`${origine}${p}`)
  }
  return [...new Set(liste)]
}

/**
 * Les URL de produits d'une boutique, lues dans son sitemap.
 * @returns {Promise<{via: string, urls: string[], total: number, cartes: number} | null>}
 */
export async function urlsProduits(origine, { urlsMax = URLS_MAX } = {}) {
  for (const depart of await departs(origine)) {
    const xml = await lire(depart)
    if (!xml || !/<(urlset|sitemapindex)/i.test(xml)) continue

    const tout = locs(xml)
    if (!tout.length) continue

    // 🔴 C'est la RACINE du XML qui dit ce que sont ces <loc>, pas leur
    // extension. Première version : je filtrais les sous-cartes sur `.xml`, et
    // BigCommerce déclare les siennes en « xmlsitemap.php?type=products&page=1 »
    // — l'index d'adornableu.com était donc lu comme ne contenant aucune carte,
    // et le site ressortait « aucune URL de produit ». Demander à la chose qui
    // sait plutôt que de deviner d'après un nom de fichier.
    if (!/<sitemapindex/i.test(xml)) {
      const directes = [...new Set(tout.filter((u) => EST_URL_PRODUIT.test(u)))]
      if (directes.length >= 3) {
        return { via: depart, urls: directes.slice(0, urlsMax), total: directes.length, cartes: 1 }
      }
      continue
    }

    // Index : TOUS les <loc> sont des cartes. On n'ouvre que celles dont le NOM
    // parle de produits — ouvrir les 300 cartes d'un grand site coûterait des
    // minutes pour trouver la même chose.
    const prioritaires = tout.filter((u) => NOM_CARTE_PRODUIT.test(u) && !EXCLURE_CARTE.test(u))
    // Quand une carte a été choisie PARCE QUE son nom dit « produits », le site
    // a lui-même déclaré son contenu : on le croit.
    const parNom = prioritaires.length > 0
    const aOuvrir = (parNom ? prioritaires : tout).slice(0, CARTES_MAX)

    const trouvees = new Set()
    let ouvertes = 0
    for (const c of aOuvrir) {
      const x2 = await lire(c)
      if (!x2) continue
      ouvertes++
      for (const u of locs(x2)) {
        // 🔴 Si la carte est nommée « produits », TOUTES ses URL sont des
        // produits, par déclaration du site. Filtrer sur la forme de l'URL
        // jetterait l'information que l'index vient de donner : BigCommerce
        // liste « /boho-ring/ », un slug nu sans segment /product/, et
        // adornableu.com ressortait donc « aucune URL de produit » alors que
        // sa carte en déclare 133.
        if (parNom || EST_URL_PRODUIT.test(u)) trouvees.add(u)
      }
      if (trouvees.size >= urlsMax) break
    }
    if (trouvees.size >= 3) {
      return { via: depart, urls: [...trouvees].slice(0, urlsMax), total: trouvees.size, cartes: ouvertes }
    }
  }
  return null
}

// ── témoins ────────────────────────────────────────────────────────────────
// 🔴 Appelé par `shop-sitemap.mjs --test`. Un motif d'URL de produit est le
// genre de chose qui matche tout ou rien sans qu'on s'en aperçoive : le 1er
// novembre, une empreinte `mage\/` a déclaré 45 sites « Magento » sur 80 parce
// qu'elle matchait `image/`. Ces témoins sont là pour que ça ne repasse pas.
export function autoTest() {
  const doit = [
    'https://x.com/products/reserve',
    'https://x.com/en/produit/huile',
    'https://x.com/de/produkte/oel',
    'https://x.com/shop/product/bouteille',
    'https://x.com/p/alpha-crs',
    // 🔴 VTEX : le segment produit est en FIN de chemin, sans barre oblique
    'https://www.amakhaparis.com.br/shampoo-mel-capilar-300ml/p',
    'https://x.com/produto/oleo/',
  ]
  const neDoitPas = [
    'https://x.com/media/image/logo.png',
    'https://x.com/about-us',
    'https://x.com/blog/productivity-tips', // 🔴 « productivity » contient « product »
    'https://x.com/pages/privacy', // 🔴 contient « /p » mais suivi d'une lettre
    'https://x.com/products', // page de CATÉGORIE : le pluriel en fin n'est pas un produit
  ]
  const ratés = []
  for (const u of doit) if (!EST_URL_PRODUIT.test(u)) ratés.push(`manqué : ${u}`)
  for (const u of neDoitPas) if (EST_URL_PRODUIT.test(u)) ratés.push(`faux positif : ${u}`)

  // Le choix des CARTES, mesuré sur les noms réels rencontrés le 1er nov 2026.
  const carte = (u) => NOM_CARTE_PRODUIT.test(u) && !EXCLURE_CARTE.test(u)
  const cartesOui = [
    'https://soulpurpose.com/wp-sitemap-posts-product-1.xml', // WordPress
    'https://www.adornableu.com/xmlsitemap.php?type=products&page=1', // BigCommerce
    'https://www.amakhaparis.com.br/sitemap/product-0.xml', // VTEX
  ]
  const cartesNon = [
    'https://soulpurpose.com/wp-sitemap-taxonomies-product_cat-1.xml',
    'https://soulpurpose.com/wp-sitemap-taxonomies-product_brand-1.xml',
    'https://x.com/sitemap/category-0.xml',
    'https://x.com/wp-sitemap-posts-post-1.xml',
  ]
  for (const u of cartesOui) if (!carte(u)) ratés.push(`carte produits manquée : ${u}`)
  for (const u of cartesNon) if (carte(u)) ratés.push(`carte non-produits retenue : ${u}`)
  return ratés
}
