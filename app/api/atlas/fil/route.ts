import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ═══ LE FIL CONTINU d'Atlas (nav messagerie) ═══
// Une seule conversation aux yeux de l'utilisateur : les derniers messages TOUTES
// conversations confondues (hors fils contact), en ordre chronologique, plus l'id
// de la conversation la plus récente — celle que le composeur CONTINUE.
// (Les « conversations » restent en base : c'est l'unité de compaction/résumé.)
export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const userId = token?.id as string | undefined
  if (!userId) return NextResponse.json({ error: 'non authentifié' }, { status: 401 })

  const [rows, latest] = await Promise.all([
    db.atlasMessage.findMany({
      where: { conversation: { userId, contactId: null } },
      orderBy: { createdAt: 'desc' },
      take: 60,
      select: { role: true, content: true, createdAt: true, conversationId: true },
    }),
    db.atlasConversation.findFirst({
      where: { userId, contactId: null },
      orderBy: { updatedAt: 'desc' },
      select: { id: true },
    }),
  ])

  return NextResponse.json({ messages: rows.reverse(), conversationId: latest?.id ?? null })
}
