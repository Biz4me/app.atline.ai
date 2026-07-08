import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { saveUpload, readUpload, mimeFor } from '@/lib/storage'

const MAX_BYTES = 80 * 1024 * 1024 // 80 Mo (clip vertical court)

async function owned(id: string, userId: string) {
  return db.contentPost.findFirst({ where: { id, userId } })
}

// Upload de la vidéo (Face) enregistrée in-app → attachée au ContentPost (mediaUrl).
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await ctx.params
  const post = await owned(id, userId)
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'file required' }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'file too large' }, { status: 413 })

  const { relPath } = await saveUpload(userId, file)
  await db.contentPost.update({ where: { id }, data: { mediaUrl: relPath } })
  return NextResponse.json({ ok: true })
}

// Service de la vidéo (mime déduit de l'extension du chemin stocké).
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await ctx.params
  const post = await owned(id, userId)
  if (!post?.mediaUrl) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const buf = await readUpload(post.mediaUrl)
    const ext = post.mediaUrl.split('.').pop() || 'webm'
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': mimeFor(ext),
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch {
    return NextResponse.json({ error: 'File missing' }, { status: 404 })
  }
}
