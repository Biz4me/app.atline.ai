import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function uid(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  return (token?.id as string | undefined) ?? null
}

// Liste des notifications réelles de l'utilisateur (les 30 dernières).
export async function GET(req: NextRequest) {
  const userId = await uid(req)
  if (!userId) return NextResponse.json({ error: 'non authentifié' }, { status: 401 })
  const notifications = await db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 30,
    select: { id: true, icon: true, color: true, text: true, go: true, unread: true, createdAt: true },
  })
  return NextResponse.json({ notifications })
}

// Marquer lu : { id } pour une seule, { all: true } pour toutes.
export async function PATCH(req: NextRequest) {
  const userId = await uid(req)
  if (!userId) return NextResponse.json({ error: 'non authentifié' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const now = new Date()
  if (body?.all) {
    await db.notification.updateMany({ where: { userId, unread: true }, data: { unread: false, readAt: now } })
  } else if (typeof body?.id === 'string') {
    await db.notification.updateMany({ where: { id: body.id, userId }, data: { unread: false, readAt: now } })
  }
  return NextResponse.json({ ok: true })
}
