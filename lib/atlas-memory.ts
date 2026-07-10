import { db } from '@/lib/db'

// ── Mémoire vivante d'Atlas ─────────────────────────────────────────────────────
// Profil dialectique (UserPreferences.atlasProfile / Contact.atlasMemory) + faits
// atomiques (AtlasFact, vocabulaire fermé). Réflexion par le service (/api/atlas/reflect),
// réconciliation DÉTERMINISTE ici : match exact → confiance +0.05 ; objet différent sur
// catégorie stable → supersession (jamais de DELETE) ; sinon nouveau fait.

const ATLAS_URL = process.env.ATLAS_URL || 'http://127.0.0.1:8100'

// Catégories « stables » : une nouvelle valeur remplace l'ancienne (on ne vise pas
// 2000 € ET 5000 € par mois). Les autres (emotion, situation…) coexistent.
const STABLE_CATEGORIES = new Set(['identite', 'preference', 'objectif', 'contrainte', 'decision'])

export type ExtractedFact = {
  predicate: string
  object: string
  category: string
  importance?: number
  confidence?: number
}

// Bloc « mémoire vivante » injecté dans le chat : profil + faits saillants.
export async function buildUserModel(userId: string): Promise<string> {
  try {
    const [prefs, facts] = await Promise.all([
      db.userPreferences.findUnique({ where: { userId }, select: { atlasProfile: true } }),
      db.atlasFact.findMany({
        where: { userId, contactId: null, status: 'active' },
        orderBy: [{ importance: 'desc' }, { lastSeenAt: 'desc' }],
        take: 12,
        select: { predicate: true, object: true, category: true },
      }),
    ])
    const lines: string[] = []
    if (prefs?.atlasProfile) lines.push(prefs.atlasProfile)
    if (facts.length) {
      lines.push(
        'Faits retenus :\n' + facts.map((f) => `- ${f.predicate.replace(/_/g, ' ')} : ${f.object} (${f.category})`).join('\n'),
      )
    }
    return lines.join('\n\n')
  } catch {
    return ''
  }
}

// Faits saillants d'un contact (complètent le carnet atlasMemory dans le snapshot).
export async function contactFactLines(userId: string, contactId: string): Promise<string> {
  try {
    const facts = await db.atlasFact.findMany({
      where: { userId, contactId, status: 'active' },
      orderBy: [{ importance: 'desc' }, { lastSeenAt: 'desc' }],
      take: 8,
      select: { predicate: true, object: true, category: true },
    })
    if (!facts.length) return ''
    return facts.map((f) => `- ${f.predicate.replace(/_/g, ' ')} : ${f.object} (${f.category})`).join('\n')
  } catch {
    return ''
  }
}

// Réconciliation déterministe (style Memory Kernel, sans arbitre LLM pour l'instant).
export async function reconcileFacts(userId: string, contactId: string | null, facts: ExtractedFact[]) {
  for (const f of facts) {
    const object = (f.object || '').trim()
    if (!object || !f.predicate || !f.category) continue
    try {
      const existing = await db.atlasFact.findFirst({
        where: { userId, contactId, predicate: f.predicate, category: f.category, status: 'active' },
        orderBy: { lastSeenAt: 'desc' },
      })
      if (existing && existing.object.trim().toLowerCase() === object.toLowerCase()) {
        // Ré-observation compatible → renforce la confiance
        await db.atlasFact.update({
          where: { id: existing.id },
          data: {
            confidence: Math.min(existing.confidence + 0.05, 0.99),
            supportCount: { increment: 1 },
            lastSeenAt: new Date(),
            importance: Math.max(existing.importance, f.importance ?? 0),
          },
        })
      } else if (existing && STABLE_CATEGORIES.has(f.category)) {
        // Contradiction sur catégorie stable → supersession traçable (jamais de DELETE)
        const neu = await db.atlasFact.create({
          data: {
            userId, contactId, predicate: f.predicate, object, category: f.category,
            importance: f.importance ?? 0.5, confidence: f.confidence ?? 0.75,
          },
        })
        await db.atlasFact.update({
          where: { id: existing.id },
          data: { status: 'superseded', supersededById: neu.id },
        })
      } else {
        await db.atlasFact.create({
          data: {
            userId, contactId, predicate: f.predicate, object, category: f.category,
            importance: f.importance ?? 0.5, confidence: f.confidence ?? 0.75,
          },
        })
      }
    } catch {
      /* un fait raté ne bloque pas les autres */
    }
  }
}

// Appel du service de réflexion (haiku) : profil réécrit + faits extraits.
export async function reflect(
  kind: 'user' | 'contact',
  name: string,
  profile: string,
  exchange: string,
  deep = false,
): Promise<{ profile: string; facts: ExtractedFact[] }> {
  try {
    const r = await fetch(`${ATLAS_URL}/api/atlas/reflect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, name, profile, exchange, deep }),
      signal: AbortSignal.timeout(45000),
    })
    if (!r.ok) return { profile: '', facts: [] }
    const d = await r.json()
    return { profile: typeof d.profile === 'string' ? d.profile : '', facts: Array.isArray(d.facts) ? d.facts : [] }
  } catch {
    return { profile: '', facts: [] }
  }
}

// Réflexion utilisateur après un échange (fire-and-forget depuis la route chat).
export async function reflectUserMemory(userId: string, query: string, answer: string) {
  try {
    const prefs = await db.userPreferences.findUnique({
      where: { userId },
      select: { atlasProfile: true },
    })
    const user = await db.user.findUnique({ where: { id: userId }, select: { firstName: true } })
    const { profile, facts } = await reflect(
      'user',
      user?.firstName ?? '',
      prefs?.atlasProfile ?? '',
      `Utilisateur: ${query}\nAtlas: ${answer}`,
    )
    if (profile) {
      await db.userPreferences.upsert({
        where: { userId },
        create: { userId, atlasProfile: profile, atlasProfileAt: new Date() },
        update: { atlasProfile: profile, atlasProfileAt: new Date() },
      })
    }
    if (facts.length) await reconcileFacts(userId, null, facts)
  } catch {
    /* mémoire best-effort */
  }
}

// Réflexion contact après un échange sur sa fiche (remplace l'ancien /contact-memory :
// même carnet + en plus des faits atomiques réconciliés).
export async function reflectContactMemory(userId: string, contactId: string, query: string, answer: string) {
  try {
    const cur = await db.contact.findFirst({
      where: { id: contactId, userId },
      select: { name: true, atlasMemory: true },
    })
    if (!cur) return
    const { profile, facts } = await reflect(
      'contact',
      cur.name,
      cur.atlasMemory ?? '',
      `Utilisateur: ${query}\nAtlas: ${answer}`,
    )
    if (profile) {
      await db.contact.update({
        where: { id: contactId },
        data: { atlasMemory: profile, atlasMemoryAt: new Date() },
      })
    }
    if (facts.length) await reconcileFacts(userId, contactId, facts)
  } catch {
    /* mémoire best-effort */
  }
}
