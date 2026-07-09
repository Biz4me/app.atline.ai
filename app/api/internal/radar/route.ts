import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Callback serveur-à-serveur : le workflow n8n dépose les tendances trouvées sur la campagne.
// Protégé par un secret dédié (header X-Radar-Secret).
const SECRET = process.env.RADAR_SECRET

export async function POST(req: Request) {
  if (!SECRET || req.headers.get('x-radar-secret') !== SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await req.json().catch(() => ({}))
  const campaignId = typeof body?.campaignId === 'string' ? body.campaignId : ''
  const trends = Array.isArray(body?.trends) ? body.trends : null
  if (!campaignId || !trends) return NextResponse.json({ error: 'bad payload' }, { status: 400 })

  await db.campaign.update({ where: { id: campaignId }, data: { radarTrends: trends } }).catch(() => {})
  return NextResponse.json({ ok: true })
}
