import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Endpoint INTERNE (outil Atlas `chercher_societes`) : l'annuaire des sociétés MLM du
// référentiel (725 fiches) devient interrogeable en conversation — secteur, pays, nom.
// Né du constat du 27 juil : Atlas répondait « 6 sociétés dans ma base » assis sur 725.
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret')
  if (!process.env.INTERNAL_API_SECRET || secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const body = await req.json().catch(() => null)
  const query = typeof body?.query === 'string' ? body.query.trim() : ''
  const categorie = typeof body?.categorie === 'string' ? body.categorie.trim() : ''
  const pays = typeof body?.pays === 'string' ? body.pays.trim().toUpperCase() : ''
  const limit = Math.min(Math.max(Number(body?.limit) || 12, 1), 20)

  const and: object[] = []
  if (query) {
    and.push({
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { brandSlug: { contains: query.toLowerCase().replace(/\s+/g, '-') } },
        { category: { contains: query, mode: 'insensitive' } },
      ],
    })
  }
  if (categorie) and.push({ category: { contains: categorie, mode: 'insensitive' } })
  if (pays) and.push({ country: pays })
  const where = { status: { in: ['PUBLISHED' as const, 'ARCHIVED' as const] }, AND: and }

  const [total, rows] = await Promise.all([
    db.mlmCompany.count({ where }),
    db.mlmCompany.findMany({
      where,
      select: {
        name: true,
        country: true,
        category: true,
        status: true,
        fiche: true,
        sources: true,
        _count: { select: { products: true, businesses: true } },
      },
      orderBy: [{ businesses: { _count: 'desc' } }, { name: 'asc' }],
      take: limit,
    }),
  ])

  const societes = rows.map((c) => {
    const fiche = c.fiche as { recit?: { pitch?: string } } | null
    const bfh = (c.sources as { bfh?: { statusNote?: string } } | null)?.bfh
    return {
      nom: c.name,
      pays: c.country,
      categorie: c.category ?? null,
      statut: c.status === 'ARCHIVED' ? `DISPARUE${bfh?.statusNote ? ` (${bfh.statusNote})` : ''}` : 'active',
      pitch: fiche?.recit?.pitch?.slice(0, 220) ?? null,
      produits_en_base: c._count.products,
    }
  })

  return NextResponse.json({ total, societes })
}
