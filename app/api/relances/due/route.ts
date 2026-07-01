import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function authed(req: NextRequest): boolean {
  const token = process.env.RELANCE_API_TOKEN
  if (!token) return false
  const h = req.headers.get('x-relance-token') || (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  return h === token
}

// Relances dues (appelé par n8n, protégé par token). Renvoie de quoi composer le rappel au distributeur.
export async function GET(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const due = await db.relance.findMany({
    where: { status: 'PENDING', dueAt: { lte: new Date() } },
    orderBy: { dueAt: 'asc' },
    take: 50,
  })
  if (due.length === 0) return NextResponse.json([])

  const userIds = [...new Set(due.map((r) => r.userId))]
  const contactIds = [...new Set(due.map((r) => r.contactId))]
  const [users, contacts] = await Promise.all([
    db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, email: true, firstName: true } }),
    db.contact.findMany({ where: { id: { in: contactIds } }, select: { id: true, name: true, phone: true, email: true } }),
  ])
  const uMap = new Map(users.map((u) => [u.id, u]))
  const cMap = new Map(contacts.map((c) => [c.id, c]))

  const out = due.map((r) => {
    const u = uMap.get(r.userId)
    const c = cMap.get(r.contactId)
    const msg = r.message || ''
    const enc = encodeURIComponent(msg)
    const digits = String(c?.phone || '').replace(/\D/g, '')
    const intl = digits ? (digits.charAt(0) === '0' ? '33' + digits.slice(1) : digits) : ''
    return {
      id: r.id,
      dueAt: r.dueAt,
      userEmail: u?.email || '',
      userFirstName: u?.firstName || '',
      contactName: c?.name || '',
      message: msg,
      links: {
        whatsapp: intl ? `https://wa.me/${intl}?text=${enc}` : `https://api.whatsapp.com/send?text=${enc}`,
        sms: `sms:${digits}?&body=${enc}`,
        mail: `mailto:${c?.email || ''}?body=${enc}`,
      },
    }
  })
  return NextResponse.json(out)
}
