import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { saveUpload } from '@/lib/storage'

const BUCKETS = ['PRESENTER', 'FORMER', 'VENDRE']
const MAX_BYTES = 25 * 1024 * 1024 // 25 Mo

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file')
  const bucket = String(form.get('bucket') ?? '')
  if (!(file instanceof File)) return NextResponse.json({ error: 'file required' }, { status: 400 })
  if (!BUCKETS.includes(bucket)) return NextResponse.json({ error: 'invalid bucket' }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'file too large' }, { status: 413 })

  const business = await db.userMlmBusiness.findFirst({ where: { userId: session.user.id, active: true } })
  if (!business) return NextResponse.json({ error: 'No active business' }, { status: 400 })

  const title = (String(form.get('title') ?? '').trim() || file.name.replace(/\.[^.]+$/, '')).slice(0, 120)
  const { relPath, format } = await saveUpload(session.user.id, file)

  const support = await db.toolboxSupport.create({
    data: {
      userId: session.user.id,
      mlmBusinessId: business.id,
      bucket: bucket as any,
      title,
      fileUrl: relPath,
      format,
    },
  })
  return NextResponse.json({ id: support.id }, { status: 201 })
}
