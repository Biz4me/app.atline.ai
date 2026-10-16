import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Ce qu'une session vocale a consommé, déposé par l'agent LiveKit à sa fermeture.
//
// Protégé par le secret interne, comme les autres routes /api/internal : l'agent
// est un processus serveur sans session, et il déclare l'utilisateur.
//
// On enregistre les COMPTEURS BRUTS et jamais un coût. Les tarifs changent, les
// mesures non : les convertir ici figerait un prix dans des données qu'on relira
// dans six mois.
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret')
  if (!process.env.INTERNAL_API_SECRET || secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const room = typeof body?.room === 'string' ? body.room.trim() : ''
  const userId = typeof body?.userId === 'string' ? body.userId.trim() : ''
  const agent = typeof body?.agent === 'string' ? body.agent.trim() : ''
  if (!room || !userId || !agent) {
    return NextResponse.json({ error: 'room, userId et agent sont requis' }, { status: 400 })
  }

  // L'utilisateur doit exister : une consommation orpheline fausserait tous les
  // totaux sans qu'on sache à qui l'attribuer.
  const connu = await db.user.findUnique({ where: { id: userId }, select: { id: true } })
  if (!connu) return NextResponse.json({ error: 'utilisateur inconnu' }, { status: 404 })

  // Le fil n'est rattaché que s'il appartient bien à cet utilisateur.
  let conversationId: string | null = null
  if (typeof body?.conversationId === 'string' && body.conversationId) {
    const fil = await db.atlasConversation.findFirst({
      where: { id: body.conversationId, userId }, select: { id: true },
    })
    conversationId = fil?.id ?? null
  }

  const donnees = {
    userId,
    agent,
    conversationId,
    dureeSecondes: typeof body?.dureeSecondes === 'number' ? body.dureeSecondes : null,
    consommation: Array.isArray(body?.consommation) ? body.consommation : null,
    raisonFin: typeof body?.raisonFin === 'string' ? body.raisonFin.slice(0, 80) : null,
  }

  // `room` est unique : un agent qui réessaie après une coupure met à jour au
  // lieu de créer un doublon qui doublerait la facture affichée.
  const ligne = await db.consommationVocale.upsert({
    where: { room },
    create: { room, ...donnees },
    update: donnees,
    select: { id: true },
  })

  return NextResponse.json({ ok: true, id: ligne.id })
}
