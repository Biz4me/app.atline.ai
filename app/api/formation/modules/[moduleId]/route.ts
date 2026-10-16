import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
export async function GET(_req: Request, props: { params: Promise<{ moduleId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  const { moduleId } = await props.params
  // `findFirst` et non `findUnique` : on veut pouvoir exiger `published`.
  // Un module en brouillon n'existe pas pour un distributeur.
  const mod = await db.lmsModule.findFirst({
    where: { id: moduleId, published: true },
    include: {
      course: { select: { modules: { where: { published: true }, select: { id: true } } } },
      lessons: { where: { published: true }, select: { id: true } },
      progress: {
        where: { userId: userId },
        select: { pct: true, status: true },
      },
    },
  })
  if (!mod) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Le front lit `_count.lessons` et `course._count.modules` : on garde sa forme,
  // mais les compteurs ne portent plus que sur ce qui est publié.
  const { lessons, course, ...rest } = mod
  return NextResponse.json({
    ...rest,
    _count: { lessons: lessons.length },
    course: { _count: { modules: course.modules.length } },
  })
}
