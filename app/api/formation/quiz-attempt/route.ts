import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  const { lessonId, score, passed, answers } = await req.json()

  if (!lessonId) return NextResponse.json({ error: 'Missing lessonId' }, { status: 400 })

  await db.userQuizAttempt.create({
    data: {
      userId: userId,
      lessonId,
      score,
      passed,
      answers,
    },
  })

  return NextResponse.json({ ok: true })
}
