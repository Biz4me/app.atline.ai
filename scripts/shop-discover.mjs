// Découverte des URL boutique/produits de chaque société MLM depuis son site OFFICIEL.
// Étape 1 SEULE (directive Patrice 27 juil) : on trouve le lien, on ne récolte rien,
// on ne publie rien. Résultat → sources.bfh.shopUrl (+ via) ; sans lien → repéré pour
// le briefing. Récolte des catalogues = étape suivante, après validation.
//
// Usage :  node scripts/shop-discover.mjs --dry https://www.foreverliving.com
//          node scripts/shop-discover.mjs

const DRY = process.argv.includes('--dry')
const DRY_URL = DRY ? process.argv[process.argv.indexOf('--dry') + 1] : null
const CONCURRENCY = 8

const strip = (s) => (s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

// Mots boutique (fort) vs produits/catalogue (moyen) vs achat (faible), multilingue.
const W_SHOP = /\b(shop|store|boutique|magasin|tienda|loja|negozio|sklep|webshop|onlineshop|e-?shop)\b/i
const W_PROD = /\b(products?|produits?|produkte|productos?|prodotti|produtos?|catalogu?e?|katalog|gamme|our range)\b/i
const W_BUY = /\b(buy now|buy online|order now|acheter|commander|comprar|kaufen|bestellen|shop now)\b/i
const SOCIAL = /facebook\.|instagram\.|youtube\.|twitter\.|x\.com|linkedin\.|tiktok\.|pinterest\.|whatsapp\.|t\.me\b/i

async function get(url, timeout = 12000) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeout)
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.9,fr;q=0.8',
      },
    })
    if (!res.ok) return { status: res.status }
    return { status: res.status, url: res.url, html: await res.text() }
  } catch {
    return { status: 0 }
  } finally {
    clearTimeout(t)
  }
}

function findShopLink(baseUrl, html) {
  const seen = new Map() // url → meilleur score
  for (const m of html.matchAll(/<a\b[^>]*href="([^"#]+)"[^>]*>([\s\S]{0,200}?)<\/a>/gi)) {
    let u
    try { u = new URL(m[1], baseUrl) } catch { continue }
    if (!/^https?:$/.test(u.protocol) || SOCIAL.test(u.hostname)) continue
    const href = u.href
    const text = strip(m[2])
    const hay = `${text} ${u.hostname}${u.pathname}`
    let score = 0
    if (W_SHOP.test(hay)) score = 3
    else if (W_PROD.test(hay)) score = 2
    else if (W_BUY.test(hay)) score = 1
    if (!score) continue
    // Bonus : lien du même univers de marque (même domaine ou sous-domaine dédié).
    const sameBrand = u.hostname.replace(/^(www|shop|store)\./, '') === new URL(baseUrl).hostname.replace(/^(www|shop|store)\./, '')
    if (sameBrand) score += 0.5
    if ((seen.get(href) ?? 0) < score) seen.set(href, score)
  }
  const best = [...seen.entries()].sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)[0]
  return best ? { url: best[0], score: best[1] } : null
}

// Repli : chemins usuels testés directement quand la home ne donne rien.
async function guessShop(origin) {
  for (const path of ['/shop', '/store', '/products', '/boutique']) {
    const r = await get(origin + path, 8000)
    if (r.status === 200) return origin + path
  }
  return null
}

async function discover(officialUrl) {
  const home = await get(officialUrl)
  if (!home.html) return { status: 'inaccessible', httpStatus: home.status }
  const finalUrl = home.url || officialUrl
  const link = findShopLink(finalUrl, home.html)
  if (link) return { status: 'trouvé', shopUrl: link.url, via: link.score >= 3 ? 'lien boutique' : link.score >= 2 ? 'lien produits' : 'lien achat' }
  const guess = await guessShop(new URL(finalUrl).origin)
  if (guess) return { status: 'trouvé', shopUrl: guess, via: 'chemin deviné' }
  return { status: 'aucun lien' }
}

async function main() {
  if (DRY) {
    if (!DRY_URL) throw new Error('--dry <url>')
    console.log(JSON.stringify(await discover(DRY_URL), null, 2))
    return
  }

  const { PrismaClient } = await import('@prisma/client')
  const prisma = new PrismaClient()
  const companies = await prisma.mlmCompany.findMany({
    where: { officialUrl: { not: null }, status: { not: 'ARCHIVED' } },
    orderBy: { brandSlug: 'asc' },
    select: { id: true, brandSlug: true, officialUrl: true, sources: true },
  })
  console.log(`sociétés à explorer : ${companies.length}`)

  const stats = { trouvé: 0, 'aucun lien': 0, inaccessible: 0 }
  const parVia = {}
  let i = 0
  async function worker() {
    while (i < companies.length) {
      const c = companies[i++]
      const r = await discover(c.officialUrl).catch(() => ({ status: 'inaccessible' }))
      stats[r.status] = (stats[r.status] ?? 0) + 1
      if (r.via) parVia[r.via] = (parVia[r.via] ?? 0) + 1
      const src = c.sources && typeof c.sources === 'object' ? c.sources : {}
      const bfh = src.bfh && typeof src.bfh === 'object' ? src.bfh : {}
      await prisma.mlmCompany.update({
        where: { id: c.id },
        data: {
          sources: {
            ...src,
            bfh: { ...bfh, shopUrl: r.shopUrl ?? null, shopUrlVia: r.via ?? r.status, shopCheckedAt: new Date().toISOString() },
          },
        },
      })
      console.log(`${r.shopUrl ? '✓' : '✗'} ${c.brandSlug} → ${r.shopUrl ?? r.status}`)
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))

  console.log(`\nRésultat : ${stats['trouvé']} avec lien · ${stats['aucun lien']} sans lien · ${stats.inaccessible} sites inaccessibles`)
  console.log('détail :', JSON.stringify(parVia))
  await prisma.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
