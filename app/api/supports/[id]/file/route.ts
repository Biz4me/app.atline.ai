import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { readUpload, mimeFor } from '@/lib/storage'

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  const s = await db.toolboxSupport.findFirst({ where: { id, userId: session.user.id } })
  if (!s) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const buf = await readUpload(s.fileUrl)
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': mimeFor(s.format),
        'Content-Disposition': `inline; filename="${encodeURIComponent(s.title)}.${s.format}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch {
    return NextResponse.json({ error: 'File missing' }, { status: 404 })
  }
}
