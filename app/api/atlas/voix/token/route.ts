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

// LE COACHING PARLÉ : UN BUDGET PAR SEMAINE, ET UN PLAFOND PAR JOUR.
//
// Deux bornes, parce qu'une seule ne suffit pas.
//
// Le BUDGET HEBDOMADAIRE donne la souplesse : on s'offre une vraie séance longue
// le jour où l'on prépare un gros rendez-vous, et des échanges de trois minutes
// les autres jours. Un quota strictement quotidien interdisait la séance longue.
//
// Le PLAFOND QUOTIDIEN empêche de s'échouer. Sans lui, on peut brûler toute sa
// semaine le lundi et se retrouver six jours sans coach — et c'est pire qu'une
// limite subie, parce qu'on se l'est infligée. Le plafond vaut deux septièmes du
// budget : on peut concentrer deux journées en une, jamais la semaine entière.
//
// Rien n'est perdu quand le budget tombe : l'écrit, c'est le MÊME Atlas, la même
// mémoire, le même fil. On change de canal, pas de coach.
const DOSES: Record<string, { semaine: number; jour: number }> = {
  DISTRIBUTEUR: { semaine: 70 * 60, jour: 20 * 60 },
  PRO:          { semaine: 140 * 60, jour: 40 * 60 },
  LEADER:       { semaine: 280 * 60, jour: 80 * 60 },
}

// Minuit et lundi à l'heure de PARIS, pas UTC : en été la remise à zéro
// tomberait à 2 h du matin et surprendrait tout le monde.
function minuitParis(reculDeJours = 0): Date {
  const maintenant = new Date()
  const paris = new Date(maintenant.toLocaleString('en-US', { timeZone: 'Europe/Paris' }))
  const decalage = maintenant.getTime() - paris.getTime()
  paris.setHours(0, 0, 0, 0)
  paris.setDate(paris.getDate() - reculDeJours)
  return new Date(paris.getTime() + decalage)
}

function debutDeSemaineParis(): Date {
  const paris = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' }))
  // getDay() rend 0 pour dimanche : on ramène la semaine au LUNDI.
  const depuisLundi = (paris.getDay() + 6) % 7
  return minuitParis(depuisLundi)
}

async function etatDuQuota(userId: string) {
  const compte = await db.user.findUnique({ where: { id: userId }, select: { plan: true } })
  const dose = DOSES[compte?.plan ?? 'DISTRIBUTEUR'] ?? DOSES.DISTRIBUTEUR

  const compter = async (depuis: Date) => {
    const r = await db.consommationVocale.aggregate({
      where: { userId, agent: 'atlas', createdAt: { gte: depuis } },
      _sum: { dureeSecondes: true },
    })
    return Math.round(r._sum.dureeSecondes ?? 0)
  }
  const [semaine, jour] = await Promise.all([
    compter(debutDeSemaineParis()),
    compter(minuitParis()),
  ])
  const resteSemaine = dose.semaine - semaine
  const resteJour = dose.jour - jour
  // La plus contraignante des deux décide.
  return { dose, resteSemaine, resteJour, restant: Math.min(resteSemaine, resteJour) }
}

// Le budget, SANS ouvrir de session : l'écran l'affiche au repos pour que
// l'utilisateur sache où il en est avant de parler.
export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const userId = token?.id as string | undefined
  if (!userId) return NextResponse.json({ error: 'non authentifié' }, { status: 401 })
  const q = await etatDuQuota(userId)
  return NextResponse.json({
    resteSemaine: Math.max(0, q.resteSemaine),
    resteJour: Math.max(0, q.resteJour),
    doseSemaine: q.dose.semaine,
    doseJour: q.dose.jour,
  })
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const userId = token?.id as string | undefined
  if (!userId) return NextResponse.json({ error: 'non authentifié' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const voix = VOIX.has(body?.voix) ? (body.voix as string) : 'dorian'

  // Ce qui a déjà été parlé. La consommation est écrite par l'agent à la
  // FERMETURE de chaque session : une session en cours n'y est pas encore, d'où
  // le garde-fou côté agent qui coupe au bout du temps restant.
  const { dose, resteSemaine, restant } = await etatDuQuota(userId)

  if (restant <= 0) {
    const semaineEpuisee = resteSemaine <= 0
    return NextResponse.json({
      error: 'quota_atteint',
      message: semaineEpuisee
        ? "Tu as fait tes minutes de coaching parlé cette semaine. "
          + "Atlas t'attend à l'écrit, il se souvient de tout."
        : "Tu as fait ton maximum pour aujourd'hui. On se reparle demain — "
          + "et d'ici là Atlas est à l'écrit, il se souvient de tout.",
      resteSemaine: Math.max(0, resteSemaine),
      doseSemaine: dose.semaine,
      doseJour: dose.jour,
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
    // L'écran montre le budget AVANT de commencer : une limite qu'on voit venir
    // est une règle du jeu, une limite qui tombe sans prévenir est une panne.
    secondesRestantes: restant,
    resteSemaine, doseSemaine: dose.semaine, doseJour: dose.jour,
  })
}
