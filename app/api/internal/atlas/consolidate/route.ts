import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { reflect, reconcileFacts } from '@/lib/atlas-memory'

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
        db.user.findUnique({ where: { id: userId }, select: { name: true } }),
      ])
      const { profile, facts } = await reflect(
        'user',
        user?.name?.split(' ')[0] ?? '',
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

  return NextResponse.json({ ok: true, users: done })
}
