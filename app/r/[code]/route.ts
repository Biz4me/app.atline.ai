import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Lien d'affiliation app.atline.ai/r/{code} → pose un cookie de parrainage puis redirige vers l'inscription
export async function GET(req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code: raw } = await ctx.params
  const code = (raw || '').toLowerCase().trim()
  // Location relative → le navigateur résout sur l'origine publique (pas l'host interne)
  const res = new NextResponse(null, {
    status: 307,
    headers: { Location: code ? `/auth?ref=${encodeURIComponent(code)}` : '/auth' },
  })
  if (code) {
    res.cookies.set('atline_ref', code, { maxAge: 60 * 60 * 24 * 30, path: '/', sameSite: 'lax' })
  }
  return res
}
