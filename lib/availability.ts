import { db } from '@/lib/db'
import { listEvents } from '@/lib/google-calendar'

// Phase 3 étape 1 — disponibilités PAR DÉFAUT. Réglages perso (heures/jours/durée) = à venir.
const WORK_DAYS = [1, 2, 3, 4, 5] // 0=dim … 6=sam → Lun-Ven
const START_HOUR = 9
const END_HOUR = 17
const SLOT_MIN = 30
const MIN_NOTICE_MIN = 60 // pas de réservation dans l'heure qui suit

export const SLOT_DURATION_MIN = SLOT_MIN

// Renvoie les créneaux libres (ISO) d'un jour : défauts − RDV Atline − busy Google.
export async function slotsForDay(userId: string, dayISO: string): Promise<string[]> {
  const day = new Date(dayISO)
  if (isNaN(day.getTime())) return []
  day.setHours(0, 0, 0, 0)
  if (!WORK_DAYS.includes(day.getDay())) return []

  const slotMs = SLOT_MIN * 60_000
  const now = Date.now()
  const dayStart = new Date(day)
  const dayEnd = new Date(day); dayEnd.setHours(23, 59, 59, 999)

  // Créneaux candidats
  const candidates: Date[] = []
  for (let h = START_HOUR; h < END_HOUR; h++) {
    for (let m = 0; m < 60; m += SLOT_MIN) {
      const s = new Date(day); s.setHours(h, m, 0, 0)
      candidates.push(s)
    }
  }

  // Intervalles occupés : RDV Atline (+ durée) et events Google
  const appts = await db.appointment.findMany({
    where: { userId, startAt: { gte: dayStart, lte: dayEnd } },
    select: { startAt: true },
  })
  const busy: { start: number; end: number }[] = appts.map((a) => ({ start: a.startAt.getTime(), end: a.startAt.getTime() + slotMs }))

  const events = await listEvents(userId, dayStart.toISOString(), dayEnd.toISOString())
  if (events) {
    for (const e of events) {
      if (e.allDay) continue
      busy.push({ start: new Date(e.start).getTime(), end: new Date(e.end).getTime() })
    }
  }

  return candidates
    .filter((s) => {
      const t = s.getTime(); const end = t + slotMs
      if (t < now + MIN_NOTICE_MIN * 60_000) return false
      if (busy.some((b) => t < b.end && end > b.start)) return false
      return true
    })
    .map((s) => s.toISOString())
}
