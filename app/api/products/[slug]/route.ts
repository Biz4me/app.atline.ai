import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Un produit du catalogue de la société active de l'utilisateur, par son slug.
// Sert la carte produit d'Atlas ET (à venir) Nova pour la publication.
async function activeCompanyId(userId: string): Promise<string | null> {
  const prefs = await db.userPreferences.findUnique({ where: { userId }, select: { activeCompanyId: true } })
  const biz = prefs?.activeCompanyId
    ? await db.userMlmBusiness.findFirst({ where: { id: prefs.activeCompanyId, userId }, select: { mlmName: true, companyId: true } })
    : await db.userMlmBusiness.findFirst({ where: { userId }, orderBy: { position: 'asc' }, select: { mlmName: true, companyId: true } })
  if (!biz) return null
  if (biz.companyId) return biz.companyId
  // pas encore rattaché : on retrouve la société par le nom (slugifié = brandSlug)
  const brandSlug = biz.mlmName.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const co = await db.mlmCompany.findFirst({ where: { brandSlug, status: 'PUBLISHED' }, select: { id: true } })
  return co?.id ?? null
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const userId = token?.id as string | undefined
  if (!userId) return NextResponse.json({ error: 'non authentifié' }, { status: 401 })

  const { slug } = await params
  const companyId = await activeCompanyId(userId)
  if (!companyId) return NextResponse.json({ error: 'aucune société' }, { status: 404 })

  const p = await db.mlmProduct.findFirst({
    where: { companyId, slug, status: 'PUBLISHED' },
    select: {
      name: true, category: true, description: true, usage: true,
      price: true, currency: true, format: true, imageUrl: true, sourceUrl: true,
    },
  })
  if (!p) return NextResponse.json({ error: 'produit introuvable' }, { status: 404 })

  return NextResponse.json({
    ...p,
    price: p.price != null ? Number(p.price) : null,
  })
}
