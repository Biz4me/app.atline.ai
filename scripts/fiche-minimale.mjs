// Fiche MINIMALE pour toutes les sociétés sans fiche (plan éco 27 juil, ~0,02 $/société).
// Contexte : leur PROPRE site (accueil + à-propos, HTTP gratuit) + référentiel BFH + produits
// déjà récoltés → Gemini Flash remplit recit (pitch/catégorie/fondation/histoire/positionnement)
// + produits (categories/phares). Site bloqué → repli perplexity/sonar (léger).
// N'invente RIEN : champ vide si l'info manque. DRAFT avec pitch obtenu → PUBLISHED
// (source officielle, directive Patrice). REVIEW/ARCHIVED jamais touchés.
//
// Usage :  OPENROUTER_KEY=... node scripts/fiche-minimale.mjs --dry <slug>
//          OPENROUTER_KEY=... node scripts/fiche-minimale.mjs [--limit N]

const DRY = process.argv.includes('--dry')
const DRY_SLUG = DRY ? process.argv[process.argv.indexOf('--dry') + 1] : null
const LIMIT = process.argv.includes('--limit') ? parseInt(process.argv[process.argv.indexOf('--limit') + 1], 10) : Infinity
const KEY = (process.env.OPENROUTER_KEY || '').trim()
if (!KEY) throw new Error('OPENROUTER_KEY requis')
const CONCURRENCY = 3

// Assainissement sans regex d'échappement (les caractères de contrôle cassent Postgres).
const clean = (s) => [...String(s || '')].filter((ch) => ch.charCodeAt(0) > 31 || ch === '\n').join('')
const stripHtml = (html) =>
  clean(
    String(html || '')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  ).replace(/\s+/g, ' ').trim()

async function get(url, timeout = 12000) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeout)
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.9,fr;q=0.8',
      },
    })
    return res.ok ? await res.text() : null
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

let llmCost = 0
async function llm(model, prompt, max_tokens) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.2, max_tokens, reasoning: { enabled: false } }),
  })
  if (!res.ok) throw new Error(`openrouter ${res.status}`)
  const data = await res.json()
  llmCost += data.usage?.cost || 0
  return data.choices?.[0]?.message?.content || ''
}

// Contexte : le site de la société (accueil + à-propos), sinon recherche légère sonar.
async function siteContext(c) {
  const html = c.officialUrl ? await get(c.officialUrl) : null
  if (html) {
    let ctx = stripHtml(html).slice(0, 6000)
    const about = [...html.matchAll(/href="([^"#]+)"/g)]
      .map((m) => { try { return new URL(m[1], c.officialUrl) } catch { return null } })
      .find((u) => u && /^https?:$/.test(u.protocol) && /(about|a-?propos|our-?story|qui-sommes|notre-histoire|company\/?$|history)/i.test(u.pathname))
    if (about) {
      const aHtml = await get(about.href)
      if (aHtml) ctx += '\n\nPAGE À PROPOS :\n' + stripHtml(aHtml).slice(0, 4000)
    }
    return { ctx, via: 'site' }
  }
  // Site bloqué/mort → une recherche factuelle légère.
  const ans = await llm(
    'perplexity/sonar',
    `Décris factuellement la société de vente directe / MLM « ${c.name} » (pays d'origine : ${c.country}) : ce qu'elle vend exactement (produits ou services), sa catégorie, son année et lieu de fondation, son fondateur, son positionnement. Uniquement des faits sourcés, pas de chiffres inventés.`,
    700,
  ).catch(() => '')
  return { ctx: ans.slice(0, 4000), via: 'sonar' }
}

function bfhBlock(c) {
  const b = c.sources?.bfh || {}
  const rev = b.revenueEstMln || {}
  const year = Object.keys(rev).sort().at(-1)
  return [
    `Nom : ${c.name} · Pays d'origine : ${b.countryLabel || c.country}`,
    b.ceo ? `PDG : ${b.ceo}` : '',
    c.officialUrl ? `Site officiel : ${c.officialUrl}` : '',
    b.statusNote ? `Statut : ${b.statusNote}` : '',
    year ? `Chiffre d'affaires estimé ${year} (source interne, NE PAS citer de chiffre dans la fiche) : ~${rev[year]} M$` : '',
  ].filter(Boolean).join('\n')
}

function productsBlock(prods) {
  if (!prods.length) return ''
  return 'PRODUITS DÉJÀ EN BASE (source boutique officielle, prix fiables) :\n' +
    prods.map((p) => `- ${p.name}${p.price != null ? ` — ${Number(p.price).toFixed(2)} ${p.currency}` : ''}${p.category ? ` (${p.category})` : ''}`).join('\n')
}

async function buildFiche(c, prods) {
  const { ctx, via } = await siteContext(c)
  const prompt = `Tu rédiges la fiche MINIMALE (en français) de la société de vente directe/MLM « ${c.name} » pour un assistant conversationnel.

DONNÉES SÛRES :
${bfhBlock(c)}
${productsBlock(prods)}

CONTENU DU SITE OFFICIEL${via === 'sonar' ? ' (indisponible — recherche factuelle ci-dessous)' : ''} :
${ctx || '(vide)'}

Rends UNIQUEMENT ce JSON :
{"pitch":"la société en une phrase","categorie":"nutrition, cosmétique, bijoux, services financiers, immobilier, télécom…","fondation":"Année · pays · fondateur (si connus)","histoire":"3-4 phrases factuelles","positionnement":"ce qui la distingue, 1-2 phrases","categories":["catégories de produits/services"],"phares":["jusqu'à 8 lignes : Nom — bénéfice — prix si CONNU — format si connu"]}

Règles absolues : factuel uniquement, N'INVENTE RIEN (ni prix, ni chiffres, ni dates incertaines) — champ vide ou omis si l'info manque ; aucune promesse de revenu, aucune allégation santé ; si c'est une société de SERVICES, "categorie" = le type de service et "phares" = les offres principales.`
  const raw = await llm('google/gemini-3.5-flash', prompt, 4000)
  const m = raw.match(/\{[\s\S]*\}/)
  if (!m) { if (DRY) console.log('RAW SANS JSON:', raw.slice(0, 400)); return null }
  let j
  try { j = JSON.parse(m[0]) } catch (e) { if (DRY) console.log('JSON KO:', e.message, '·', m[0].slice(0, 300)); return null }
  const s = (v) => clean(typeof v === 'string' ? v.trim() : '')
  const arr = (v) => (Array.isArray(v) ? v.map((x) => clean(String(x).trim())).filter(Boolean).slice(0, 10) : [])
  return {
    via,
    recit: { pitch: s(j.pitch), categorie: s(j.categorie), fondation: s(j.fondation), histoire: s(j.histoire), positionnement: s(j.positionnement) },
    produits: { categories: arr(j.categories), phares: arr(j.phares) },
  }
}

async function main() {
  const { PrismaClient } = await import('@prisma/client')
  const prisma = new PrismaClient()
  const all = await prisma.mlmCompany.findMany({
    where: { status: { in: ['DRAFT', 'PUBLISHED'] }, ...(DRY_SLUG ? { brandSlug: DRY_SLUG } : {}) },
    select: { id: true, brandSlug: true, name: true, country: true, status: true, officialUrl: true, fiche: true, sources: true },
    orderBy: { brandSlug: 'asc' },
  })
  const todo = all.filter((c) => !c.fiche?.recit?.pitch).slice(0, DRY ? 1 : LIMIT)
  console.log(`fiches minimales à écrire : ${todo.length}`)

  const stats = { ok: 0, published: 0, sonar: 0, failed: 0 }
  let i = 0
  async function worker() {
    while (i < todo.length) {
      const c = todo[i++]
      try {
        const prods = await prisma.mlmProduct.findMany({
          where: { companyId: c.id },
          orderBy: { position: 'asc' },
          take: 15,
          select: { name: true, price: true, currency: true, category: true },
        })
        const r = await buildFiche(c, prods)
        if (!r || !r.recit.pitch) { stats.failed++; console.log(`✗ ${c.brandSlug} : fiche vide`); continue }
        if (DRY) { console.log(JSON.stringify(r, null, 2)); continue }
        const fiche = { ...(c.fiche && typeof c.fiche === 'object' ? c.fiche : {}) }
        fiche.recit = r.recit
        if (!fiche.produits?.phares?.length) fiche.produits = r.produits
        const publish = c.status === 'DRAFT'
        await prisma.mlmCompany.update({
          where: { id: c.id },
          data: {
            fiche,
            category: r.recit.categorie.slice(0, 60) || null,
            ...(publish ? { status: 'PUBLISHED', publishedAt: new Date() } : {}),
          },
        })
        stats.ok++
        if (publish) stats.published++
        if (r.via === 'sonar') stats.sonar++
      } catch (e) {
        stats.failed++
        console.log(`✗ ${c.brandSlug} : ${String(e?.message || e).slice(0, 120)}`)
      }
      if (i % 25 === 0) console.log(`… ${i}/${todo.length} (coût LLM cumulé ${llmCost.toFixed(2)} $)`)
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))

  console.log(`\nRésultat : ${stats.ok} fiches écrites (${stats.sonar} via sonar) · ${stats.published} publiées · ${stats.failed} échecs · coût LLM total ${llmCost.toFixed(2)} $`)
  await prisma.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
