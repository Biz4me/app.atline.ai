import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// TODO: remplacer DEMO_USER_ID par getServerSession une fois l'auth configurée
const DEMO_USER_ID = 'demo'

export async function GET() {
  const progress = await db.userLessonProgress.findMany({
    where: { userId: DEMO_USER_ID },
    select: { lessonId: true, done: true, completedAt: true },
  })
  return NextResponse.json(progress)
}

export async function POST(req: Request) {
  const { lessonId, done } = await req.json()
  const result = await db.userLessonProgress.upsert({
    where: { userId_lessonId: { userId: DEMO_USER_ID, lessonId } },
    create: { userId: DEMO_USER_ID, lessonId, done, completedAt: done ? new Date() : null },
    update: { done, completedAt: done ? new Date() : null },
  })
  return NextResponse.json(result)
}
