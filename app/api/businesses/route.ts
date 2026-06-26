import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json([], { status: 401 })

  const rows = await db.userMlmBusiness.findMany({
    where: { userId: session.user.id },
    orderBy: { position: 'asc' },
  })

  const prefs = await db.userPreferences.findUnique({ where: { userId: session.user.id } })

  return NextResponse.json(rows.map(b => ({
    id: b.id,
    name: b.mlmName,
    initials: b.initials ?? b.mlmName.slice(0, 2).toUpperCase(),
    color: b.color ?? '#F97316',
    active: b.active,
    isActive: b.id === prefs?.activeCompanyId,
  })))
}
