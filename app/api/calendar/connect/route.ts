import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { urlConsentement, estCapacite, type Capacite } from '@/lib/google/oauth'
import { randomUUID } from 'crypto'

const BASE = process.env.NEXTAUTH_URL || 'https://app.atline.ai'

/**
 * Départ vers Google. `?pour=agenda` ou `?pour=email` : on ne demande que les
 * permissions liées à ce que le distributeur vient de cliquer, jamais tout
 * d'un coup. Google cumule de son côté ce qui a déjà été accordé.
 *
 * Le `state` porte deux choses : un aléa (protection CSRF, comparé au cookie)
 * et la capacité demandée, pour savoir sur quelle page le ramener au retour.
 */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.redirect(`${BASE}/auth`)

  const pour = new URL(req.url).searchParams.get('pour')
  const capacites: Capacite[] = estCapacite(pour) ? [pour] : ['agenda']

  const alea = randomUUID()
  const res = NextResponse.redirect(urlConsentement(`${alea}.${capacites.join('-')}`, capacites))
  res.cookies.set('cal_oauth_state', alea, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })
  return res
}
