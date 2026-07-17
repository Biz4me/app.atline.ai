import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

// Message du SOIR d'Atlas (rituel de clôture) — appelé par cron (~21h Paris).
// Le miroir du matin : le matin ouvre la journée, le soir la FERME.
// - journée bouclée (plus rien de dû) → célébration + aperçu de demain
// - il reste des actions → rappel doux, jamais culpabilisant
// Même philosophie que le matin : template déterministe, zéro LLM, idempotent.
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret')
  if (!process.env.INTERNAL_API_SECRET || secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const now = new Date()
  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(now); endOfDay.setHours(23, 59, 59, 999)
  const tomorrowStart = new Date(startOfDay.getTime() + 86_400_000)
  const tomorrowEnd = new Date(endOfDay.getTime() + 86_400_000)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const evening = new Date(now); evening.setHours(18, 0, 0, 0)

  const [relLeft, rdvToDebrief, rdvTomorrow, signed, morningNotifs] = await Promise.all([
    // relances encore dues ce soir
    db.relance.groupBy({ by: ['userId'], where: { status: 'PENDING', dueAt: { lte: endOfDay } }, _count: { _all: true } }),
    // RDV du jour passés et non soldés (le débrief débloque la suite)
    db.appointment.findMany({
      where: { done: false, startAt: { gte: startOfDay, lte: now } },
      select: { userId: true, contact: { select: { firstName: true } } },
    }),
    // l'aperçu de demain
    db.appointment.findMany({
      where: { done: false, startAt: { gte: tomorrowStart, lte: tomorrowEnd } },
      orderBy: { startAt: 'asc' },
      select: { userId: true, title: true, startAt: true, contact: { select: { firstName: true } } },
    }),
    // le score du mois (la boucle signé → partenaire le rend mesurable)
    db.contact.groupBy({ by: ['userId'], where: { kind: 'PARTENAIRE', signedAt: { gte: monthStart } }, _count: { _all: true } }),
    // qui a eu une journée ouverte par Atlas ce matin (population de la célébration)
    db.notification.findMany({
      where: { icon: 'atlas', createdAt: { gte: startOfDay, lt: evening } },
      select: { userId: true },
    }),
  ])

  type Info = { relances: number; debrief: number; debriefPrenom?: string; demain?: { title: string; startAt: Date; prenom?: string }; signes: number }
  const byUser = new Map<string, Info>()
  const get = (id: string): Info => { const cur = byUser.get(id) ?? { relances: 0, debrief: 0, signes: 0 }; byUser.set(id, cur); return cur }
  for (const r of relLeft) get(r.userId).relances = r._count._all
  for (const a of rdvToDebrief) { const i = get(a.userId); i.debrief++; if (!i.debriefPrenom) i.debriefPrenom = a.contact?.firstName ?? undefined }
  for (const a of rdvTomorrow) { const i = get(a.userId); if (!i.demain) i.demain = { title: a.title, startAt: a.startAt, prenom: a.contact?.firstName ?? undefined } }
  for (const s of signed) get(s.userId).signes = s._count._all
  const hadMorning = new Set(morningNotifs.map((n) => n.userId))
  for (const id of hadMorning) get(id) // un matin ouvert mérite sa clôture, même si tout est fait

  let sent = 0
  for (const [userId, info] of [...byUser.entries()].slice(0, 200)) {
    try {
      const rest = info.relances + info.debrief
      // Rien à fermer ET pas de journée ouverte → pas de bruit
      if (rest === 0 && !hadMorning.has(userId)) continue

      // Idempotence : un seul message du soir par jour
      const already = await db.notification.findFirst({
        where: { userId, icon: 'atlas', createdAt: { gte: evening } },
        select: { id: true },
      })
      if (already) continue

      const demain = info.demain
        ? ` Demain : « ${info.demain.title} »${info.demain.prenom ? ` avec ${info.demain.prenom}` : ''} à ${new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }).format(info.demain.startAt)}.`
        : ''
      const mois = info.signes > 0 ? ` Ton mois : ${info.signes} partenaire${info.signes > 1 ? 's' : ''} signé${info.signes > 1 ? 's' : ''} 💪` : ''

      let text: string
      if (rest === 0) {
        text = `Journée de pro bouclée ✅${mois}${demain} Repose-toi, tu l'as mérité.`
      } else {
        const bits: string[] = []
        if (info.relances > 0) bits.push(`${info.relances} relance${info.relances > 1 ? 's' : ''}`)
        if (info.debrief > 0) bits.push(`le débrief${info.debrief > 1 ? 's' : ''} de ton RDV${info.debriefPrenom ? ` avec ${info.debriefPrenom}` : ''}`)
        text = `Il reste ${bits.join(' et ')} — 5 minutes et c'est plié ?${demain} Sinon, ça t'attendra demain, sans pression.`
      }

      await db.notification.create({ data: { userId, icon: 'atlas', color: '#F97316', text, go: '/atlas' } })
      sent++
    } catch {
      /* un user raté ne bloque pas les autres */
    }
  }

  return NextResponse.json({ ok: true, sent })
}
