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

// VINGT MINUTES DE COACHING PARLÉ PAR JOUR, puis le fil écrit prend le relais.
//
// Ce n'est pas qu'une borne de dépense. Vingt minutes de voix, c'est déjà une
// vraie séance : au-delà, on n'approfondit plus, on bavarde. Une limite
// quotidienne crée un rendez-vous, et un rendez-vous fait revenir.
//
// Rien n'est perdu quand elle tombe : l'écrit, c'est le MÊME Atlas, la même
// mémoire, le même fil. On change de canal, pas de coach.
//
// Le compteur repart à minuit, heure de Paris — pas à l'heure UTC, sinon la
// remise à zéro tomberait à 2 h du matin en été et surprendrait tout le monde.
const QUOTA_SECONDES = 20 * 60

function debutDeJourneeParis(): Date {
  const maintenant = new Date()
  const paris = new Date(maintenant.toLocaleString('en-US', { timeZone: 'Europe/Paris' }))
  const decalage = maintenant.getTime() - paris.getTime()
  paris.setHours(0, 0, 0, 0)
  return new Date(paris.getTime() + decalage)
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const userId = token?.id as string | undefined
  if (!userId) return NextResponse.json({ error: 'non authentifié' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const voix = VOIX.has(body?.voix) ? (body.voix as string) : 'dorian'

  // Ce qui a déjà été parlé aujourd'hui. La consommation est écrite par l'agent
  // à la FERMETURE de chaque session : une session en cours n'y est pas encore,
  // d'où le garde-fou côté agent qui coupe au bout du temps restant.
  const dejaParle = await db.consommationVocale.aggregate({
    where: { userId, agent: 'atlas', createdAt: { gte: debutDeJourneeParis() } },
    _sum: { dureeSecondes: true },
  })
  const consomme = Math.round(dejaParle._sum.dureeSecondes ?? 0)
  const restant = QUOTA_SECONDES - consomme
  if (restant <= 0) {
    return NextResponse.json({
      error: 'quota_atteint',
      message: "Tu as fait tes vingt minutes de coaching parlé aujourd'hui. "
             + "Atlas t'attend à l'écrit, il se souvient de tout.",
      consomme, quota: QUOTA_SECONDES,
    }, { status: 429 })
  }

  // Société active : scope le RAG d'Atlas sur sa société, comme à l'écrit.
  const prefs = await db.userPreferences.findUnique({
    where: { userId }, select: { activeCompanyId: true },
  })
  let mlmActif = ''
  const biz = prefs?.activeCompanyId
    ? await db.userMlmBusiness.findFirst({ where: { id: prefs.activeCompanyId, userId }, select: { mlmName: true } })
    : await db.userMlmBusiness.findFirst({ where: { userId }, orderBy: { position: 'asc' }, select: { mlmName: true } })
  if (biz?.mlmName) mlmActif = biz.mlmName

  // `secondesRestantes` voyage avec le reste : c'est l'agent qui coupera, parce
  // que lui seul sait quand la session se termine vraiment.
  const meta = JSON.stringify({ userId, voix, mlmActif, secondesRestantes: restant })
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

  return NextResponse.json({
    token: await at.toJwt(), url: process.env.LIVEKIT_URL!, room,
    // L'écran affiche le temps qu'il reste : une limite qu'on voit venir est
    // une règle du jeu, une limite qui tombe sans prévenir est une panne.
    secondesRestantes: restant, quota: QUOTA_SECONDES,
  })
}
