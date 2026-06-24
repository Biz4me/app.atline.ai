import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
export async function GET(_req: Request, props: { params: Promise<{ moduleId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  const { moduleId } = await props.params
  const mod = await db.lmsModule.findUnique({
    where: { id: moduleId },
    include: {
      course: { select: { _count: { select: { modules: true } } } },
      _count: { select: { lessons: true } },
      progress: {
        where: { userId: userId },
        select: { pct: true, status: true },
      },
    },
  })
  return NextResponse.json(mod)
}
