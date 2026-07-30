import { NextRequest, NextResponse } from 'next/server'
import { viderLaFile } from '@/lib/gmail/sequence'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Le passage périodique sur la file d'attente.
 *
 * Une relance validée n'est pas forcément partie : le plafond du jour ou
 * l'espacement minimal entre deux envois d'un même compte ont pu la faire
 * patienter. Ce passage la reprend, sans que le distributeur ait à revalider
 * quoi que ce soit — il a déjà dit oui une fois.
 *
 * Une seule relance par distributeur et par passage, l'espacement rendant les
 * suivantes de toute façon impossibles. Un appel toutes les cinq minutes suffit
 * donc largement à écouler une journée de relances.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret')
  if (!process.env.INTERNAL_API_SECRET || secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  return NextResponse.json(await viderLaFile())
}
