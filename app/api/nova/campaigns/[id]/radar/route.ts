import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// Déclenche la recherche Radar (n8n → Apify) sur la niche de la campagne (= le produit).
// Appelé en pré-chargement quand l'utilisateur avance dans le wizard ; n8n répond aussitôt
// et rappelle /api/internal/radar une fois les tendances trouvées.
const N8N = process.env.N8N_RADAR_WEBHOOK_URL

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

  const query = (campaign.name || '').trim()
  if (!query || query === 'Nouvelle campagne') return NextResponse.json({ status: 'no-query' })
  if (!N8N) return NextResponse.json({ status: 'disabled' })

  try {
    await fetch(N8N, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, campaignId: id }),
      signal: AbortSignal.timeout(8000),
    })
  } catch {
    /* n8n indisponible : l'écran retombera sur le fallback */
  }
  return NextResponse.json({ status: 'searching' })
}
