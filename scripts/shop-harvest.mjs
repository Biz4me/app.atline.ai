// Moissonneur de catalogues produits depuis les sites OFFICIELS des sociétés MLM.
// Pour chaque MlmCompany avec officialUrl et SANS produits : trouve la boutique
// (lien shop/store/boutique + sous-domaines shop./store.), puis récolte structurée :
//   - Shopify : /products.json (gratuit, sans JS)
//   - WooCommerce : /wp-json/wc/store/v1/products (API publique)
// Produits → MlmProduct (usage/dosage JAMAIS inventé : laissé vide, règle sécurité).
// Société DRAFT avec ≥3 produits récoltés → PUBLISHED (source officielle = validée,
// directive Patrice 27 juil) ; REVIEW/ARCHIVED jamais touchés. Boutique trouvée mais
// non structurée → notée dans sources.bfh.shopCandidate (future passe Firecrawl).
//
// Usage :  node scripts/shop-harvest.mjs --dry https://www.foreverliving.com
//          node scripts/shop-harvest.mjs [--only slug1,slug2]

const DRY = process.argv.includes('--dry')
const DRY_URL = DRY ? process.argv[process.argv.indexOf('--dry') + 1] : null
const ONLY = process.argv.includes('--only')
  ? (process.argv[process.argv.indexOf('--only') + 1] || '').split(',').filter(Boolean)
  : []
const CONCURRENCY = 6
const MAX_PRODUCTS = 400
const MIN_TO_PUBLISH = 3

const EUR = new Set(['DE','FR','IT','ES','NL','BE','AT','PT','IE','FI','GR','SI','SK','EE','LV','LT','LU','CY','MT'])
const CUR = { US:'USD',PR:'USD',CA:'CAD',GB:'GBP',AU:'AUD',NZ:'NZD',JP:'JPY',CH:'CHF',SE:'SEK',NO:'NOK',DK:'DKK',PL:'PLN',CZ:'CZK',HU:'HUF',RO:'RON',TR:'TRY',IN:'INR',MY:'MYR',SG:'SGD',TH:'THB',ID:'IDR',PH:'PHP',KR:'KRW',CN:'CNY',HK:'HKD',TW:'TWD',BR:'BRL',MX:'MXN',AE:'AED',ZA:'ZAR',UA:'UAH',VN:'VND' }
const currencyFor = (cc) => CUR[cc] || (EUR.has(cc) ? 'EUR' : 'USD')

const strip = (s) => (s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
const slugify = (s) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

async function get(url, { asJson = false, timeout = 12000 } = {}) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeout)
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; AtlineBot/1.0; +https://atline.ai)' },
    })
    if (!res.ok) return null
    return asJson ? await res.json().catch(() => null) : await res.text()
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

// Origines candidates : l'URL boutique DÉCOUVERTE (shop-discover, sources.bfh.shopUrl)
// d'abord, puis le site officiel en repli.
function shopCandidates(shopUrl, officialUrl) {
  const out = new Set()
  for (const u of [shopUrl, officialUrl]) {
    try { if (u) out.add(new URL(u).origin) } catch {}
  }
  return [...out]
}

async function harvestShopify(origin) {
  const products = []
  for (let page = 1; page <= 2 && products.length < MAX_PRODUCTS; page++) {
    const data = await get(`${origin}/products.json?limit=250&page=${page}`, { asJson: true })
    if (!data?.products?.length) break
    products.push(...data.products)
  }
  if (!products.length) return null
  // Devise : le thème l'embarque dans la home ; repli sur le pays plus tard.
  const home = await get(origin, { timeout: 8000 })
  const cm = home?.match(/Shopify\.currency[^}]*"active"\s*:\s*"([A-Z]{3})"/) || home?.match(/"currency"\s*:\s*"([A-Z]{3})"/)
  return {
    platform: 'shopify',
    currency: cm?.[1] || null,
    items: products.filter((p) => p?.title).map((p) => {
      const v = p.variants?.[0]
      const prices = (p.variants || []).map((x) => parseFloat(x.price)).filter((n) => !isNaN(n))
      return {
        name: strip(p.title),
        slug: p.handle || slugify(p.title),
        category: strip(p.product_type) || null,
        description: strip(p.body_html).slice(0, 800) || null,
        price: prices.length ? Math.min(...prices) : null,
        format: v && v.title && v.title !== 'Default Title' ? strip(v.title).slice(0, 120) : null,
        imageUrl: p.images?.[0]?.src || null,
        sourceUrl: `${origin}/products/${p.handle}`,
      }
    }),
  }
}

async function harvestWoo(origin) {
  const items = []
  let currency = null
  for (let page = 1; page <= 4 && items.length < MAX_PRODUCTS; page++) {
    const data = await get(`${origin}/wp-json/wc/store/v1/products?per_page=100&page=${page}`, { asJson: true })
    if (!Array.isArray(data) || !data.length) break
    for (const p of data) {
      if (!p?.name) continue
      const minor = p.prices?.currency_minor_unit ?? 2
      const raw = parseFloat(p.prices?.price)
      currency = p.prices?.currency_code || currency
      items.push({
        name: strip(p.name),
        slug: p.slug || slugify(p.name),
        category: strip(p.categories?.[0]?.name) || null,
        description: strip(p.description || p.short_description).slice(0, 800) || null,
        price: isNaN(raw) ? null : raw / 10 ** minor,
        format: null,
        imageUrl: p.images?.[0]?.src || null,
        sourceUrl: p.permalink || null,
      })
    }
    if (data.length < 100) break
  }
  return items.length ? { platform: 'woocommerce', currency, items } : null
}

async function findCatalog(shopUrl, officialUrl) {
  const candidates = shopCandidates(shopUrl, officialUrl)
  for (const origin of candidates) {
    const shopify = await harvestShopify(origin)
    if (shopify) return { origin, ...shopify }
  }
  for (const origin of candidates) {
    const woo = await harvestWoo(origin)
    if (woo) return { origin, ...woo }
  }
  return null
}

async function main() {
  if (DRY) {
    if (!DRY_URL) throw new Error('--dry <url>')
    const r = await findCatalog(DRY_URL, null)
    console.log(JSON.stringify({ ...r, items: r?.items?.slice(0, 5), total: r?.items?.length }, null, 2))
    return
  }

  const { PrismaClient } = await import('@prisma/client')
  const prisma = new PrismaClient()
  const all = await prisma.mlmCompany.findMany({
    where: {
      status: { not: 'ARCHIVED' },
      products: { none: {} },
      ...(ONLY.length ? { brandSlug: { in: ONLY } } : {}),
    },
    select: { id: true, brandSlug: true, country: true, officialUrl: true, status: true, sources: true },
  })
  // Lot 1 : uniquement les sociétés dont shop-discover a trouvé l'URL boutique.
  const companies = all.filter((c) => c.sources?.bfh?.shopUrl)
  console.log(`sociétés à moissonner : ${companies.length}`)

  const stats = { harvested: 0, published: 0, candidates: 0, empty: 0, products: 0 }
  let i = 0
  async function worker() {
    while (i < companies.length) {
      const c = companies[i++]
      const r = await findCatalog(c.sources.bfh.shopUrl, c.officialUrl).catch(() => null)
      const src = c.sources && typeof c.sources === 'object' ? c.sources : {}
      const bfh = src.bfh && typeof src.bfh === 'object' ? src.bfh : {}

      if (r?.items?.length) {
        const currency = r.currency || currencyFor(c.country)
        const seen = new Set()
        const rows = r.items
          .filter((p) => p.slug && !seen.has(p.slug) && seen.add(p.slug))
          .map((p, idx) => ({ companyId: c.id, ...p, currency, position: idx }))
        await prisma.mlmProduct.createMany({ data: rows, skipDuplicates: true })
        const publish = c.status === 'DRAFT' && rows.length >= MIN_TO_PUBLISH
        await prisma.mlmCompany.update({
          where: { id: c.id },
          data: {
            sources: { ...src, bfh: { ...bfh, shop: { url: r.origin, platform: r.platform, currency, count: rows.length, harvestedAt: new Date().toISOString() } } },
            ...(publish ? { status: 'PUBLISHED', publishedAt: new Date() } : {}),
          },
        })
        stats.harvested++
        stats.products += rows.length
        if (publish) stats.published++
        console.log(`✓ ${c.brandSlug} : ${r.platform} ×${rows.length} (${currency})${publish ? ' → PUBLIÉE' : ''}`)
      } else {
        // Boutique connue mais pas lisible en structuré → file Firecrawl (lot 2).
        await prisma.mlmCompany.update({
          where: { id: c.id },
          data: { sources: { ...src, bfh: { ...bfh, shopStructured: false } } },
        })
        stats.empty++
      }
      if (i % 50 === 0) console.log(`… ${i}/${companies.length}`)
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))

  console.log(`\nRésultat : ${stats.harvested} catalogues (${stats.products} produits) · ${stats.published} publiées · ${stats.empty} boutiques non structurées (file Firecrawl)`)
  await prisma.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
