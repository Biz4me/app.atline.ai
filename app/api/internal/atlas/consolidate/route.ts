import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { reflect, reconcileFacts } from '@/lib/atlas-memory'
import { buildProfileReference } from '@/lib/atlas-snapshot'
import { buildContactSnapshot } from '@/lib/contact-snapshot'

const ATLAS_URL = process.env.ATLAS_URL || 'http://127.0.0.1:8100'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Bornes explicites (jamais de troncature silencieuse — on renvoie le nombre d'ignorés).
const USER_CAP = 80        // utilisateurs consolidés par nuit
const CONTACT_CAP = 250    // contacts consolidés par nuit (toutes personnes confondues)

// Passe NOCTURNE de consolidation mémoire (style AutoDream) — appelée par cron (3h15).
// 1) Pour chaque utilisateur actif (26 h) : une réflexion PROFONDE sur ses échanges du
//    jour, ANCRÉE sur son profil déclaré (référentiel) → profil vivant re-synthétisé +
//    faits consolidés.
// 2) Pour chaque CONTACT ayant eu des échanges le jour : même traitement profond, ancré
//    sur sa fiche → carnet `atlasMemory` re-synthétisé + faits contact consolidés.
// Protégé par le secret interne (pas de session).
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret')
  if (!process.env.INTERNAL_API_SECRET || secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const since = new Date(Date.now() - 26 * 3600 * 1000)

  // ── 1) UTILISATEURS ────────────────────────────────────────────────────────────
  const convs = await db.atlasConversation.findMany({
    where: { messages: { some: { createdAt: { gte: since } } } },
    select: { id: true, userId: true },
  })
  const byUser = new Map<string, string[]>()
  for (const c of convs) {
    const list = byUser.get(c.userId) ?? []
    list.push(c.id)
    byUser.set(c.userId, list)
  }
  // Les utilisateurs qui n'ont QUE des entraînements Aria aujourd'hui comptent aussi
  const simUsers = await db.simSession.findMany({
    where: { score: { not: null }, startedAt: { gte: since } },
    select: { userId: true },
    distinct: ['userId'],
  })
  for (const s of simUsers) if (!byUser.has(s.userId)) byUser.set(s.userId, [])

  const userEntries = [...byUser.entries()]
  const usersSkipped = Math.max(0, userEntries.length - USER_CAP)
  let doneUsers = 0
  for (const [userId, convIds] of userEntries.slice(0, USER_CAP)) {
    try {
      const [msgs, simsDuJour] = await Promise.all([
        db.atlasMessage.findMany({
          where: { conversationId: { in: convIds }, createdAt: { gte: since } },
          orderBy: { createdAt: 'asc' },
          take: 80,
          select: { role: true, content: true },
        }),
        db.simSession.findMany({
          where: { userId, score: { not: null }, startedAt: { gte: since } },
          orderBy: { startedAt: 'asc' },
          select: { characterId: true, score: true, feedback: true },
        }),
      ])
      if (msgs.length < 2 && !simsDuJour.length) continue
      let exchange = msgs
        .map((m) => `${m.role === 'USER' ? 'Utilisateur' : 'Atlas'}: ${m.content.slice(0, 500)}`)
        .join('\n')
      // Les entraînements Aria du jour font partie de la journée du distributeur
      if (simsDuJour.length) {
        const lines = simsDuJour.map((s) => {
          let resume = ''
          try { resume = (JSON.parse(s.feedback ?? '{}') as { resume?: string }).resume ?? '' } catch { /* ignore */ }
          return `Entraînement Aria (${s.characterId.replace(/_/g, ' ')}) : score ${s.score}/100${resume ? ` — ${resume}` : ''}`
        })
        exchange += `${exchange ? '\n\n' : ''}ENTRAÎNEMENTS DU JOUR :\n${lines.join('\n')}`
      }
      const [prefs, user, reference] = await Promise.all([
        db.userPreferences.findUnique({ where: { userId }, select: { atlasProfile: true } }),
        db.user.findUnique({ where: { id: userId }, select: { firstName: true } }),
        buildProfileReference(userId),
      ])
      const { profile, facts } = await reflect(
        'user',
        user?.firstName ?? '',
        prefs?.atlasProfile ?? '',
        exchange,
        true,       // deep
        reference,  // ancrage sur le profil déclaré
      )
      if (profile) {
        await db.userPreferences.upsert({
          where: { userId },
          create: { userId, atlasProfile: profile, atlasProfileAt: new Date() },
          update: { atlasProfile: profile, atlasProfileAt: new Date() },
        })
      }
      if (facts.length) await reconcileFacts(userId, null, facts)
      doneUsers++
    } catch {
      /* un user raté ne bloque pas les autres */
    }
  }

  // ── 2) CONTACTS ──────────────────────────────────────────────────────────────
  // Les échanges tenus SUR une fiche (AtlasConversation.contactId) doivent nourrir la
  // mémoire du CONTACT, pas seulement le profil du distributeur.
  const contactConvs = await db.atlasConversation.findMany({
    where: { contactId: { not: null }, messages: { some: { createdAt: { gte: since } } } },
    select: { id: true, userId: true, contactId: true },
  })
  const byContact = new Map<string, { userId: string; convIds: string[] }>()
  for (const c of contactConvs) {
    if (!c.contactId) continue
    const cur = byContact.get(c.contactId) ?? { userId: c.userId, convIds: [] }
    cur.convIds.push(c.id)
    byContact.set(c.contactId, cur)
  }
  const contactEntries = [...byContact.entries()]
  const contactsSkipped = Math.max(0, contactEntries.length - CONTACT_CAP)
  let doneContacts = 0
  for (const [contactId, { userId, convIds }] of contactEntries.slice(0, CONTACT_CAP)) {
    try {
      const msgs = await db.atlasMessage.findMany({
        where: { conversationId: { in: convIds }, createdAt: { gte: since } },
        orderBy: { createdAt: 'asc' },
        take: 60,
        select: { role: true, content: true },
      })
      if (msgs.length < 2) continue
      const contact = await db.contact.findFirst({
        where: { id: contactId, userId },
        select: { name: true, atlasMemory: true },
      })
      if (!contact) continue
      const exchange = msgs
        .map((m) => `${m.role === 'USER' ? 'Utilisateur' : 'Atlas'}: ${m.content.slice(0, 500)}`)
        .join('\n')
      const reference = await buildContactSnapshot(userId, contactId)
      const { profile, facts } = await reflect(
        'contact',
        contact.name,
        contact.atlasMemory ?? '',
        exchange,
        true,       // deep
        reference,  // ancrage sur la fiche du contact
      )
      if (profile) {
        await db.contact.update({
          where: { id: contactId },
          data: { atlasMemory: profile, atlasMemoryAt: new Date() },
        })
      }
      if (facts.length) await reconcileFacts(userId, contactId, facts)
      doneContacts++
    } catch {
      /* un contact raté ne bloque pas les autres */
    }
  }

  // Éval qualité : échantillon d'échanges du jour → juge léger (résultats dans Langfuse).
  let judged = 0
  try {
    const answers = await db.atlasMessage.findMany({
      where: { createdAt: { gte: since }, role: 'ASSISTANT' },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { content: true, conversationId: true, createdAt: true },
    })
    const exchanges: { query: string; answer: string }[] = []
    for (const a of answers) {
      const q = await db.atlasMessage.findFirst({
        where: { conversationId: a.conversationId, role: 'USER', createdAt: { lt: a.createdAt } },
        orderBy: { createdAt: 'desc' },
        select: { content: true },
      })
      if (q) exchanges.push({ query: q.content, answer: a.content })
    }
    if (exchanges.length) {
      const jr = await fetch(`${ATLAS_URL}/api/atlas/judge-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exchanges }),
        signal: AbortSignal.timeout(60000),
      })
      if (jr.ok) judged = (await jr.json())?.judged ?? 0
    }
  } catch {
    /* éval best-effort */
  }

  return NextResponse.json({
    ok: true,
    users: doneUsers,
    usersSkipped,
    contacts: doneContacts,
    contactsSkipped,
    judged,
  })
}
