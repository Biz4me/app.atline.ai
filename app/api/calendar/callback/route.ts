import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { exchangeCode } from '@/lib/google-calendar'
import { enregistrerConnexion, journaliser } from '@/lib/google/connexion'

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

    // L'adresse vient de Google, JAMAIS de User.email : c'est elle que les
    // prospects verront, et le distributeur a pu choisir un autre compte que
    // celui de son inscription. Si on ne l'obtient pas, on le trace plutôt que
    // de laisser une connexion anonyme s'installer en silence.
    let email: string | null = null
    try {
      const ui = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tok.access_token}` },
      })
      if (ui.ok) email = (await ui.json())?.email ?? null
    } catch { /* traité juste en dessous */ }

    if (!email) {
      await journaliser({
        userId: session.user.id,
        action: 'ERREUR',
        detail: 'adresse du compte Google non obtenue à la connexion',
      })
    }

    await enregistrerConnexion({
      userId: session.user.id,
      email,
      accessToken: tok.access_token,
      refreshToken: tok.refresh_token ?? null,
      expiresIn: tok.expires_in,
      scope: tok.scope ?? null,
    })

    const res = NextResponse.redirect(`${BASE}/agenda?cal=ok`)
    res.cookies.delete('cal_oauth_state')
    return res
  } catch {
    return NextResponse.redirect(`${BASE}/agenda?cal=err`)
  }
}
