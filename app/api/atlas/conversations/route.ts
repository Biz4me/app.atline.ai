import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const userId = token?.id as string | undefined
  if (!userId) return NextResponse.json({ error: 'non authentifié' }, { status: 401 })

  // ?contactId= → conversations d'un contact précis ; sinon historique principal (hors contact).
  const contactId = req.nextUrl.searchParams.get('contactId')
  const convs = await db.atlasConversation.findMany({
    where: contactId ? { userId, contactId } : { userId, contactId: null },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, title: true, updatedAt: true },
    take: contactId ? 30 : 100,
  })
  return NextResponse.json(convs)
}
