import { NextRequest, NextResponse } from 'next/server'
import { renouvelerLesSurveillances } from '@/lib/gmail/surveiller'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Le renouvellement quotidien des surveillances.
 *
 * Google coupe au bout de sept jours. C'est la panne la plus vicieuse du
 * canal : rien ne casse, aucune erreur n'apparaît, le distributeur cesse
 * simplement de recevoir les réponses de ses prospects et en conclut que
 * personne ne lui répond.
 *
 * On renouvelle donc chaque jour, avec deux jours de marge, pour qu'une panne
 * de cron d'une journée reste sans conséquence.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret')
  if (!process.env.INTERNAL_API_SECRET || secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  return NextResponse.json(await renouvelerLesSurveillances())
}
