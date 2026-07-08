import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

const PLATFORMS = ['INSTAGRAM', 'TIKTOK', 'FACEBOOK', 'LINKEDIN', 'YOUTUBE', 'TWITTER']

// Crée OU met à jour un contenu de campagne (ex. le BOFU / contenu de conversion généré par Nova).
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const caption = typeof body?.caption === 'string' ? body.caption.trim() : ''
  if (!caption) return NextResponse.json({ error: 'caption requise' }, { status: 400 })
  const platform = PLATFORMS.includes(body?.platform) ? body.platform : 'INSTAGRAM'

  // Mise à jour d'un post existant (le BOFU évolue dans le chat)
  if (body?.postId) {
    const owned = await db.contentPost.findFirst({ where: { id: body.postId, userId }, select: { id: true } })
    if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const post = await db.contentPost.update({ where: { id: body.postId }, data: { caption, platform } })
    return NextResponse.json({ post: { id: post.id } })
  }

  // Création : rattachée à la campagne (cloisonnement via campaign.mlmBusinessId)
  const campaign = await db.campaign.findFirst({
    where: { id: body?.campaignId, userId },
    select: { id: true, mlmBusinessId: true },
  })
  if (!campaign) return NextResponse.json({ error: 'Campagne introuvable' }, { status: 404 })

  const post = await db.contentPost.create({
    data: {
      userId,
      mlmBusinessId: campaign.mlmBusinessId,
      campaignId: campaign.id,
      platform,
      caption,
      status: 'BROUILLON',
      novaGenerated: true,
      format: 'Convertir', // rôle funnel (BOFU)
    },
  })
  return NextResponse.json({ post: { id: post.id } })
}
