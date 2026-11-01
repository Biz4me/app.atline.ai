import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(_req: Request, props: { params: Promise<{ moduleId: string }> }) {
  // 🔴 Cette route ne vérifiait RIEN : ni session, ni plan. Avec un moduleId elle
  // servait 134 652 caractères de leçons pour le seul module 1 (140 Ko), sur les
  // 772 599 que compte la formation — l'équivalent d'un livre de 300 pages.
  // C'est le dernier fichier de formation resté à l'époque du DEMO_USER_ID, quand
  // l'auth n'était pas branchée : `modules/` et `lessons/[lessonId]` ont été
  // reprises, celui-ci est passé au travers. Et rien ne pouvait le dire, parce
  // que le middleware laisse passer tout `/api/` : chaque route est SEULE
  // gardienne d'elle-même, sans deuxième ligne de défense.
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { moduleId } = await props.params
  const lessons = await db.lmsLesson.findMany({
    where: { moduleId, published: true },   // un brouillon ne se sert pas
    orderBy: { position: 'asc' },
    select: {
      id: true,
      title: true,
      position: true,
      kind: true,
      type: true,
      durationMin: true,
      summary: true,
      intro: true,
      content: true,
      _count: { select: { questions: true } },
    },
  })
  return NextResponse.json(lessons)
}
