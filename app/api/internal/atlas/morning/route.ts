import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

// Message du MATIN d'Atlas (proactivité) — appelé par cron (~7h30 Paris).
// Pour chaque utilisateur qui a quelque chose d'actionnable AUJOURD'HUI (relances dues,
// RDV du jour), crée une notification in-app qui l'amène à Atlas. Template déterministe :
// zéro hallucination, zéro coût LLM. Idempotent (une seule notif Atlas par jour).
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret')
  if (!process.env.INTERNAL_API_SECRET || secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const now = new Date()
  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(now); endOfDay.setHours(23, 59, 59, 999)

  const [relances, rdvs] = await Promise.all([
    db.relance.groupBy({
      by: ['userId'],
      where: { status: 'PENDING', dueAt: { lte: endOfDay } },
      _count: { _all: true },
    }),
    db.appointment.findMany({
      where: { done: false, startAt: { gte: startOfDay, lte: endOfDay } },
      orderBy: { startAt: 'asc' },
      select: { userId: true, title: true, startAt: true, contact: { select: { firstName: true } } },
    }),
  ])

  const byUser = new Map<string, { relances: number; rdv?: { title: string; startAt: Date; prenom?: string } }>()
  for (const r of relances) byUser.set(r.userId, { relances: r._count._all })
  for (const a of rdvs) {
    const cur = byUser.get(a.userId) ?? { relances: 0 }
    if (!cur.rdv) cur.rdv = { title: a.title, startAt: a.startAt, prenom: a.contact?.firstName ?? undefined }
    byUser.set(a.userId, cur)
  }

  let sent = 0
  for (const [userId, info] of [...byUser.entries()].slice(0, 200)) {
    try {
      // Idempotence : une seule notif Atlas par jour et par utilisateur
      const already = await db.notification.findFirst({
        where: { userId, icon: 'atlas', createdAt: { gte: startOfDay } },
        select: { id: true },
      })
      if (already) continue

      const user = await db.user.findUnique({ where: { id: userId }, select: { firstName: true } })
      const bits: string[] = []
      if (info.relances > 0) bits.push(`${info.relances} relance${info.relances > 1 ? 's' : ''} à faire`)
      if (info.rdv) {
        const h = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }).format(info.rdv.startAt)
        bits.push(`RDV « ${info.rdv.title} »${info.rdv.prenom ? ` avec ${info.rdv.prenom}` : ''} à ${h}`)
      }
      if (!bits.length) continue

      await db.notification.create({
        data: {
          userId,
          icon: 'atlas',
          color: '#F97316',
          text: `Bonjour ${user?.firstName ?? ''} — aujourd'hui : ${bits.join(', ')}. On s'y met ?`.replace('  ', ' '),
          go: '/atlas',
        },
      })
      sent++
    } catch {
      /* un user raté ne bloque pas les autres */
    }
  }

  return NextResponse.json({ ok: true, sent })
}
