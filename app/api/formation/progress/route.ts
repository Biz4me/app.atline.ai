import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  const progress = await db.userLessonProgress.findMany({
    where: { userId: userId },
    select: { lessonId: true, done: true, completedAt: true },
  })
  return NextResponse.json(progress)
}

export async function POST(req: Request) {
  const { lessonId, done } = await req.json()
  const result = await db.userLessonProgress.upsert({
    where: { userId_lessonId: { userId: userId, lessonId } },
    create: { userId: userId, lessonId, done, completedAt: done ? new Date() : null },
    update: { done, completedAt: done ? new Date() : null },
  })
  return NextResponse.json(result)
}
