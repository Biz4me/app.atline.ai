import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: Request, { params }: { params: { moduleId: string } }) {
  const lessons = await db.lmsLesson.findMany({
    where: { moduleId: params.moduleId, published: true },
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
