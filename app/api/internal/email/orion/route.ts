import { NextRequest, NextResponse } from 'next/server'
import { repondreAuxNouveaux, redigerLesBrouillons } from '@/lib/gmail/repondre'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * Le passage où Orion écrit.
 *
 * Séparé de l'endpoint de notification pour une raison précise : un modèle qui
 * réfléchit dix secondes ferait expirer l'accusé de réception attendu par
 * Google, qui réessaierait, et le prospect recevrait deux réponses. La
 * réception est donc rapide et bête, la rédaction se fait ici.
 *
 * Deux travaux, dans cet ordre : répondre à ceux qui ont écrit (c'est urgent
 * et automatique), puis préparer le texte des relances arrivées à échéance
 * (ça attendra la validation du distributeur).
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret')
  if (!process.env.INTERNAL_API_SECRET || secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const reponses = await repondreAuxNouveaux()
  const brouillons = await redigerLesBrouillons()
  return NextResponse.json({ reponses, brouillons })
}
