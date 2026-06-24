import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    if (
      token &&
      !token.onboardingCompleted &&
      !pathname.startsWith('/onboarding') &&
      !pathname.startsWith('/auth') &&
      !pathname.startsWith('/api')
    ) {
      return NextResponse.redirect(new URL('/onboarding', req.url))
    }
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        if (pathname.startsWith('/auth') || pathname.startsWith('/api/auth')) return true
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|brand|.*\\.png|.*\\.jpg|.*\\.svg|.*\\.ico).*)',
  ],
}
