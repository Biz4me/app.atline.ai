import { AccessToken, RoomAgentDispatch, RoomConfiguration } from 'livekit-server-sdk'
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { readFileSync } from 'fs'
import { db } from '@/lib/db'

// Voix selon le GENRE du contact simulé : homme → voix d'homme, femme → voix de femme.
// Le rail de voix (genrées) vit dans agent-config.json — même serveur, lecture directe.
const AGENT_CONFIG = '/opt/atline/data/agent-config.json'

function genderOf(raw?: string | null): 'homme' | 'femme' | null {
  const c = (raw ?? '').trim().toUpperCase()[0]
  if (c === 'M' || c === 'H') return 'homme'
  if (c === 'F') return 'femme'
  return null
}

function voiceForGender(genre: 'homme' | 'femme' | null): string | null {
  if (!genre) return null
  try {
    const cfg = JSON.parse(readFileSync(AGENT_CONFIG, 'utf-8')) as {
      tts_provider?: string
      active_voice?: string
      voices?: { id: string; provider: string; voice_id: string; gender?: string }[]
    }
    const provider = cfg.tts_provider ?? 'cartesia'
    const candidates = (cfg.voices ?? []).filter((v) => v.provider === provider && v.gender === genre && v.voice_id)
    if (!candidates.length) return null
    // La voix active si elle a déjà le bon genre, sinon la première du bon genre
    const active = candidates.find((v) => v.id === cfg.active_voice)
    return (active ?? candidates[0]).voice_id
  } catch {
    return null
  }
}

// Jeton d'entraînement Aria — AUTHENTIFIÉ (le vocal coûte : Deepgram + Groq + ElevenLabs).
// Crée la SimSession d'emblée ; la room s'appelle aria-<sessionId> : l'agent vocal renvoie
// le transcript dessus en fin d'appel (endpoint interne), le débrief le consomme ensuite.

const COLORS = new Set(['rouge', 'jaune', 'bleu', 'vert'])
const PHASES: Record<string, 'INVITATION' | 'SUIVI' | 'DEMARRAGE' | 'COACHING'> = {
  invitation: 'INVITATION', suivi: 'SUIVI', demarrage: 'DEMARRAGE', coaching: 'COACHING',
}
const KNOWLEDGE = new Set(['JAMAIS_FAIT', 'A_UN_AVIS', 'DEJA_FAIT_MLM'])

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const userId = token?.id as string | undefined
  if (!userId) return NextResponse.json({ error: 'non authentifié' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const color = COLORS.has(body.color) ? body.color : 'bleu'
  const scenario = typeof body.scenario === 'string' && body.scenario ? body.scenario.slice(0, 60) : 'objection_pyramide'
  const phase = PHASES[body.phase] ?? 'INVITATION'
  const knowledge = KNOWLEDGE.has(body.knowledge) ? body.knowledge : 'JAMAIS_FAIT'
  const contactId = typeof body.contactId === 'string' && body.contactId ? body.contactId : null

  // Contact lié : vérifié comme appartenant à l'utilisateur (sinon ignoré)
  let pipelineContactId: string | null = null
  let contactGender: 'homme' | 'femme' | null = null
  if (contactId) {
    const owned = await db.contact.findFirst({ where: { id: contactId, userId }, select: { id: true, gender: true } })
    pipelineContactId = owned?.id ?? null
    contactGender = genderOf(owned?.gender)
  }
  // Voix accordée au genre du contact (null → la voix par défaut de la config)
  const voiceId = voiceForGender(contactGender)

  const sim = await db.simSession.create({
    data: {
      userId,
      phase,
      characterId: scenario, // le scénario joué (bibliothèque de l'agent vocal)
      difficulty: 'MOYEN',
      knowledgeLevel: knowledge as 'JAMAIS_FAIT' | 'A_UN_AVIS' | 'DEJA_FAIT_MLM',
      ...(pipelineContactId ? { pipelineContactId } : {}),
    },
    select: { id: true },
  })
  const roomName = `aria-${sim.id}`

  const at = new AccessToken(
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!,
    { identity: userId, metadata: JSON.stringify({ color, scenario, ...(voiceId ? { voice_id: voiceId } : {}) }) },
  )
  at.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true })
  // DISPATCH EXPLICITE : l'agent est enregistré sous un nom (aria-simulator) → LiveKit
  // ne l'envoie dans la room QUE si on le demande. Sans ce bloc, la room reste muette.
  at.roomConfig = new RoomConfiguration({
    agents: [new RoomAgentDispatch({ agentName: 'aria-simulator', metadata: JSON.stringify({ color, scenario }) })],
  })

  return NextResponse.json({
    token: await at.toJwt(),
    url: process.env.LIVEKIT_URL!,
    sessionId: sim.id,
  })
}
