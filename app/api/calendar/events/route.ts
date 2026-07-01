import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listEvents } from '@/lib/google-calendar'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from') || new Date(Date.now() - 7 * 86_400_000).toISOString()
  const to = searchParams.get('to') || new Date(Date.now() + 60 * 86_400_000).toISOString()

  const events = await listEvents(session.user.id, from, to)
  if (events === null) return NextResponse.json({ connected: false, events: [] })
  return NextResponse.json({ connected: true, events })
}
