import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// Conversations = les contacts avec qui on a échangé, triés par dernier échange.
// Un « fil » agrège les interactions déjà loggées (SMS, WhatsApp, appel, email, note…).
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await db.interaction.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 400,
    include: { contact: { select: { id: true, name: true, initials: true, accent: true, phone: true, email: true } } },
  })

  // Première occurrence par contact = son dernier échange (rows déjà triées desc)
  const seen = new Set<string>()
  const conversations = []
  for (const r of rows) {
    if (!r.contact || seen.has(r.contact.id)) continue
    seen.add(r.contact.id)
    conversations.push({
      contactId: r.contact.id,
      name: r.contact.name,
      initials: r.contact.initials ?? r.contact.name.slice(0, 2).toUpperCase(),
      accent: r.contact.accent ?? '#F97316',
      phone: r.contact.phone,
      email: r.contact.email,
      lastType: r.type,
      lastBody: r.body,
      lastOutcome: r.outcome,
      lastAt: r.createdAt.toISOString(),
    })
  }
  return NextResponse.json({ conversations })
}
