import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { db } from '@/lib/db'
import { resolveContacts } from '@/lib/contact-snapshot'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Exécution des actions PROPOSÉES par Atlas et CONFIRMÉES par l'utilisateur (tap sur la carte).
// La confirmation est le geste de l'utilisateur → session obligatoire, userId jamais fourni par le client.

// Interprète date+heure en heure de Paris (été/hiver gérés via Intl, sans lib).
function fromParis(dateStr: string, timeStr: string): Date {
  const naive = new Date(`${dateStr}T${timeStr}:00Z`)
  if (isNaN(naive.getTime())) throw new Error('date invalide')
  const asUtc = new Date(naive.toLocaleString('en-US', { timeZone: 'UTC' }))
  const asParis = new Date(naive.toLocaleString('en-US', { timeZone: 'Europe/Paris' }))
  return new Date(naive.getTime() - (asParis.getTime() - asUtc.getTime()))
}

async function findContact(userId: string, name: string) {
  const matches = await resolveContacts(userId, name)
  if (matches.length === 1) return { contact: matches[0] as { id: string; name: string } }
  if (matches.length === 0) return { error: `Contact « ${name} » introuvable dans ton réseau.` }
  return { error: `Plusieurs contacts s'appellent « ${name} » — précise à Atlas duquel il s'agit.` }
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const userId = token?.id as string | undefined
  if (!userId) return NextResponse.json({ error: 'non authentifié' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const kind = typeof body?.kind === 'string' ? body.kind : ''
  const p = (body?.params ?? {}) as Record<string, string>

  try {
    if (kind === 'create_relance') {
      if (!p.contact_name || !p.date) return NextResponse.json({ error: 'contact et date requis' }, { status: 400 })
      const { contact, error } = await findContact(userId, p.contact_name)
      if (!contact) return NextResponse.json({ error }, { status: 404 })
      const dueAt = fromParis(p.date, p.time || '09:00')
      await db.relance.create({
        data: {
          userId,
          contactId: contact.id,
          dueAt,
          channel: ['whatsapp', 'sms', 'email'].includes(p.channel) ? p.channel : 'whatsapp',
          ...(p.message ? { message: p.message } : {}),
        },
      })
      return NextResponse.json({ ok: true, done: `Relance programmée pour ${contact.name}` })
    }

    if (kind === 'schedule_rdv') {
      if (!p.title || !p.date || !p.time) return NextResponse.json({ error: 'titre, date et heure requis' }, { status: 400 })
      let contactId: string | undefined
      if (p.contact_name) {
        const { contact } = await findContact(userId, p.contact_name)
        contactId = contact?.id // introuvable/ambigu → RDV sans lien contact, pas bloquant
      }
      const startAt = fromParis(p.date, p.time)
      await db.appointment.create({
        data: { userId, title: p.title.slice(0, 120), startAt, ...(contactId ? { contactId } : {}) },
      })
      return NextResponse.json({ ok: true, done: `RDV posé : ${p.title}` })
    }

    if (kind === 'log_note') {
      if (!p.contact_name || !p.note) return NextResponse.json({ error: 'contact et note requis' }, { status: 400 })
      const { contact, error } = await findContact(userId, p.contact_name)
      if (!contact) return NextResponse.json({ error }, { status: 404 })
      const cur = await db.contact.findFirst({ where: { id: contact.id, userId }, select: { note: true } })
      const stamp = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' }).format(new Date())
      const line = `— ${stamp} (Atlas) : ${p.note.slice(0, 500)}`
      await db.contact.update({
        where: { id: contact.id },
        data: { note: cur?.note ? `${cur.note}\n${line}` : line },
      })
      return NextResponse.json({ ok: true, done: `Note ajoutée à la fiche de ${contact.name}` })
    }

    return NextResponse.json({ error: 'action inconnue' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: "L'action n'a pas pu être exécutée" }, { status: 500 })
  }
}
