import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { journaliser } from '@/lib/agents/journal'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Le point de bascule d'une publication. Il manquait : rien dans le code ne
// faisait passer un post en PUBLIE, donc Nova ne pouvait avoir aucun score.
// C'est ici que la publication entre au journal — et sa mesure suivra les
// clics remontés dans PostAnalytics.
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  const body = (await req.json().catch(() => ({}))) as { status?: string; caption?: string; publishedAt?: string }

  const post = await db.contentPost.findFirst({
    where: { id, userId },
    select: { id: true, status: true, caption: true, platform: true, campaignId: true },
  })
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const statuts = ['BROUILLON', 'PLANIFIE', 'PUBLIE', 'ARCHIVE']
  if (body.status && !statuts.includes(body.status)) {
    return NextResponse.json({ error: 'statut inconnu' }, { status: 400 })
  }

  const devientPublie = body.status === 'PUBLIE' && post.status !== 'PUBLIE'

  const maj = await db.contentPost.update({
    where: { id },
    data: {
      ...(body.status ? { status: body.status as never } : {}),
      ...(body.caption ? { caption: body.caption } : {}),
      ...(devientPublie ? { publishedAt: body.publishedAt ? new Date(body.publishedAt) : new Date() } : {}),
    },
    select: { id: true, status: true, publishedAt: true },
  })

  // Une publication est une action de Nova : on la journalise au moment où
  // elle part réellement, jamais quand elle est écrite.
  if (devientPublie) {
    await journaliser({
      userId,
      agent: 'NOVA',
      type: 'PUBLICATION',
      canal: post.platform ? String(post.platform).toLowerCase() : null,
      sourceId: post.id,          // le mesureur ira lire PostAnalytics.clicks avec cet id
      contenu: post.caption,
      contexte: {
        plateforme: post.platform,
        campagne: post.campaignId,
        heure: new Date().getHours(),
        longueur: post.caption?.length ?? 0,
      },
    })
  }

  return NextResponse.json(maj)
}
