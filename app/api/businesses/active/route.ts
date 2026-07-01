import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Définit l'activité active de l'utilisateur (userPreferences.activeCompanyId)
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  const body = await req.json().catch(() => null)
  const id = typeof body?.id === 'string' ? body.id : ''
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const biz = await db.userMlmBusiness.findFirst({ where: { id, userId }, select: { id: true } })
  if (!biz) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.userPreferences.upsert({
    where: { userId },
    create: { userId, activeCompanyId: id },
    update: { activeCompanyId: id },
  })
  return NextResponse.json({ ok: true })
}
