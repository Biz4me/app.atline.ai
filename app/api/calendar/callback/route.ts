import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { exchangeCode } from '@/lib/google-calendar'

const BASE = process.env.NEXTAUTH_URL || 'https://app.atline.ai'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.redirect(`${BASE}/auth`)

  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const jar = await cookies()
  const expected = jar.get('cal_oauth_state')?.value

  if (error || !code || !state || !expected || state !== expected) {
    return NextResponse.redirect(`${BASE}/agenda?cal=err`)
  }

  try {
    const tok = await exchangeCode(code)
    let email: string | null = null
    try {
      const ui = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: `Bearer ${tok.access_token}` } })
      if (ui.ok) email = (await ui.json())?.email ?? null
    } catch { /* email optionnel */ }

    const expiresAt = new Date(Date.now() + tok.expires_in * 1000)
    await db.calendarConnection.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, email, accessToken: tok.access_token, refreshToken: tok.refresh_token ?? null, expiresAt, scope: tok.scope ?? null },
      update: { email, accessToken: tok.access_token, ...(tok.refresh_token ? { refreshToken: tok.refresh_token } : {}), expiresAt, scope: tok.scope ?? null },
    })

    const res = NextResponse.redirect(`${BASE}/agenda?cal=ok`)
    res.cookies.delete('cal_oauth_state')
    return res
  } catch {
    return NextResponse.redirect(`${BASE}/agenda?cal=err`)
  }
}
