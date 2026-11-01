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

export const EST_URL_PRODUIT =
  /\/(products?|produits?|productos?|produkte?|prodott[io]|produtos?|artikel|item|p)\//i

const NOM_CARTE_PRODUIT =
  /(product|produit|producto|produkt|prodott|produto|shop|store|item|catalog|katalog)/i

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
  } catch {
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
  for (const p of ['/sitemap.xml', '/sitemap_index.xml', '/sitemap-index.xml', '/sitemap.xml.gz']) {
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

    // Cas 1 : la carte liste directement des produits.
    const directes = tout.filter((u) => EST_URL_PRODUIT.test(u))
    if (directes.length >= 3) {
      const urls = [...new Set(directes)].slice(0, urlsMax)
      return { via: depart, urls, total: directes.length, cartes: 1 }
    }

    // Cas 2 : c'est un index. On n'ouvre que les cartes dont le NOM parle de
    // produits — ouvrir les 300 cartes d'un grand site coûterait des minutes
    // pour trouver la même chose.
    const sousCartes = tout.filter((u) => /\.xml(\.gz)?(\?|$)/i.test(u))
    const prioritaires = sousCartes.filter((u) => NOM_CARTE_PRODUIT.test(u))
    const aOuvrir = (prioritaires.length ? prioritaires : sousCartes).slice(0, CARTES_MAX)

    const trouvees = new Set()
    let ouvertes = 0
    for (const c of aOuvrir) {
      const x2 = await lire(c)
      if (!x2) continue
      ouvertes++
      for (const u of locs(x2)) if (EST_URL_PRODUIT.test(u)) trouvees.add(u)
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
  ]
  const neDoitPas = [
    'https://x.com/media/image/logo.png',
    'https://x.com/about-us',
    'https://x.com/blog/productivity-tips', // 🔴 « productivity » contient « product »
    'https://x.com/pages/privacy',
  ]
  const ratés = []
  for (const u of doit) if (!EST_URL_PRODUIT.test(u)) ratés.push(`manqué : ${u}`)
  for (const u of neDoitPas) if (EST_URL_PRODUIT.test(u)) ratés.push(`faux positif : ${u}`)
  return ratés
}
