import { NextRequest, NextResponse } from 'next/server'
import { resolveProspectRef } from '@/lib/prospect-ref'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Endpoint INTERNE (bot Telegram, pivot T4) : résout un code de parrainage vers le
// distributeur réel. Protégé par secret partagé, comme contact-lookup.
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret')
  if (!process.env.INTERNAL_API_SECRET || secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const body = await req.json().catch(() => null)
  const ref = typeof body?.ref === 'string' ? body.ref : ''
  const productSlug = typeof body?.productSlug === 'string' && body.productSlug.trim() ? body.productSlug.trim() : undefined
  const resolved = await resolveProspectRef(ref, productSlug)
  if (!resolved) return NextResponse.json({ error: 'inconnu' }, { status: 404 })
  return NextResponse.json(resolved)
}
