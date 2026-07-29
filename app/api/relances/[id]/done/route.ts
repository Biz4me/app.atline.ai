import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { journaliser } from '@/lib/agents/journal'

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

  // On lit avant d'écrire : c'est le contact et le canal qui rendront la mesure possible.
  const relance = await db.relance.findUnique({
    where: { id },
    select: { userId: true, contactId: true, channel: true, message: true, status: true },
  })

  const res = await db.relance.updateMany({
    where: { id, status: 'PENDING' },
    data: { status: 'SENT', sentAt: new Date() },
  })

  // Une relance qui part est une action d'Orion. Le mesureur regardera dans
  // 72 h si le contact a réagi — et le silence comptera autant que la réponse.
  if (res.count && relance) {
    await journaliser({
      userId: relance.userId,
      agent: 'ORION',
      type: 'RELANCE',
      contactId: relance.contactId,
      canal: relance.channel,
      sourceId: id,
      contenu: relance.message,
      contexte: { heure: new Date().getHours(), longueur: relance.message?.length ?? 0 },
    })
  }

  return NextResponse.json({ ok: true, updated: res.count })
}
