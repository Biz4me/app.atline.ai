// Ingestion Qdrant des fiches MINIMALES (récit + produits) des sociétés PUBLIÉES.
// Rend has_fiche réel : Atlas a des chunks quand un distributeur parle de sa société.
// GARDE-FOU : une fiche RICHE (rémunération/structure remplies via deep research, ex.
// Herbalife) est SAUTÉE — l'ingérer ici écraserait ses chunks par la version minimale
// (l'ingestion du service supprime les chunks existants de la société avant réindexation).
//
// Usage :  DATABASE_URL=... node scripts/fiche-ingest.mjs [--limit N]

const LIMIT = process.argv.includes('--limit') ? parseInt(process.argv[process.argv.indexOf('--limit') + 1], 10) : Infinity
const SERVICE = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8100'
const CONCURRENCY = 2

const lignes = (arr) => (Array.isArray(arr) ? arr.filter(Boolean) : [])

function ficheMinText(name, fiche, nbProduits) {
  const r = fiche.recit || {}
  const p = fiche.produits || {}
  const out = [`# ${name}`, '', '## Le récit']
  if (r.pitch) out.push(`En une phrase : ${r.pitch}`)
  if (r.categorie) out.push(`Catégorie : ${r.categorie}`)
  if (r.fondation) out.push(`Fondation : ${r.fondation}`)
  if (r.histoire) out.push(`Histoire : ${r.histoire}`)
  if (r.positionnement) out.push(`Positionnement : ${r.positionnement}`)
  const cats = lignes(p.categories)
  const phares = lignes(p.phares)
  if (cats.length || phares.length) {
    out.push('', '## Les produits')
    if (cats.length) out.push(`Catégories : ${cats.join(', ')}`)
    if (phares.length) out.push('Produits phares :', ...phares.map((l) => `- ${l}`))
    if (nbProduits) out.push(`Catalogue structuré en base : ${nbProduits} produits (prix officiels).`)
  }
  return out.join('\n')
}

// Fiche « riche » = un contenu au-delà de récit/produits → ne pas écraser.
const estRiche = (fiche) =>
  ['remuneration', 'structure', 'public', 'objections', 'conformite', 'preuves'].some((k) => {
    const bloc = fiche?.[k]
    return bloc && Object.values(bloc).some((v) => (Array.isArray(v) ? v.length : String(v || '').trim()))
  })

async function main() {
  const { PrismaClient } = await import('@prisma/client')
  const prisma = new PrismaClient()
  const companies = await prisma.mlmCompany.findMany({
    where: { status: 'PUBLISHED' },
    select: { id: true, brandSlug: true, name: true, country: true, fiche: true, sources: true, _count: { select: { products: true } } },
    orderBy: { brandSlug: 'asc' },
  })
  const todo = companies
    .filter((c) => c.fiche?.recit?.pitch && !estRiche(c.fiche) && !c.sources?.ficheMinIngestedAt)
    .slice(0, LIMIT)
  console.log(`à ingérer : ${todo.length} (sur ${companies.length} publiées)`)

  const stats = { ok: 0, chunks: 0, failed: 0 }
  let i = 0
  async function worker() {
    while (i < todo.length) {
      const c = todo[i++]
      try {
        const text = ficheMinText(c.name, c.fiche, c._count.products)
        const res = await fetch(`${SERVICE}/api/company/ingest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ societe: c.brandSlug, country: c.country, text }),
        })
        if (!res.ok) throw new Error(`service ${res.status}`)
        const data = await res.json()
        const src = c.sources && typeof c.sources === 'object' ? c.sources : {}
        await prisma.mlmCompany.update({
          where: { id: c.id },
          data: { sources: { ...src, ficheMinIngestedAt: new Date().toISOString() } },
        })
        stats.ok++
        stats.chunks += data.chunks_ingested ?? 0
      } catch (e) {
        stats.failed++
        console.log(`✗ ${c.brandSlug} : ${String(e?.message || e).slice(0, 100)}`)
      }
      if (i % 50 === 0) console.log(`… ${i}/${todo.length}`)
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))

  console.log(`\nRésultat : ${stats.ok} fiches ingérées (${stats.chunks} chunks) · ${stats.failed} échecs`)
  await prisma.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
