import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { authUrl } from '@/lib/google-calendar'
import { randomUUID } from 'crypto'

const BASE = process.env.NEXTAUTH_URL || 'https://app.atline.ai'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.redirect(`${BASE}/auth`)

  const state = randomUUID()
  const res = NextResponse.redirect(authUrl(state))
  res.cookies.set('cal_oauth_state', state, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600, path: '/' })
  return res
}
