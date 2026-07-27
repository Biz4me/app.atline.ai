// Récolte Firecrawl des boutiques NON structurées (ni Shopify ni Woo), par PRIORITÉ :
// distributeurs Atline d'abord (Forever Living…), puis rang momentum. Consomme les
// crédits Firecrawl EXISTANTS avec réserve de sécurité — s'arrête net sous le seuil.
// map (liens produits) → scrape markdown → Flash extrait les champs (JAMAIS inventés,
// usage/dosage laissé vide) → MlmProduct. DRAFT avec ≥3 produits → PUBLISHED.
//
// Usage :  FIRECRAWL_KEY=... OPENROUTER_KEY=... DATABASE_URL=... \
//            node scripts/shop-firecrawl.mjs [--limit 20] [--reserve 1500] [--only slug]

const FKEY = (process.env.FIRECRAWL_KEY || '').trim()
const OKEY = (process.env.OPENROUTER_KEY || '').trim()
if (!FKEY || !OKEY) throw new Error('FIRECRAWL_KEY et OPENROUTER_KEY requis')
const LIMIT = process.argv.includes('--limit') ? parseInt(process.argv[process.argv.indexOf('--limit') + 1], 10) : 20
const RESERVE = process.argv.includes('--reserve') ? parseInt(process.argv[process.argv.indexOf('--reserve') + 1], 10) : 1500
const ONLY = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null
const PAGES_MAX = 50
const MIN_TO_PUBLISH = 3

const EUR = new Set(['DE','FR','IT','ES','NL','BE','AT','PT','IE','FI','GR','SI','SK','EE','LV','LT','LU','CY','MT'])
const CUR = { US:'USD',CA:'CAD',GB:'GBP',AU:'AUD',NZ:'NZD',JP:'JPY',CH:'CHF',SE:'SEK',NO:'NOK',DK:'DKK',PL:'PLN',CZ:'CZK',HU:'HUF',TR:'TRY',IN:'INR',MY:'MYR',SG:'SGD',TH:'THB',ID:'IDR',PH:'PHP',KR:'KRW',CN:'CNY',HK:'HKD',TW:'TWD',BR:'BRL',MX:'MXN',AE:'AED',ZA:'ZAR' }
const currencyFor = (cc) => CUR[cc] || (EUR.has(cc) ? 'EUR' : 'USD')
const clean = (s) => [...String(s || '')].filter((ch) => ch.charCodeAt(0) > 31 || ch === '\n').join('')
const slugify = (s) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

let llmCost = 0
async function fjson(url, body, timeout = 90000) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeout)
  try {
    const res = await fetch(url, {
      method: body ? 'POST' : 'GET',
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${FKEY}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    return await res.json().catch(() => null)
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

const credits = async () => (await fjson('https://api.firecrawl.dev/v1/team/credit-usage'))?.data?.remaining_credits ?? null

async function llmExtract(pages) {
  const bloc = pages.map((p, i) => `### PAGE ${i} — ${p.url}\n${p.md.slice(0, 3500)}`).join('\n\n')
  const prompt = `Voici ${pages.length} pages produit d'une boutique. Pour CHAQUE page, extrais le produit principal.

Rends UNIQUEMENT un tableau JSON, un objet par page, dans l'ordre :
[{"page":0,"name":"…","price":12.5,"currency":"EUR","format":"contenance/conditionnement","description":"1-2 phrases factuelles","image":"URL d'image si présente dans le markdown"}]

Règles : N'INVENTE RIEN — "price" = null si aucun prix affiché, "currency" = null si non identifiable (symbole € → EUR, $ ambigu → null), champs absents → null. Ignore les produits recommandés/similaires : un seul produit par page, celui de la page. Page sans produit → {"page":N,"name":null}.

${bloc}`
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OKEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'google/gemini-3.5-flash', messages: [{ role: 'user', content: prompt }], temperature: 0.1, max_tokens: 6000 }),
  })
  if (!res.ok) throw new Error(`openrouter ${res.status}`)
  const data = await res.json()
  llmCost += data.usage?.cost || 0
  const m = (data.choices?.[0]?.message?.content || '').match(/\[[\s\S]*\]/)
  if (!m) return []
  try { return JSON.parse(m[0]) } catch { return [] }
}

const filtreProduits = (links) =>
  links
    .map((l) => (typeof l === 'string' ? l : l?.url))
    .filter(Boolean)
    .filter((u) => /\/(products?|produits?|item|shop\/[^/]+|p)\/[^/]+/i.test(u) && !/\/(account|login|category|collections?|tag|page)\//i.test(u))

async function harvestCompany(c, state) {
  const shopUrl = c.sources.bfh.shopUrl
  const map = await fjson('https://api.firecrawl.dev/v1/map', { url: shopUrl, limit: 400 })
  state.spent += 1
  let links = filtreProduits(map?.links || map?.data?.links || [])
  if (links.length < MIN_TO_PUBLISH) {
    // Boutique SPA (catalogue en JS) : la carte de la RACINE avec recherche « product »
    // ressort les URLs produit des sitemaps (vérifié sur USANA).
    const root = new URL(c.officialUrl || shopUrl).origin
    const map2 = await fjson('https://api.firecrawl.dev/v1/map', { url: root, search: 'product', limit: 300 })
    state.spent += 1
    links = filtreProduits(map2?.links || map2?.data?.links || [])
  }
  const pagesUrls = [...new Set(links)].slice(0, PAGES_MAX)
  if (pagesUrls.length < MIN_TO_PUBLISH) return { skip: `carte sans liens produits (${pagesUrls.length})` }

  const pages = []
  let pi = 0
  await Promise.all(Array.from({ length: 3 }, async () => {
    while (pi < pagesUrls.length) {
      const url = pagesUrls[pi++]
      const r = await fjson('https://api.firecrawl.dev/v1/scrape', { url, formats: ['markdown'], onlyMainContent: true }, 60000)
      state.spent += 1
      const md = r?.data?.markdown
      if (md) pages.push({ url, md: clean(md) })
    }
  }))
  if (pages.length < MIN_TO_PUBLISH) return { skip: `scrape vide (${pages.length}/${pagesUrls.length})` }

  const items = []
  for (let g = 0; g < pages.length; g += 8) {
    const group = pages.slice(g, g + 8)
    const out = await llmExtract(group).catch(() => [])
    for (const o of out) {
      const p = group[o?.page]
      if (!p || !o?.name) continue
      items.push({
        name: clean(String(o.name)).slice(0, 200),
        slug: slugify(String(o.name)),
        description: o.description ? clean(String(o.description)).slice(0, 800) : null,
        price: typeof o.price === 'number' && o.price > 0 ? o.price : null,
        currency: /^[A-Z]{3}$/.test(o.currency || '') ? o.currency : currencyFor(c.country),
        format: o.format ? clean(String(o.format)).slice(0, 120) : null,
        imageUrl: typeof o.image === 'string' && o.image.startsWith('http') ? o.image : null,
        sourceUrl: p.url,
      })
    }
  }
  const seen = new Set()
  const rows = items.filter((p) => p.slug && !seen.has(p.slug) && seen.add(p.slug)).map((p, idx) => ({ companyId: c.id, ...p, position: idx }))
  return { rows }
}

async function main() {
  const { PrismaClient } = await import('@prisma/client')
  const prisma = new PrismaClient()
  const all = await prisma.mlmCompany.findMany({
    where: { status: { not: 'ARCHIVED' }, products: { none: {} }, ...(ONLY ? { brandSlug: ONLY } : {}) },
    select: { id: true, brandSlug: true, country: true, status: true, officialUrl: true, sources: true, _count: { select: { businesses: true } } },
  })
  const rang = (c) => { const m = parseInt(c.sources?.bfh?.momentumRank ?? '', 10); return isNaN(m) ? 9999 : m }
  const todo = all
    .filter((c) => c.sources?.bfh?.shopUrl)
    .sort((a, b) => b._count.businesses - a._count.businesses || rang(a) - rang(b))
    .slice(0, LIMIT)

  let remaining = await credits()
  console.log(`sociétés ciblées : ${todo.length} · crédits Firecrawl restants : ${remaining}`)
  const state = { spent: 0 }
  const stats = { ok: 0, published: 0, products: 0, skipped: 0 }

  for (const c of todo) {
    if (remaining != null && remaining - state.spent < RESERVE) {
      console.log(`STOP : réserve de crédits atteinte (${remaining - state.spent} restants estimés)`)
      break
    }
    try {
      const r = await harvestCompany(c, state)
      if (r.skip) { stats.skipped++; console.log(`✗ ${c.brandSlug} : ${r.skip}`); continue }
      await prisma.mlmProduct.createMany({ data: r.rows, skipDuplicates: true })
      const src = c.sources
      const publish = c.status === 'DRAFT' && r.rows.length >= MIN_TO_PUBLISH
      await prisma.mlmCompany.update({
        where: { id: c.id },
        data: {
          sources: { ...src, bfh: { ...src.bfh, shop: { url: src.bfh.shopUrl, platform: 'firecrawl', count: r.rows.length, harvestedAt: new Date().toISOString() } } },
          ...(publish ? { status: 'PUBLISHED', publishedAt: new Date() } : {}),
        },
      })
      stats.ok++
      stats.products += r.rows.length
      if (publish) stats.published++
      console.log(`✓ ${c.brandSlug} : ×${r.rows.length}${publish ? ' → PUBLIÉE' : ''} (crédits dépensés ~${state.spent})`)
    } catch (e) {
      stats.skipped++
      console.log(`✗ ${c.brandSlug} : ${String(e?.message || e).slice(0, 120)}`)
    }
  }

  console.log(`\nRésultat : ${stats.ok} catalogues (${stats.products} produits) · ${stats.published} publiées · ${stats.skipped} sautées · ~${state.spent} crédits Firecrawl · ${llmCost.toFixed(2)} $ LLM`)
  await prisma.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
