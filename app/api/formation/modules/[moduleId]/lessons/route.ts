import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: Request, props: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = await props.params
  const lessons = await db.lmsLesson.findMany({
    where: { moduleId },
    orderBy: { position: 'asc' },
    select: {
      id: true,
      title: true,
      position: true,
      kind: true,
      type: true,
      durationMin: true,
      summary: true,
      content: true,
      _count: { select: { questions: true } },
    },
  })
  return NextResponse.json(lessons)
}
