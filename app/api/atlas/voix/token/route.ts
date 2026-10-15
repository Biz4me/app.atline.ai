import { AccessToken, RoomAgentDispatch, RoomConfiguration } from 'livekit-server-sdk'
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Jeton d'entrée pour l'écran où l'on PARLE à Atlas.
//
// Calqué sur /api/livekit-token (Aria), avec les mêmes garde-fous : authentifié,
// car le vocal coûte (Deepgram + le cerveau + Cartesia), et DISPATCH EXPLICITE —
// l'agent est enregistré sous un nom, donc LiveKit ne l'envoie dans la room que
// si on le demande. Sans ce bloc, la room reste muette.
//
// Différence avec Aria : l'identité de l'utilisateur voyage dans les métadonnées,
// parce que c'est elle qui donne à Atlas SA mémoire. Le worker refuse la session
// si elle manque, plutôt que de parler avec la mémoire de personne.

const VOIX = new Set(['dorian', 'solene'])

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const userId = token?.id as string | undefined
  if (!userId) return NextResponse.json({ error: 'non authentifié' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const voix = VOIX.has(body?.voix) ? (body.voix as string) : 'dorian'

  // Société active : scope le RAG d'Atlas sur sa société, comme à l'écrit.
  const prefs = await db.userPreferences.findUnique({
    where: { userId }, select: { activeCompanyId: true },
  })
  let mlmActif = ''
  const biz = prefs?.activeCompanyId
    ? await db.userMlmBusiness.findFirst({ where: { id: prefs.activeCompanyId, userId }, select: { mlmName: true } })
    : await db.userMlmBusiness.findFirst({ where: { userId }, orderBy: { position: 'asc' }, select: { mlmName: true } })
  if (biz?.mlmName) mlmActif = biz.mlmName

  const meta = JSON.stringify({ userId, voix, mlmActif })
  // Une room par session : deux onglets ouverts ne se parlent pas par-dessus.
  const room = `atlas-${userId}-${Date.now()}`

  const at = new AccessToken(process.env.LIVEKIT_API_KEY!, process.env.LIVEKIT_API_SECRET!, {
    identity: userId,
    metadata: meta,          // secours : le worker lit le participant si le dispatch manque
  })
  at.addGrant({ roomJoin: true, room, canPublish: true, canSubscribe: true })
  at.roomConfig = new RoomConfiguration({
    // Le canal SÛR : disponible dès l'entrée de l'agent, sans attendre que
    // l'utilisateur ait rejoint la room.
    agents: [new RoomAgentDispatch({ agentName: 'atlas-coach', metadata: meta })],
  })

  return NextResponse.json({ token: await at.toJwt(), url: process.env.LIVEKIT_URL!, room })
}
