import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function getUserId(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  return token?.id as string | undefined
}

// Charger une conversation + ses messages
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'non authentifié' }, { status: 401 })
  const { id } = await params

  const conv = await db.atlasConversation.findFirst({
    where: { id, userId },
    select: { id: true, title: true },
  })
  if (!conv) return NextResponse.json({ error: 'introuvable' }, { status: 404 })

  const messages = await db.atlasMessage.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: 'asc' },
    select: { role: true, content: true },
  })
  return NextResponse.json({ ...conv, messages })
}

// Renommer
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'non authentifié' }, { status: 401 })
  const { id } = await params

  const body = await req.json().catch(() => ({}))
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  if (!title) return NextResponse.json({ error: 'titre invalide' }, { status: 400 })

  const r = await db.atlasConversation.updateMany({ where: { id, userId }, data: { title } })
  if (r.count === 0) return NextResponse.json({ error: 'introuvable' }, { status: 404 })
  return NextResponse.json({ ok: true })
}

// Supprimer (les messages tombent en cascade)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'non authentifié' }, { status: 401 })
  const { id } = await params

  const r = await db.atlasConversation.deleteMany({ where: { id, userId } })
  if (r.count === 0) return NextResponse.json({ error: 'introuvable' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
