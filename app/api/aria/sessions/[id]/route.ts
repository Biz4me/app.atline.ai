import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { db } from '@/lib/db'
import { reconcileFacts, reflect, type ExtractedFact } from '@/lib/atlas-memory'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const ATLAS_URL = process.env.ATLAS_URL || 'http://127.0.0.1:8100'

async function owned(req: NextRequest, id: string) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const userId = token?.id as string | undefined
  if (!userId) return { userId: null, sim: null }
  const sim = await db.simSession.findFirst({
    where: { id, userId },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  })
  return { userId, sim }
}

// Statut de la session (la page débrief poll jusqu'à l'arrivée du transcript).
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const { userId, sim } = await owned(req, id)
  if (!userId) return NextResponse.json({ error: 'non authentifié' }, { status: 401 })
  if (!sim) return NextResponse.json({ error: 'introuvable' }, { status: 404 })
  return NextResponse.json({
    id: sim.id,
    phase: sim.phase,
    scenario: sim.characterId,
    score: sim.score,
    feedback: sim.feedback ? JSON.parse(sim.feedback) : null,
    hasTranscript: sim.messages.length > 0,
    turns: sim.messages.length,
  })
}

// Lance le VRAI débrief (Sonnet, via le service IA) sur le transcript, et le persiste.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const { userId, sim } = await owned(req, id)
  if (!userId) return NextResponse.json({ error: 'non authentifié' }, { status: 401 })
  if (!sim) return NextResponse.json({ error: 'introuvable' }, { status: 404 })

  // Déjà débriefé → renvoie l'existant (idempotent, pas de double coût)
  if (sim.feedback) {
    return NextResponse.json({ score: sim.score, ...(JSON.parse(sim.feedback) as object) })
  }
  if (!sim.messages.length) return NextResponse.json({ error: 'transcript pas encore reçu' }, { status: 409 })

  const transcript = sim.messages
    .map((m) => `${m.role === 'USER' ? 'Distributeur' : 'Prospect'}: ${m.content}`)
    .join('\n')

  // Couleur jouée : celle du contact lié si présent, sinon inconnue (l'agent avait la metadata)
  let color = ''
  if (sim.pipelineContactId) {
    const c = await db.contact.findFirst({ where: { id: sim.pipelineContactId, userId }, select: { personality: true } })
    color = c?.personality?.toLowerCase() ?? ''
  }

  let data: { score?: number | null; [k: string]: unknown }
  try {
    const r = await fetch(`${ATLAS_URL}/api/aria/debrief`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript,
        simulation_stage: sim.phase.toLowerCase(),
        knowledge_level: sim.knowledgeLevel.toLowerCase(),
        user_id: userId,
        color,
        scenario: sim.characterId,
      }),
      signal: AbortSignal.timeout(50000),
    })
    if (!r.ok) throw new Error()
    data = await r.json()
  } catch {
    return NextResponse.json({ error: 'débrief indisponible, réessaie' }, { status: 502 })
  }

  const score = typeof data.score === 'number' ? Math.max(0, Math.min(100, Math.round(data.score))) : null
  const { score: _s, ...feedback } = data
  await db.simSession.update({
    where: { id },
    data: { score, feedback: JSON.stringify(feedback) },
  })

  // ── La boucle apprend (fire-and-forget) : le débrief nourrit la mémoire d'Atlas ──
  // 1) faits de compétence (maitrise / bloque_sur / travaille_sur) → réconciliation
  //    (ré-observation = confiance qui monte ; progression = supersession traçable)
  // 2) profil vivant rafraîchi avec le bilan d'entraînement
  void (async () => {
    try {
      const facts = (Array.isArray(data.facts) ? data.facts : []) as ExtractedFact[]
      if (facts.length) await reconcileFacts(userId, null, facts)

      const resume = typeof data.resume === 'string' ? data.resume : ''
      const axes = Array.isArray(data.axes)
        ? (data.axes as { probleme?: string }[]).map((a) => a.probleme).filter(Boolean).join(' ; ')
        : ''
      const [prefs, user] = await Promise.all([
        db.userPreferences.findUnique({ where: { userId }, select: { atlasProfile: true } }),
        db.user.findUnique({ where: { id: userId }, select: { firstName: true } }),
      ])
      const { profile } = await reflect(
        'user',
        user?.firstName ?? '',
        prefs?.atlasProfile ?? '',
        `Entraînement Aria (simulation ${sim.characterId}, étape ${sim.phase.toLowerCase()}) — score ${score ?? '?'} sur 100.\nBilan : ${resume}\nAxes à travailler : ${axes || 'aucun'}`,
      )
      if (profile) {
        await db.userPreferences.upsert({
          where: { userId },
          create: { userId, atlasProfile: profile, atlasProfileAt: new Date() },
          update: { atlasProfile: profile, atlasProfileAt: new Date() },
        })
      }
    } catch {
      /* mémoire best-effort */
    }
  })()

  return NextResponse.json({ score, ...feedback })
}
