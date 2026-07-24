import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Un produit du catalogue par son slug — recherché GLOBALEMENT (toute société publiée).
// Les catalogues produits sont publics : un utilisateur peut voir la fiche d'un produit
// concurrent qu'il a demandé. Sert la carte produit d'Atlas ET (à venir) Nova.
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.id) return NextResponse.json({ error: 'non authentifié' }, { status: 401 })

  const { slug } = await params
  const p = await db.mlmProduct.findFirst({
    where: { slug, status: 'PUBLISHED' },
    orderBy: { updatedAt: 'desc' },
    select: {
      name: true, category: true, description: true, usage: true,
      price: true, currency: true, format: true, imageUrl: true, sourceUrl: true,
      company: { select: { name: true } },
    },
  })
  if (!p) return NextResponse.json({ error: 'produit introuvable' }, { status: 404 })

  return NextResponse.json({
    ...p,
    company: p.company?.name ?? null,
    price: p.price != null ? Number(p.price) : null,
  })
}
