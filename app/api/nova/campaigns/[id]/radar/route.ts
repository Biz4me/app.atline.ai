import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 240

// Radar : l'app interroge Apify EN DIRECT (plus de n8n) sur la niche (= le produit), puis filtre :
//  - ≥ 30 000 likes (tendances qui cartonnent vraiment)
//  - RÉCENTES : fenêtre 3 mois ; élargie à 6 mois seulement s'il n'y a rien à 3 mois.
// Garde le top N par vues, avec la miniature (cover) pour la vision.
const APIFY_TOKEN = process.env.APIFY_TOKEN
const ATLAS_URL = process.env.ATLAS_URL || 'http://127.0.0.1:8100'
const MIN_LIKES = 30000
const TOP_N = 4
const DAY = 86_400_000

type ApifyItem = {
  text?: string
  playCount?: number
  diggCount?: number
  webVideoUrl?: string
  authorMeta?: { name?: string }
  videoMeta?: { coverUrl?: string }
  createTimeISO?: string
  createTime?: number
  isSlideshow?: boolean
}

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await ctx.params
  const campaign = await db.campaign.findFirst({
    where: { id, userId },
    select: { id: true, name: true, radarTrends: true },
  })
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (campaign.radarTrends) return NextResponse.json({ status: 'ready' })

  const product = (campaign.name || '').trim()
  if (!product || product === 'Nouvelle campagne') return NextResponse.json({ status: 'no-query' })
  if (!APIFY_TOKEN) return NextResponse.json({ status: 'disabled' })

  // Le Radar cherche sur la THÉMATIQUE LARGE du produit (ex. « perte de poids »), pas le nom exact
  // du produit ni la cible. On dérive la niche via le service ; fallback = le produit tel quel.
  let query = product
  try {
    const tr = await fetch(`${ATLAS_URL}/api/nova/theme`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product }),
      signal: AbortSignal.timeout(12000),
    })
    if (tr.ok) {
      const t = ((await tr.json())?.theme || '').trim()
      if (t) query = t
    }
  } catch {}

  let items: ApifyItem[] = []
  try {
    const r = await fetch(
      `https://api.apify.com/v2/acts/clockworks~free-tiktok-scraper/run-sync-get-dataset-items?token=${APIFY_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchQueries: [query],
          resultsPerPage: 40,
          shouldDownloadVideos: false,
          shouldDownloadCovers: false,
          shouldDownloadSubtitles: false,
        }),
        signal: AbortSignal.timeout(180000),
      },
    )
    if (r.ok) items = await r.json()
  } catch {
    return NextResponse.json({ status: 'error' }, { status: 502 })
  }

  const now = Date.now()
  const ageMs = (p: ApifyItem) => {
    const t = p.createTimeISO ? Date.parse(p.createTimeISO) : p.createTime ? p.createTime * 1000 : NaN
    return Number.isFinite(t) ? now - t : Infinity
  }
  // ≥ 30k likes, vraie vidéo (pas slideshow). Récent : 3 mois, sinon 6 mois.
  const liked = items.filter((p) => !p.isSlideshow && (p.diggCount || 0) >= MIN_LIKES)
  const within = (days: number) => liked.filter((p) => ageMs(p) <= days * DAY)
  let pool = within(90)
  if (pool.length === 0) pool = within(180)

  const trends = pool
    .sort((a, b) => (b.playCount || 0) - (a.playCount || 0))
    .slice(0, TOP_N)
    .map((p) => ({
      platform: 'TikTok',
      hook: (p.text || '').slice(0, 140),
      views: p.playCount || 0,
      likes: p.diggCount || 0,
      url: p.webVideoUrl || '',
      author: p.authorMeta?.name || '',
      cover: p.videoMeta?.coverUrl || '',
    }))

  await db.campaign.update({ where: { id }, data: { radarTrends: trends } }).catch(() => {})
  return NextResponse.json({ status: 'ready', count: trends.length })
}
