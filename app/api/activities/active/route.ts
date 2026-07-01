import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const LINK_TYPES = ['BOUTIQUE', 'PARRAINAGE', 'RDV', 'WHATSAPP', 'WHATSAPP_GROUP', 'ZOOM', 'INSTAGRAM', 'FACEBOOK', 'TIKTOK'] as const

async function activeBusiness(userId: string) {
  const prefs = await db.userPreferences.findUnique({ where: { userId }, select: { activeCompanyId: true } })
  if (prefs?.activeCompanyId) {
    const b = await db.userMlmBusiness.findFirst({ where: { id: prefs.activeCompanyId, userId } })
    if (b) return b
  }
  return db.userMlmBusiness.findFirst({ where: { userId }, orderBy: { position: 'asc' } })
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  const biz = await activeBusiness(userId)
  if (!biz) return NextResponse.json({ activity: null })

  const [links, supports] = await Promise.all([
    db.toolboxLink.findMany({ where: { userId, mlmBusinessId: biz.id } }),
    db.toolboxSupport.findMany({ where: { userId, mlmBusinessId: biz.id }, orderBy: { createdAt: 'desc' } }),
  ])

  const linkMap: Record<string, string> = {}
  for (const l of links) linkMap[l.linkType] = l.url ?? ''

  const buckets: Record<string, { id: string; title: string; description: string | null; format: string; fileUrl: string; createdAt: Date }[]> = {
    PRESENTER: [], FORMER: [], VENDRE: [],
  }
  for (const s of supports) {
    (buckets[s.bucket] ??= []).push({ id: s.id, title: s.title, description: s.description, format: s.format, fileUrl: s.fileUrl, createdAt: s.createdAt })
  }

  return NextResponse.json({
    activity: {
      id: biz.id,
      mlmName: biz.mlmName,
      rank: biz.rank ?? '',
      category: biz.category ?? '',
      goal: biz.goal ?? '',
      objectif: (biz.objectif && typeof biz.objectif === 'object' && !Array.isArray(biz.objectif)) ? biz.objectif : {},
      produit: biz.produit ?? '',
      color: biz.color,
      active: biz.active,
      links: linkMap,
      supports: buckets,
    },
  })
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  const biz = await activeBusiness(userId)
  if (!biz) return NextResponse.json({ error: 'No activity' }, { status: 404 })

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Bad request' }, { status: 400 })

  // Identité
  const data: Record<string, unknown> = {}
  if (typeof body.mlmName === 'string' && body.mlmName.trim()) data.mlmName = body.mlmName.trim()
  if (typeof body.rank === 'string') data.rank = body.rank.trim() || null
  if (typeof body.category === 'string') data.category = body.category.trim() || 'coaching'
  if (typeof body.goal === 'string') data.goal = body.goal.trim() || null
  if (typeof body.produit === 'string') data.produit = body.produit.trim() || null
  if (body.objectif && typeof body.objectif === 'object' && !Array.isArray(body.objectif)) {
    const clean: Record<string, string> = {}
    for (const [k, v] of Object.entries(body.objectif)) {
      if (typeof v === 'string' && v.trim()) clean[k] = v.trim()
    }
    data.objectif = clean
  }
  if (Object.keys(data).length) await db.userMlmBusiness.update({ where: { id: biz.id }, data })

  // Liens (upsert / delete)
  if (body.links && typeof body.links === 'object') {
    for (const type of LINK_TYPES) {
      if (!(type in body.links)) continue
      const url = typeof body.links[type] === 'string' ? body.links[type].trim() : ''
      if (url) {
        await db.toolboxLink.upsert({
          where: { userId_mlmBusinessId_linkType: { userId, mlmBusinessId: biz.id, linkType: type as never } },
          create: { userId, mlmBusinessId: biz.id, linkType: type as never, url },
          update: { url },
        })
      } else {
        await db.toolboxLink.deleteMany({ where: { userId, mlmBusinessId: biz.id, linkType: type as never } })
      }
    }
  }

  return NextResponse.json({ ok: true })
}
