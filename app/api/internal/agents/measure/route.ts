import { NextRequest, NextResponse } from 'next/server'
import { mesurer } from '@/lib/agents/journal'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Le mesureur — appelé par cron, plusieurs fois par jour.
// Il ne fabrique rien : il relit ce que l'app a déjà enregistré (réponses
// entrantes, clics, rendez-vous) et tranche le sort des actions en attente.
// Fréquence conseillée : toutes les 2 h. Idempotent, on peut le relancer.
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret')
  if (!process.env.INTERNAL_API_SECRET || secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  try {
    return NextResponse.json(await mesurer())
  } catch (e) {
    console.error('[measure]', e)
    return NextResponse.json({ error: 'mesure impossible' }, { status: 500 })
  }
}
