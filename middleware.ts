import { getToken } from 'next-auth/jwt'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Laisser passer les routes publiques
  if (
    pathname.startsWith('/auth') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/r/') ||
    pathname.startsWith('/rdv/') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/brand') ||
    pathname.match(/\.(png|jpg|svg|ico|webp|webmanifest)$/)
  ) {
    return NextResponse.next()
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  // Non authentifié → login
  if (!token) {
    return NextResponse.redirect(new URL('/auth', req.url))
  }

  // Gate onboarding DÉSACTIVÉ temporairement : il bouclait (JWT périmé onboardingCompleted=false
  // alors que la base = true → /onboarding rebondit vers /home → middleware re-redirige → page blanche).
  // L'entrée vers /onboarding pour les nouveaux comptes sera rebranchée proprement (sans boucle) ensuite.
  // if (!token.onboardingCompleted && pathname !== '/onboarding') {
  //   return NextResponse.redirect(new URL('/onboarding', req.url))
  // }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
}
