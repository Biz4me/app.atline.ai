import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { valider, arreterSequence } from '@/lib/gmail/sequence'

export const dynamic = 'force-dynamic'

/**
 * Le distributeur tranche sur une relance.
 *
 * POST   = « envoie », avec le texte éventuellement corrigé. Le corriger est
 *          le geste qu'on veut encourager : un texte relu vaut mieux qu'un
 *          texte généré.
 * DELETE = « pas celui-là ». Arrête toute la séquence pour ce prospect, pas
 *          seulement l'étape du jour : refuser une relance, c'est décider que
 *          ce contact ne doit plus être relancé par e-mail.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  const texte = await req
    .json()
    .then((b) => (typeof b?.texte === 'string' ? b.texte : undefined))
    .catch(() => undefined)

  const res = await valider(id, session.user.id, texte)
  return NextResponse.json(res, { status: res.ok ? 200 : 400 })
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  const relance = await db.relance.findFirst({ where: { id, userId: session.user.id } })
  if (!relance) return NextResponse.json({ error: 'introuvable' }, { status: 404 })

  const raison = await req
    .json()
    .then((b) => (typeof b?.raison === 'string' ? b.raison : 'refusée par le distributeur'))
    .catch(() => 'refusée par le distributeur')

  if (relance.emailFilId) {
    const annulees = await arreterSequence(relance.emailFilId, raison)
    return NextResponse.json({ ok: true, annulees })
  }

  await db.relance.update({ where: { id }, data: { status: 'CANCELLED', raisonFin: raison.slice(0, 200) } })
  return NextResponse.json({ ok: true, annulees: 1 })
}
