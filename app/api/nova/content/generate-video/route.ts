import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { saveUpload } from '@/lib/storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 240

const ATLAS_URL = process.env.ATLAS_URL || 'http://127.0.0.1:8100'
const PLATFORMS = ['INSTAGRAM', 'TIKTOK', 'FACEBOOK', 'LINKEDIN', 'YOUTUBE', 'TWITTER']

// Génère une vidéo faceless (IA) à partir du script, l'attache au ContentPost (mediaUrl).
// Réutilise le même stockage que la vidéo filmée → « Revoir ma vidéo » l'affiche pareil.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const script = typeof body?.script === 'string' ? body.script.trim() : ''
  if (script.length < 10) return NextResponse.json({ error: 'script trop court' }, { status: 400 })
  const platform = PLATFORMS.includes(body?.platform) ? body.platform : 'INSTAGRAM'

  // 1) Assure un ContentPost (existant possédé, sinon création rattachée à la campagne)
  let postId: string | null = null
  if (body?.postId) {
    const owned = await db.contentPost.findFirst({ where: { id: body.postId, userId }, select: { id: true } })
    if (owned) postId = owned.id
  }
  if (!postId) {
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
        caption: script.slice(0, 2000),
        status: 'BROUILLON',
        novaGenerated: true,
        format: typeof body?.role === 'string' ? body.role : 'Attirer',
      },
    })
    postId = post.id
  }

  // 2) Génération de la vidéo par le service (beats → images + voix off → sous-titres → ffmpeg)
  let mp4: ArrayBuffer
  try {
    const r = await fetch(`${ATLAS_URL}/api/nova/faceless-video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ script }),
      signal: AbortSignal.timeout(230000),
    })
    if (!r.ok) {
      const detail = await r.text().catch(() => '')
      return NextResponse.json({ error: 'Génération échouée', detail: detail.slice(0, 300) }, { status: 502 })
    }
    mp4 = await r.arrayBuffer()
  } catch {
    return NextResponse.json({ error: 'Service vidéo indisponible' }, { status: 502 })
  }
  if (mp4.byteLength < 10_000) return NextResponse.json({ error: 'Vidéo vide' }, { status: 502 })

  // 3) Sauvegarde (même stockage que la vidéo filmée)
  const file = new File([new Uint8Array(mp4)], 'faceless.mp4', { type: 'video/mp4' })
  const { relPath } = await saveUpload(userId, file)
  await db.contentPost.update({ where: { id: postId }, data: { mediaUrl: relPath } })

  return NextResponse.json({ ok: true, postId })
}
