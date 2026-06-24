import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const course = await db.lmsCourse.findFirst({
    where: { published: true },
    include: {
      modules: {
        orderBy: { position: 'asc' },
        include: {
          _count: { select: { lessons: true } },
        },
      },
    },
  })
  return NextResponse.json(course)
}
