import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
export async function GET(
  _req: Request,
  props: { params: Promise<{ moduleId: string; lessonId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  const { moduleId, lessonId } = await props.params

  const [lesson, mod, allLessons, progress] = await Promise.all([
    db.lmsLesson.findUnique({
      where: { id: lessonId },
      select: {
        id: true, title: true, position: true, kind: true, type: true,
        durationMin: true, summary: true, intro: true, content: true,
        passThreshold: true,
        _count: { select: { questions: true } },
        questions: {
          orderBy: { position: 'asc' },
          select: {
            id: true, position: true, type: true, question: true,
            options: true, correctAnswer: true, correctBool: true,
          },
        },
      },
    }),
    db.lmsModule.findUnique({
      where: { id: moduleId },
      select: { title: true, position: true },
    }),
    db.lmsLesson.findMany({
      where: { moduleId },
      orderBy: { position: 'asc' },
      select: { id: true, position: true, kind: true, title: true },
    }),
    db.userLessonProgress.findUnique({
      where: { userId_lessonId: { userId: userId, lessonId } },
      select: { done: true },
    }),
  ])

  if (!lesson) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const idx = allLessons.findIndex(l => l.id === lessonId)
  const nextLesson = idx < allLessons.length - 1 ? allLessons[idx + 1] : null
  const prevLesson = idx > 0 ? allLessons[idx - 1] : null

  return NextResponse.json({
    ...lesson,
    moduleTitle: mod?.title ?? null,
    modulePosition: mod?.position ?? 0,
    total: allLessons.length,
    nextLesson,
    prevLesson,
    done: progress?.done ?? false,
  })
}
