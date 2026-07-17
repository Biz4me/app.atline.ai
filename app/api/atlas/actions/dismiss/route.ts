import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// L'utilisateur ÉCARTE une proposition d'Atlas (✕ sur la carte) : on consomme la
// proposition persistée sans l'exécuter — la carte ne ressuscitera pas au refresh.
export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const userId = token?.id as string | undefined
  if (!userId) return NextResponse.json({ error: 'non authentifié' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const kind = typeof body?.kind === 'string' ? body.kind : ''
  if (!kind) return NextResponse.json({ error: 'kind requis' }, { status: 400 })

  try {
    const m = await db.atlasMessage.findFirst({
      where: { conversation: { userId }, content: { startsWith: '[[ACTION]]', contains: `"kind":"${kind}"` } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, content: true },
    })
    if (m) await db.atlasMessage.update({ where: { id: m.id }, data: { content: m.content.replace('[[ACTION]]', '[[ACTION_DONE]]') } })
  } catch { /* best-effort */ }
  return NextResponse.json({ ok: true })
}
