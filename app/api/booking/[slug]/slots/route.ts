import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { slotsForDay } from '@/lib/availability'

// PUBLIC — créneaux libres d'un distributeur pour une date donnée
export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  if (!date) return NextResponse.json({ slots: [] })

  const user = await db.user.findUnique({ where: { username: slug }, select: { id: true } })
  if (!user) return NextResponse.json({ slots: [] })

  const slots = await slotsForDay(user.id, date)
  return NextResponse.json({ slots })
}
