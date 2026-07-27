import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { resolveProspectRef } from '@/lib/prospect-ref'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Endpoint INTERNE (bot Telegram, pivot T4) : le HANDOFF. Quand le prospect demande
// un RDV (ou veut s'inscrire), le bot appelle ici → contact chaud créé dans le CRM
// du distributeur avec l'extrait de conversation + notification.
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret')
  if (!process.env.INTERNAL_API_SECRET || secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const body = await req.json().catch(() => null)
  const ref = typeof body?.ref === 'string' ? body.ref : ''
  const reason = body?.reason === 'inscription' ? 'inscription' : 'rdv'
  const prospectName = (typeof body?.prospectName === 'string' && body.prospectName.trim()) || 'Prospect Telegram'
  const telegram = typeof body?.telegram === 'string' ? body.telegram.trim() : ''
  const transcript = Array.isArray(body?.transcript) ? body.transcript : []

  const resolved = await resolveProspectRef(ref)
  if (!resolved) return NextResponse.json({ error: 'inconnu' }, { status: 404 })

  // Extrait de conversation (dernier échange, borné) → note de la fiche
  const lines = transcript
    .filter((m: { role?: string; content?: string }) => m?.content && (m.role === 'user' || m.role === 'assistant'))
    .slice(-10)
    .map((m: { role: string; content: string }) => `${m.role === 'user' ? 'Prospect' : 'Assistant'} : ${m.content}`)
  const note = [
    `Arrivé via Telegram${telegram ? ` (@${telegram})` : ''} — conversation avec l'assistant.`,
    reason === 'rdv' ? 'A demandé un rendez-vous.' : "Prêt à s'inscrire.",
    lines.length ? `\nExtrait :\n${lines.join('\n')}` : '',
  ].join(' ').slice(0, 2000)

  const contact = await db.contact.create({
    data: {
      userId: resolved.userId,
      mlmBusinessId: resolved.businessId,
      kind: 'PROSPECT',
      name: prospectName,
      firstName: prospectName,
      initials: prospectName.slice(0, 2).toUpperCase(),
      source: 'BOT_TELEGRAM',
      prospectStage: 'NOUVEAU',
      note,
    },
  })

  await db.notification.create({
    data: {
      userId: resolved.userId,
      icon: 'atlas',
      color: '#F97316',
      text:
        reason === 'rdv'
          ? `🔥 ${prospectName} (Telegram) veut un rendez-vous — l'extrait de conversation est dans sa fiche.`
          : `✨ ${prospectName} (Telegram) est prêt à s'inscrire — regarde sa fiche.`,
      go: `/contacts/${contact.id}`,
    },
  })

  return NextResponse.json({ ok: true, contactId: contact.id })
}
