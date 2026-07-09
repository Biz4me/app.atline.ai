import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 180

const ATLAS_URL = process.env.ATLAS_URL || 'http://127.0.0.1:8100'
const VISION_PROMPT =
  "En 2 phrases maximum, sans titres ni markdown : décris l'accroche visuelle de cette miniature de short viral — le texte affiché à l'écran, le cadrage/plan, le style. Ce qui donne envie de cliquer."

type Trend = { url?: string; cover?: string; visual?: string; transcript?: string }

// Nova « regarde ET écoute » la tendance choisie : VISION sur la miniature + TRANSCRIPT parlé
// (service /transcribe = yt-dlp → ffmpeg → Deepgram). Résultat mis en cache sur la campagne.
async function analyzeCover(cover?: string): Promise<string> {
  if (typeof cover !== 'string' || !/^https:\/\/[\w.-]*tiktokcdn/.test(cover)) return ''
  try {
    const img = await fetch(cover, { signal: AbortSignal.timeout(8000) })
    if (!img.ok) return ''
    const buf = Buffer.from(await img.arrayBuffer())
    if (buf.length > 4_000_000) return ''
    const ct = img.headers.get('content-type') || ''
    const media = ct.startsWith('image/') ? ct : 'image/jpeg'
    const r = await fetch(`${ATLAS_URL}/api/nova/analyze-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_b64: buf.toString('base64'), media_type: media, prompt: VISION_PROMPT }),
      signal: AbortSignal.timeout(45000),
    })
    if (!r.ok) return ''
    return ((await r.json())?.text || '').trim()
  } catch {
    return ''
  }
}

async function transcribe(videoUrl?: string): Promise<string> {
  if (typeof videoUrl !== 'string' || !/^https:\/\/(www\.)?tiktok\.com\//.test(videoUrl)) return ''
  try {
    const r = await fetch(`${ATLAS_URL}/api/nova/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ video_url: videoUrl, language: 'fr' }),
      signal: AbortSignal.timeout(150000),
    })
    if (!r.ok) return ''
    const t = ((await r.json())?.transcript || '').trim()
    return t.length > 1600 ? t.slice(0, 1600) + '…' : t // borne pour garder le prompt lean
  } catch {
    return ''
  }
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  const i = Number(new URL(req.url).searchParams.get('i') || '0')

  const campaign = await db.campaign.findFirst({ where: { id, userId }, select: { radarTrends: true } })
  const trends = Array.isArray(campaign?.radarTrends) ? (campaign.radarTrends as Trend[]) : []
  const trend = trends[i]
  if (!trend) return NextResponse.json({ visual: '', transcript: '' })

  // Cache : déjà analysé (visual OU transcript posé) → renvoi immédiat
  if (trend.visual !== undefined || trend.transcript !== undefined) {
    return NextResponse.json({ visual: trend.visual || '', transcript: trend.transcript || '' })
  }

  // Vision (miniature) + transcript (audio) en parallèle
  const [visual, transcript] = await Promise.all([analyzeCover(trend.cover), transcribe(trend.url)])

  // Persiste sur la campagne (calcul une seule fois)
  trends[i] = { ...trend, visual, transcript }
  await db.campaign.update({ where: { id }, data: { radarTrends: trends as unknown as object } }).catch(() => {})

  return NextResponse.json({ visual, transcript })
}
