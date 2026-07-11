import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Démarre une simulation Aria à l'ÉCRIT : même SimSession que le vocal → même transcript,
// même débrief, même mémoire. Seul le canal change.
const PHASES: Record<string, 'INVITATION' | 'SUIVI' | 'DEMARRAGE' | 'COACHING'> = {
  invitation: 'INVITATION', suivi: 'SUIVI', demarrage: 'DEMARRAGE', coaching: 'COACHING',
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const userId = token?.id as string | undefined
  if (!userId) return NextResponse.json({ error: 'non authentifié' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const scenario = typeof body.scenario === 'string' && body.scenario ? body.scenario.slice(0, 60) : 'objection_pyramide'
  const phase = PHASES[body.phase] ?? 'INVITATION'
  const contactId = typeof body.contactId === 'string' && body.contactId ? body.contactId : null

  let pipelineContactId: string | null = null
  if (contactId) {
    const owned = await db.contact.findFirst({ where: { id: contactId, userId }, select: { id: true } })
    pipelineContactId = owned?.id ?? null
  }

  const sim = await db.simSession.create({
    data: {
      userId,
      phase,
      characterId: scenario,
      difficulty: 'MOYEN',
      knowledgeLevel: 'JAMAIS_FAIT',
      ...(pipelineContactId ? { pipelineContactId } : {}),
    },
    select: { id: true },
  })
  return NextResponse.json({ sessionId: sim.id })
}
