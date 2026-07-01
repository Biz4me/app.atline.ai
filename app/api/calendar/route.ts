import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const [conn, user] = await Promise.all([
    db.calendarConnection.findUnique({ where: { userId: session.user.id } }),
    db.user.findUnique({ where: { id: session.user.id }, select: { username: true } }),
  ])
  return NextResponse.json({ connected: !!conn, email: conn?.email ?? null, username: user?.username ?? null })
}

export async function DELETE() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await db.calendarConnection.deleteMany({ where: { userId: session.user.id } })
  return NextResponse.json({ ok: true })
}
