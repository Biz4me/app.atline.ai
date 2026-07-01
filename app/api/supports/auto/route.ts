import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { saveUpload } from '@/lib/storage'
import { readAtlas } from '@/lib/atlas'

const BUCKETS = ['PRESENTER', 'FORMER', 'VENDRE']
const MAX_BYTES = 25 * 1024 * 1024

// Upload + classement AUTO par Atlas (Phase B). Atlas choisit le bucket d'après le nom du fichier.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'file required' }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'file too large' }, { status: 413 })

  const business = await db.userMlmBusiness.findFirst({ where: { userId: session.user.id, active: true } })
  if (!business) return NextResponse.json({ error: 'No active business' }, { status: 400 })

  // Classement par Atlas (d'après le nom de fichier)
  let bucket = 'PRESENTER'
  try {
    const ans = await readAtlas(
      `Classe ce document de marketing de réseau dans UNE seule catégorie, d'après son nom de fichier.
Nom du fichier : "${file.name}"
Catégories possibles :
- PRESENTER : plan de rémunération, présentation de l'opportunité, du concept ou de la société.
- FORMER : guides, scripts, méthodes, formations, process internes.
- VENDRE : fiches produits, catalogues, témoignages clients, avant/après, boutique.
Réponds UNIQUEMENT par un mot : PRESENTER, FORMER ou VENDRE.`,
      session.user.id, business.mlmName,
    )
    bucket = BUCKETS.find((b) => ans.toUpperCase().includes(b)) ?? 'PRESENTER'
  } catch { /* fallback PRESENTER */ }

  const title = file.name.replace(/\.[^.]+$/, '').slice(0, 120)
  const { relPath, format } = await saveUpload(session.user.id, file)

  const support = await db.toolboxSupport.create({
    data: { userId: session.user.id, mlmBusinessId: business.id, bucket: bucket as any, title, fileUrl: relPath, format },
  })
  return NextResponse.json({ id: support.id, bucket }, { status: 201 })
}
