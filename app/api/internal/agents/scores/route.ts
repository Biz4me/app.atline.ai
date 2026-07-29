import { NextRequest, NextResponse } from 'next/server'
import { scoresUtilisateur, scoresEnTexte } from '@/lib/agents/scores'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Ce que le cerveau lit avant de décider.
// `?format=texte` renvoie des phrases nues, prêtes à entrer dans un prompt —
// c'est la forme qu'utilise la consolidation nocturne.
export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret')
  if (!process.env.INTERNAL_API_SECRET || secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const url = new URL(req.url)
  const userId = url.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId requis' }, { status: 400 })

  const jours = Math.min(Math.max(Number(url.searchParams.get('jours') ?? 7), 1), 90)
  const scores = await scoresUtilisateur(userId, jours)

  return url.searchParams.get('format') === 'texte'
    ? NextResponse.json({ jours, texte: scoresEnTexte(scores, jours) })
    : NextResponse.json({ jours, scores })
}
