import { db } from '@/lib/db'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly'
export const GOOGLE_SCOPES = ['openid', 'email', CALENDAR_SCOPE].join(' ')

function base() {
  return process.env.NEXTAUTH_URL || 'https://app.atline.ai'
}
export function redirectUri() {
  return `${base()}/api/calendar/callback`
}

export function authUrl(state: string) {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? '',
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: GOOGLE_SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${p.toString()}`
}

export async function exchangeCode(code: string) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      redirect_uri: redirectUri(),
      grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) throw new Error('token exchange failed')
  return res.json() as Promise<{ access_token: string; refresh_token?: string; expires_in: number; scope?: string }>
}

async function refreshAccess(refreshToken: string) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) throw new Error('refresh failed')
  return res.json() as Promise<{ access_token: string; expires_in: number }>
}

// Access token frais (refresh auto si expiré), ou null si non connecté / refresh impossible
export async function getAccessToken(userId: string): Promise<string | null> {
  const conn = await db.calendarConnection.findUnique({ where: { userId } })
  if (!conn) return null
  if (conn.expiresAt.getTime() > Date.now() + 60_000) return conn.accessToken
  if (!conn.refreshToken) return null
  try {
    const r = await refreshAccess(conn.refreshToken)
    await db.calendarConnection.update({
      where: { userId },
      data: { accessToken: r.access_token, expiresAt: new Date(Date.now() + r.expires_in * 1000) },
    })
    return r.access_token
  } catch {
    return null
  }
}

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
