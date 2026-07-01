import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json([], { status: 401 })

  const rows = await db.userMlmBusiness.findMany({
    where: { userId: session.user.id },
    orderBy: { position: 'asc' },
  })

  const prefs = await db.userPreferences.findUnique({ where: { userId: session.user.id } })

  return NextResponse.json(rows.map(b => ({
    id: b.id,
    name: b.mlmName,
    initials: b.initials ?? b.mlmName.slice(0, 2).toUpperCase(),
    color: b.color ?? '#F97316',
    active: b.active,
    isActive: b.id === prefs?.activeCompanyId,
  })))
}

const ACCENT = ['#F97316', '#8B5CF6', '#3B82F6', '#22C55E', '#EF4444', '#EC4899', '#14B8A6']
const pick = () => ACCENT[Math.floor(Math.random() * ACCENT.length)]
const slugify = (s: string) => s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')

// Crée une nouvelle activité MLM et la rend active
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  const body = await req.json().catch(() => null)
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  if (!name) return NextResponse.json({ error: 'Nom requis' }, { status: 400 })
  const category = typeof body?.category === 'string' && body.category.trim() ? body.category.trim() : 'coaching'

  const mlmSlug = slugify(name) || 'activite'

  let biz = await db.userMlmBusiness.findFirst({ where: { userId, mlmSlug } })
  if (!biz) {
    const count = await db.userMlmBusiness.count({ where: { userId } })
    biz = await db.userMlmBusiness.create({
      data: {
        userId, mlmName: name, mlmSlug, role: 'Distributeur', goal: '',
        color: pick(), initials: name.slice(0, 2).toUpperCase(), active: true, category, position: count,
      },
    })
  }

  await db.userPreferences.upsert({
    where: { userId },
    create: { userId, activeCompanyId: biz.id },
    update: { activeCompanyId: biz.id },
  })

  return NextResponse.json({ id: biz.id, name: biz.mlmName })
}
