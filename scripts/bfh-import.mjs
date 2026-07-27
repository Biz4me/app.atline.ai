// Import référentiel sociétés MLM depuis businessforhome.org (chantier « enrichissement sociétés », T1).
// - Annuaire /companies/ = noms canoniques + annotations de statut (Out of Business / Out of MLM / Acquired…)
// - Fiche EN par société = pays, site officiel, PDG, réseaux + données estimées (stockées dans sources.bfh,
//   USAGE INTERNE UNIQUEMENT : recoupement/priorisation, jamais republiées — base de données protégée UE).
// - Société déjà en base (même brandSlug, tout pays) → fusion de sources.bfh SEULEMENT (name/status/fiche intouchés).
// - Nouvelle société → DRAFT (active) ou ARCHIVED (annotée morte).
//
// Usage :  node scripts/bfh-import.mjs --dry amway,7k-metals   (parse seul, aucune écriture)
//          node scripts/bfh-import.mjs                          (import complet, DATABASE_URL requis)

const BASE = 'https://www.businessforhome.org'
const DRY = process.argv.includes('--dry')
const DRY_SLUGS = DRY ? (process.argv[process.argv.indexOf('--dry') + 1] || '').split(',').filter(Boolean) : []
const CONCURRENCY = 5

const UA = { headers: { 'user-agent': 'AtlineBot/1.0 (+https://atline.ai)' } }

async function fetchText(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, UA)
      if (res.ok) return await res.text()
      if (res.status === 404) return null
    } catch {}
    await new Promise((r) => setTimeout(r, 1000 * (i + 1)))
  }
  return null
}

const strip = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&dollar;/g, '$').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()

// ---------- Annuaire : slug → { name, statusNote } ----------
async function fetchDirectory() {
  const html = await fetchText(`${BASE}/companies/`)
  if (!html) throw new Error('annuaire inaccessible')
  const out = new Map()
  const re = /href="https:\/\/www\.businessforhome\.org\/companies\/([a-z0-9-]+)\/"[^>]*><\/a>[\s\S]{0,300}?archive-card__title">([\s\S]*?)<\/h3>/g
  for (const m of html.matchAll(re)) {
    const slug = m[1]
    const title = strip(m[2])
    const note = title.match(/\(([^)]+)\)\s*$/)
    out.set(slug, {
      name: title.replace(/\s*\([^)]+\)\s*$/, '').trim(),
      statusNote: note ? note[1] : null,
    })
  }
  return out
}

async function fetchSitemapSlugs() {
  const xml = await fetchText(`${BASE}/company-sitemap.xml`)
  if (!xml) return []
  return [...xml.matchAll(/\/companies\/([a-z0-9-]+)\//g)].map((m) => m[1])
}

// ---------- Fiche société ----------
function parseCompany(html) {
  const d = {}
  // Pays : drapeau dans le bloc Country du hero
  const country = html.match(/Country<\/span>([\s\S]{0,500}?)<\/div>/)
  if (country) {
    const flag = country[1].match(/flags\/(\w+)\.png/)
    if (flag) d.countryCode = flag[1].toUpperCase()
    const label = strip(country[1])
    if (label) d.countryLabel = label
  }
  // À propos : CEO, site, réseaux, flag Verified
  for (const m of html.matchAll(/company-about__data-title">([\s\S]*?)<\/span>\s*<span class="company-about__data-value">([\s\S]*?)<\/span>/g)) {
    const key = strip(m[1])
    const val = strip(m[2])
    if (!val || /^N\/A$/i.test(val)) continue
    if (/^CEO$/i.test(key)) d.ceo = val
    else if (/^Website$/i.test(key)) d.website = val.startsWith('http') ? val : `https://${val}`
    else if (/^Facebook$/i.test(key)) d.facebook = val
    else if (/^YouTube$/i.test(key)) d.youtube = val
    else if (/^Instagram$/i.test(key)) d.instagram = val
    else if (/^Twitter$/i.test(key)) d.twitter = val
    else if (/^Revenue 20\d\d$/i.test(key) && /verified/i.test(val)) d.revenueVerified = key.slice(-4)
  }
  // Revenus estimés par année ($ mln)
  for (const m of html.matchAll(/Est\. Revenue (20\d\d)<\/span>\s*<span[^>]*>\s*(?:&dollar;|\$)\s?([\d,.]+)/g)) {
    ;(d.revenueEstMln ||= {})[m[1]] = parseFloat(m[2].replace(/,/g, ''))
  }
  // Métriques du hero (texte aplati) — estimations internes, jamais republiées
  const text = strip(html)
  const grab = (re) => { const m = text.match(re); return m ? m[1] : undefined }
  d.momentumRank = grab(/Momentum Rank (\d+)/)
  d.businessGrade = grab(/Business Grade ([A-Z]{1,3}[+\-]?) Rank/)
  d.rating = grab(/([\d.]+) out of \d stars/)
  d.reviewsCount = grab(/based on (\d+) reviews/)
  d.payoutPerYear = grab(/Est\. per year \$?([\d,.]+ ?(?:billion|million)?)/i)
  d.youtubeViews = grab(/YouTube Views ([\d,]+) Rank/)
  d.youtubeSubscribers = grab(/Subscribers ([\d,]+) Rank/)
  d.similarWebRank = grab(/SimilarWeb Rank (\d+) Rank/)
  d.topEarnersCount = grab(/Top Earners (\d+) Rank/)
  d.recommendedDistCount = grab(/Recommended Dist\. (\d+) Rank/)
  d.bfhPageViews = grab(/BFH Page Views ([\d,]+) Rank/)
  d.newsItems = grab(/News Items (\d+) Rank/)
  d.revenueDiffPct = grab(/Difference \(%\) (-?[\d.]+)% Rank/)
  d.revenueDiffUsd = grab(/Difference \(\$\) (\$-?[\d,.]+ ?(?:billion|million)?) Rank/)
  const og = html.match(/property="og:image" content="([^"]+)"/)
  if (og) d.ogImage = og[1]
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)
  if (h1) d.pageTitle = strip(h1[1]).replace(/\s*\([^)]+\)\s*$/, '')
  for (const k of Object.keys(d)) if (d[k] === undefined) delete d[k]
  return d
}

async function harvest(slug, dirEntry) {
  const html = await fetchText(`${BASE}/companies/${slug}/`)
  if (!html) return null
  const d = parseCompany(html)
  return {
    bfhSlug: slug,
    bfhUrl: `${BASE}/companies/${slug}/`,
    name: dirEntry?.name || d.pageTitle || slug,
    statusNote: dirEntry?.statusNote || null,
    ...d,
    importedAt: new Date().toISOString(),
  }
}

// ---------- Main ----------
async function main() {
  const dir = await fetchDirectory()
  const sitemap = await fetchSitemapSlugs()
  const slugs = DRY_SLUGS.length ? DRY_SLUGS : [...new Set([...dir.keys(), ...sitemap])]
  console.log(`annuaire: ${dir.size} · sitemap: ${sitemap.length} · à traiter: ${slugs.length}`)

  let prisma = null
  let existing = new Map()
  if (!DRY) {
    const { PrismaClient } = await import('@prisma/client')
    prisma = new PrismaClient()
    for (const c of await prisma.mlmCompany.findMany({ select: { id: true, brandSlug: true, officialUrl: true, sources: true } })) {
      existing.set(c.brandSlug, c)
    }
    console.log(`déjà en base: ${existing.size}`)
  }

  const stats = { created: 0, archived: 0, merged: 0, failed: [] }
  let i = 0
  async function worker() {
    while (i < slugs.length) {
      const slug = slugs[i++]
      const data = await harvest(slug, dir.get(slug))
      if (!data) { stats.failed.push(slug); continue }
      if (DRY) { console.log(JSON.stringify(data, null, 2)); continue }

      const cc = data.countryCode || 'XX'
      const prev = existing.get(slug)
      if (prev) {
        // Société déjà gérée par Patrice : on n'écrase RIEN, on range juste les données BFH dans sources.
        await prisma.mlmCompany.update({
          where: { id: prev.id },
          data: {
            sources: { ...(prev.sources && typeof prev.sources === 'object' ? prev.sources : {}), bfh: data },
            ...(prev.officialUrl ? {} : data.website ? { officialUrl: data.website } : {}),
          },
        })
        stats.merged++
      } else {
        // Seules les vraies annotations de fin comptent — « (inGroup) », « (Formerly X) »… sont des alias, pas des morts.
        const dead = !!data.statusNote && /out of|acquired|closed|shut/i.test(data.statusNote)
        await prisma.mlmCompany.create({
          data: {
            brandSlug: slug,
            slug: `${slug}-${cc.toLowerCase()}`,
            name: data.name,
            country: cc,
            officialUrl: data.website || null,
            status: dead ? 'ARCHIVED' : 'DRAFT',
            sources: { bfh: data },
          },
        })
        dead ? stats.archived++ : stats.created++
      }
      if (i % 50 === 0) console.log(`… ${i}/${slugs.length}`)
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))

  console.log(`\nRésultat : ${stats.created} créées (DRAFT) · ${stats.archived} archivées (mortes) · ${stats.merged} fusionnées (existantes) · ${stats.failed.length} échecs`)
  if (stats.failed.length) console.log('échecs:', stats.failed.join(', '))
  if (prisma) await prisma.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
