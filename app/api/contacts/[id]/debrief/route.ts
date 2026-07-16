import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Débrief d'un RDV/appel — l'issue choisie dans le chat déclenche les mutations EN CODE
// (handoff en code : Atlas propose, l'utilisateur tape, le système agit).
// signed    → PARTENAIRE + DEMARRAGE + signedAt (compteur d'objectif mensuel)
// thinking  → SUIVI + relance J+3
// no        → SUIVI + relance J+30 (recyclage doux)
// postponed → RDV soldé (NO_SHOW), à replanifier côté agenda
const OUTCOMES = new Set(['signed', 'thinking', 'no', 'postponed'])

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const userId = token?.id as string | undefined
  if (!userId) return NextResponse.json({ error: 'non authentifié' }, { status: 401 })

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const outcome = String(body.outcome ?? '')
  if (!OUTCOMES.has(outcome)) return NextResponse.json({ error: 'outcome invalide' }, { status: 400 })

  const contact = await db.contact.findFirst({
    where: { id, userId },
    select: { id: true, mlmBusinessId: true, phone: true, email: true, kind: true },
  })
  if (!contact) return NextResponse.json({ error: 'contact introuvable' }, { status: 404 })

  const now = new Date()

  // 1) Solder le RDV (celui fourni, sinon le dernier RDV passé non débriefé du contact)
  const appt = body.appointmentId
    ? await db.appointment.findFirst({ where: { id: String(body.appointmentId), userId }, select: { id: true } })
    : await db.appointment.findFirst({
        where: { userId, contactId: id, done: false, startAt: { lt: now } },
        orderBy: { startAt: 'desc' },
        select: { id: true },
      })
  if (appt) {
    await db.appointment.update({
      where: { id: appt.id },
      data: {
        done: true,
        outcome: outcome === 'signed' ? 'POSITIF' : outcome === 'thinking' ? 'NEUTRE' : outcome === 'no' ? 'NEGATIF' : 'NO_SHOW',
        outcomeNote: outcome === 'postponed' ? 'RDV reporté' : null,
      },
    })
  }

  // 2) Mutations contact + relance selon l'issue
  const relanceChannel = contact.phone ? 'whatsapp' : 'email'
  if (outcome === 'signed') {
    await db.contact.update({
      where: { id },
      data: { kind: 'PARTENAIRE', partnerStage: 'DEMARRAGE', signedAt: now, lastContact: now },
    })
  } else if (outcome === 'thinking' || outcome === 'no') {
    const days = outcome === 'thinking' ? 3 : 30
    await db.contact.update({ where: { id }, data: { prospectStage: 'SUIVI', lastContact: now } })
    await db.relance.create({
      data: { userId, contactId: id, channel: relanceChannel, dueAt: new Date(now.getTime() + days * 86_400_000) },
    })
  }
  // postponed : rien sur le contact — on replanifie côté agenda

  // 3) Compteur d'objectif du mois (partenaires signés vs objectif.mensuel)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const [signedThisMonth, business] = await Promise.all([
    db.contact.count({ where: { userId, mlmBusinessId: contact.mlmBusinessId, kind: 'PARTENAIRE', signedAt: { gte: monthStart } } }),
    db.userMlmBusiness.findUnique({ where: { id: contact.mlmBusinessId }, select: { objectif: true } }),
  ])
  const obj = (business?.objectif && typeof business.objectif === 'object' && !Array.isArray(business.objectif))
    ? (business.objectif as Record<string, unknown>) : {}
  const mensuel = parseInt(String(obj.mensuel ?? ''), 10)

  return NextResponse.json({
    ok: true,
    outcome,
    signedThisMonth,
    objectifMensuel: Number.isFinite(mensuel) ? mensuel : null,
  })
}
