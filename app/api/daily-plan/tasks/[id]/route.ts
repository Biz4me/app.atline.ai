import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { done } = await req.json()

  // Verify ownership via plan
  const task = await db.dailyTask.findFirst({
    where: { id: params.id, plan: { userId: session.user.id } },
  })
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await db.dailyTask.update({
    where: { id: params.id },
    data: { done, doneAt: done ? new Date() : null },
  })

  return NextResponse.json(updated)
}
