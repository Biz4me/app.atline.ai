import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function authed(req: NextRequest): boolean {
  const token = process.env.RELANCE_API_TOKEN
  if (!token) return false
  const h = req.headers.get('x-relance-token') || (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  return h === token
}

// Marque une relance comme envoyée (appelé par n8n après l'envoi du rappel)
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!authed(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id } = await ctx.params
  const res = await db.relance.updateMany({
    where: { id, status: 'PENDING' },
    data: { status: 'SENT', sentAt: new Date() },
  })
  return NextResponse.json({ ok: true, updated: res.count })
}
