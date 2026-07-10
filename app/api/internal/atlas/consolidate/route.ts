import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { reflect, reconcileFacts } from '@/lib/atlas-memory'

const ATLAS_URL = process.env.ATLAS_URL || 'http://127.0.0.1:8100'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Passe NOCTURNE de consolidation mémoire (style AutoDream) — appelée par cron (3h).
// Pour chaque utilisateur actif dans les dernières 26 h : une seule réflexion PROFONDE
// sur l'ensemble des échanges du jour → profil vivant re-synthétisé + faits consolidés.
// Protégé par le secret interne (pas de session).
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret')
  if (!process.env.INTERNAL_API_SECRET || secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const since = new Date(Date.now() - 26 * 3600 * 1000)
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

  let done = 0
  for (const [userId, convIds] of [...byUser.entries()].slice(0, 50)) {
    try {
      const msgs = await db.atlasMessage.findMany({
        where: { conversationId: { in: convIds }, createdAt: { gte: since } },
        orderBy: { createdAt: 'asc' },
        take: 80,
        select: { role: true, content: true },
      })
      if (msgs.length < 2) continue
      const exchange = msgs
        .map((m) => `${m.role === 'USER' ? 'Utilisateur' : 'Atlas'}: ${m.content.slice(0, 500)}`)
        .join('\n')
      const [prefs, user] = await Promise.all([
        db.userPreferences.findUnique({ where: { userId }, select: { atlasProfile: true } }),
        db.user.findUnique({ where: { id: userId }, select: { firstName: true } }),
      ])
      const { profile, facts } = await reflect(
        'user',
        user?.firstName ?? '',
        prefs?.atlasProfile ?? '',
        exchange,
        true, // deep
      )
      if (profile) {
        await db.userPreferences.upsert({
          where: { userId },
          create: { userId, atlasProfile: profile, atlasProfileAt: new Date() },
          update: { atlasProfile: profile, atlasProfileAt: new Date() },
        })
      }
      if (facts.length) await reconcileFacts(userId, null, facts)
      done++
    } catch {
      /* un user raté ne bloque pas les autres */
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

  return NextResponse.json({ ok: true, users: done, judged })
}
