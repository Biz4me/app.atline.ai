// Ce fichier ne gère plus que l'agenda : la connexion Google elle-même
// (jetons chiffrés, adresse d'envoi, journal, révocation) vit dans
// lib/google/connexion.ts, partagée avec Gmail.
import { jetonFrais } from '@/lib/google/connexion'

// La construction de l'URL de consentement et l'échange du code ont déménagé
// dans lib/google/oauth.ts : ils servent maintenant aussi à Gmail, et la liste
// des permissions demandées doit se lire à UN seul endroit.
export { redirectUri, echangerCode as exchangeCode } from '@/lib/google/oauth'

// Access token frais (refresh auto si expiré), ou null si non connecté / refresh impossible.
// Déléguée : le renouvellement et le déchiffrement sont communs à tous les usages Google.
export const getAccessToken = jetonFrais

export type GEvent = { id: string; title: string; start: string; end: string; allDay: boolean }

export async function listEvents(userId: string, timeMin: string, timeMax: string): Promise<GEvent[] | null> {
  const token = await getAccessToken(userId)
  if (!token) return null
  const p = new URLSearchParams({ timeMin, timeMax, singleEvents: 'true', orderBy: 'startTime', maxResults: '250' })
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${p.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null
  const data = await res.json()
  return (data.items ?? [])
    .map((e: { id: string; summary?: string; start?: { dateTime?: string; date?: string }; end?: { dateTime?: string; date?: string } }) => ({
      id: e.id,
      title: e.summary ?? '(occupé)',
      start: e.start?.dateTime ?? e.start?.date ?? '',
      end: e.end?.dateTime ?? e.end?.date ?? '',
      allDay: !e.start?.dateTime,
    }))
    .filter((e: GEvent) => e.start)
}
