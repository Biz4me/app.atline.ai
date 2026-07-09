import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ATLAS_URL = process.env.ATLAS_URL || 'http://127.0.0.1:8100'
const VISION_PROMPT =
  "En 2 phrases maximum, sans titres ni markdown : décris l'accroche visuelle de cette miniature de short viral — le texte affiché à l'écran, le cadrage/plan, le style. Ce qui donne envie de cliquer."

// Analyse VISION de la miniature d'une tendance du Radar (la tendance choisie).
// La miniature TikTok protège le hotlink → on la télécharge côté serveur puis on l'envoie
// en base64 au service Nova (endpoint /analyze-image). Renvoie une courte analyse texte.
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  const i = Number(new URL(req.url).searchParams.get('i') || '0')

  const campaign = await db.campaign.findFirst({ where: { id, userId }, select: { radarTrends: true } })
  const trends = Array.isArray(campaign?.radarTrends) ? (campaign.radarTrends as Array<{ cover?: string }>) : []
  const cover = trends[i]?.cover
  // URL de confiance (déposée par notre propre Radar), mais on borne quand même au CDN TikTok.
  if (typeof cover !== 'string' || !/^https:\/\/[\w.-]*tiktokcdn/.test(cover)) {
    return NextResponse.json({ analysis: '' })
  }

  try {
    const img = await fetch(cover, { signal: AbortSignal.timeout(8000) })
    if (!img.ok) return NextResponse.json({ analysis: '' })
    const buf = Buffer.from(await img.arrayBuffer())
    if (buf.length > 4_000_000) return NextResponse.json({ analysis: '' })
    const ct = img.headers.get('content-type') || ''
    const media = ct.startsWith('image/') ? ct : 'image/jpeg'

    const r = await fetch(`${ATLAS_URL}/api/nova/analyze-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_b64: buf.toString('base64'), media_type: media, prompt: VISION_PROMPT }),
      signal: AbortSignal.timeout(45000),
    })
    if (!r.ok) return NextResponse.json({ analysis: '' })
    const d = await r.json()
    return NextResponse.json({ analysis: (d.text || '').trim() })
  } catch {
    return NextResponse.json({ analysis: '' })
  }
}
