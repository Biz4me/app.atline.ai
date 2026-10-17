import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { etatDesCompetences } from '@/lib/competences'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Où en est le distributeur, compétence par compétence. Lu par le fil Aria —
// le seul endroit qui répond à « où j'en suis ». Le calcul vit dans
// lib/competences pour que cet écran et le plan du jour ne puissent pas
// diverger.
export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const userId = token?.id as string | undefined
  if (!userId) return NextResponse.json({ error: 'non authentifié' }, { status: 401 })

  try {
    return NextResponse.json({ competences: await etatDesCompetences(userId) })
  } catch {
    // Le fil Aria doit s'afficher même sans ce bloc : il porte aussi le
    // journal des simulations, qui est sa raison d'être.
    return NextResponse.json({ competences: [] })
  }
}
