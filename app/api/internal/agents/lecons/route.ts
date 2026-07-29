import { NextRequest, NextResponse } from 'next/server'
import { calculerToutesLesLecons, leconsPour } from '@/lib/agents/mutualisation'
import type { AgentName } from '@prisma/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

function autorise(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret')
  return !!process.env.INTERNAL_API_SECRET && secret === process.env.INTERNAL_API_SECRET
}

// POST — recalcule les leçons de toutes les sociétés éligibles (cron nocturne).
// Les leçons qui ne tiennent plus sont supprimées : rien ne survit à sa preuve.
export async function POST(req: NextRequest) {
  if (!autorise(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  try {
    return NextResponse.json(await calculerToutesLesLecons())
  } catch (e) {
    console.error('[lecons]', e)
    return NextResponse.json({ error: 'calcul impossible' }, { status: 500 })
  }
}

// GET — ce qu'un agent doit savoir avant d'agir, pour un utilisateur donné.
export async function GET(req: NextRequest) {
  if (!autorise(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const url = new URL(req.url)
  const userId = url.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId requis' }, { status: 400 })
  const agent = url.searchParams.get('agent') as AgentName | null
  return NextResponse.json({ texte: await leconsPour(userId, agent ?? undefined) })
}
