import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  // `published` est le seul garde-fou entre un brouillon et ce que lit un
  // distributeur. Il n'était lu nulle part ici : les 82 leçons générées sont
  // restées en brouillon tout en étant servies, pendant que le plan du jour,
  // lui, les filtrait et ne proposait donc JAMAIS de leçon (silencieusement,
  // dans un try/catch best-effort). On le fait respecter aux trois niveaux.
  const course = await db.lmsCourse.findFirst({
    where: { published: true },
    include: {
      modules: {
        where: { published: true },
        orderBy: { position: 'asc' },
        include: {
          lessons: { where: { published: true }, select: { id: true, kind: true } },
        },
      },
    },
  })

  if (!course) return NextResponse.json(null)

  const lessonIds = course.modules.flatMap(m => m.lessons.map((l: { id: string }) => l.id))

  const [lessonProgress, quizAttempts] = await Promise.all([
    db.userLessonProgress.findMany({
      where: { userId: userId, lessonId: { in: lessonIds } },
      select: { lessonId: true, done: true },
    }),
    db.userQuizAttempt.findMany({
      where: { userId: userId, lessonId: { in: lessonIds }, passed: true },
      select: { lessonId: true },
    }),
  ])

  const doneLessonIds = new Set(lessonProgress.filter((p: { done: boolean }) => p.done).map((p: { lessonId: string }) => p.lessonId))
  const passedQuizIds = new Set(quizAttempts.map((a: { lessonId: string }) => a.lessonId))

  const modulesWithProgress = course.modules.map((mod: { id: string; lessons: { id: string; kind: string }[]; [key: string]: unknown }) => {
    const nonQuiz = mod.lessons.filter((l: { kind: string }) => l.kind === 'LESSON')
    const quizzes = mod.lessons.filter((l: { kind: string }) => l.kind === 'QUIZ')

    const doneNonQuiz = nonQuiz.filter((l: { id: string }) => doneLessonIds.has(l.id)).length
    const passedQ = quizzes.filter((l: { id: string }) => passedQuizIds.has(l.id)).length
    const total = mod.lessons.length
    const done = doneNonQuiz + passedQ
    const pct = total ? Math.round((done / total) * 100) : 0

    const allLessonsDone = nonQuiz.every((l: { id: string }) => doneLessonIds.has(l.id))
    const allQuizzesPassed = quizzes.length === 0 || quizzes.every((l: { id: string }) => passedQuizIds.has(l.id))
    const status = allLessonsDone && allQuizzesPassed && total > 0 ? 'DONE' : pct > 0 ? 'IN_PROGRESS' : 'NOT_STARTED'

    // `_count.lessons` venait de Prisma et comptait TOUTES les leçons, brouillons
    // compris. On le recalcule sur les seules leçons publiées : le front l'affiche
    // (« N leçons ») et s'en sert pour pondérer la progression globale.
    const { lessons: _, ...rest } = mod
    return { ...rest, _count: { lessons: total }, progress: [{ pct, status }] }
  })

  return NextResponse.json({ ...course, modules: modulesWithProgress })
}
