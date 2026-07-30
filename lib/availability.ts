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

/**
 * LES PROCHAINS CRÉNEAUX RÉELLEMENT LIBRES — pour qu'Orion propose une heure
 * vraie, jamais une heure inventée.
 *
 * ⚠️ Renvoie une liste VIDE si la permission agenda n'a pas été accordée. Ce
 * n'est pas une dégradation silencieuse, c'est le comportement voulu : sans
 * accès au Google Agenda du distributeur, on ignore ses vraies occupations et
 * on proposerait un rendez-vous alors qu'il est déjà pris. Un rendez-vous à
 * fixer à la main vaut mieux qu'un rendez-vous en double.
 *
 * On espace les propositions d'au moins deux heures et on ne donne jamais deux
 * créneaux le même jour : trois horaires collés le même après-midi se lisent
 * comme un agenda vide, ce qui n'aide personne.
 */
const SCOPE_AGENDA = 'https://www.googleapis.com/auth/calendar.readonly'

export async function prochainsCreneaux(
  userId: string,
  combien = 3,
  joursExplores = 10,
): Promise<{ debut: string; libelle: string }[]> {
  const conn = await db.googleConnection.findUnique({
    where: { userId },
    select: { scope: true, revokedAt: true },
  })
  if (!conn || conn.revokedAt || !(conn.scope ?? '').split(' ').includes(SCOPE_AGENDA)) return []

  const format = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Paris',
  })

  const retenus: { debut: string; libelle: string }[] = []
  const joursUtilises = new Set<string>()

  for (let i = 0; i < joursExplores && retenus.length < combien; i++) {
    const jour = new Date()
    jour.setDate(jour.getDate() + i)
    const libres = await slotsForDay(userId, jour.toISOString())
    if (!libres.length) continue

    // Un seul créneau par jour, et plutôt en milieu de plage : proposer
    // systématiquement 9 h donne l'impression d'un agenda désert.
    const choisi = libres[Math.min(2, libres.length - 1)]
    const cle = choisi.slice(0, 10)
    if (joursUtilises.has(cle)) continue
    joursUtilises.add(cle)

    retenus.push({ debut: choisi, libelle: format.format(new Date(choisi)) })
  }

  return retenus
}

/** Le lien de réservation du distributeur, ou null s'il n'a pas de nom d'utilisateur. */
export async function lienDeReservation(userId: string): Promise<string | null> {
  const u = await db.user.findUnique({ where: { id: userId }, select: { username: true } })
  return u?.username ? `https://app.atline.ai/rdv/${u.username}` : null
}
