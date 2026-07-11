import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Dernier entraînement débriefé → le setup Aria affiche le score et la reco d'Atlas.
export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const userId = token?.id as string | undefined
  if (!userId) return NextResponse.json({ error: 'non authentifié' }, { status: 401 })

  const last = await db.simSession.findFirst({
    where: { userId, score: { not: null } },
    orderBy: { startedAt: 'desc' },
    select: { score: true, characterId: true, feedback: true, startedAt: true },
  })
  if (!last) return NextResponse.json({ last: null })

  let reco = ''
  try {
    reco = (JSON.parse(last.feedback ?? '{}') as { prochain_scenario?: string }).prochain_scenario ?? ''
  } catch { /* ignore */ }

  return NextResponse.json({
    last: { score: last.score, scenario: last.characterId, reco, at: last.startedAt },
  })
}
