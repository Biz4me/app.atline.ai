import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// Décision rule-based du prochain pas : instantané, déterministe (le message, lui, est rédigé par Atlas via /draft)
export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  const c = await db.contact.findFirst({ where: { id, userId: session.user.id } })
  if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const prenom = c.firstName || c.name.split(' ')[0]
  const days = c.lastContact ? Math.floor((Date.now() - new Date(c.lastContact).getTime()) / 86_400_000) : null
  const stale = days !== null && days >= 5
  const cold = days !== null ? `froid depuis ${days}j` : null
  const channel: string | null = c.phone ? 'WHATSAPP' : c.email ? 'EMAIL' : null

  let action = 'MESSAGE'
  let headline = ''
  let reason = ''

  if (!c.phone && !c.email) {
    action = 'EDIT'; headline = 'Complète sa fiche'
    reason = `Ajoute un numéro ou un email pour pouvoir contacter ${prenom}.`
  } else if (c.kind === 'CLIENT') {
    headline = `Prends des nouvelles de ${prenom}`
    reason = stale ? `Client sans contact depuis ${days}j — relance et propose l'opportunité.` : `Fidélise : réassort, ou propose-lui l'opportunité (upsell partenaire).`
  } else if (c.kind === 'PARTENAIRE') {
    headline = `Accompagne ${prenom}`
    reason = `Soutiens son démarrage et reste présent (Go Pro · Skill 6).`
  } else {
    // PROSPECT
    switch (c.prospectStage) {
      case 'INVITATION':
        headline = stale ? `Relance ton invitation` : `Propose une présentation`
        reason = stale ? `Invité il y a ${days}j sans suite — relance en douceur.` : `${prenom} a réagi — propose-lui d'en voir plus.`
        break
      case 'PRESENTATION':
        headline = `Fais le suivi`
        reason = `« La fortune est dans le suivi » (Worre) — reviens vers ${prenom}.`
        break
      case 'SUIVI':
        if (c.exposures >= 4) { headline = `Tente le closing`; reason = `${c.exposures} expositions${stale ? `, ${cold}` : ''} — c'est le moment de proposer de décider.` }
        else { headline = `Continue le suivi`; reason = `${c.exposures} exposition${c.exposures > 1 ? 's' : ''} — encore un contact ou deux avant de closer.` }
        break
      case 'CLOSING':
        headline = `Closer ${prenom}`
        reason = `Il est en phase de décision — propose-lui de démarrer maintenant.`
        break
      default: // NOUVEAU
        headline = `Invite ${prenom}`
        reason = `Nouveau dans ta liste — lance la conversation et crée la curiosité.`
    }
  }

  return NextResponse.json({ action, headline, reason, channel })
}
