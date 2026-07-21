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

// Forme canonique d'un libellé : minuscules, espaces (jamais d'underscores/mots collés),
// ponctuation légère retirée — le match exact attrape ainsi la plupart des reformulations.
export function normalizeObject(raw: string): string {
  return raw
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[«»"']/g, '')
    .trim()
    .toLowerCase()
    .slice(0, 120)
}

// Arbitre LLM (pattern jarvis) : appelé UNIQUEMENT sur l'ambigu — même (predicate, category),
// objet différent. « same » = même concept reformulé. En échec/doute → different (prudence).
async function arbitrate(predicate: string, category: string, existingObject: string, newObject: string): Promise<'same' | 'different'> {
  try {
    const r = await fetch(`${ATLAS_URL}/api/atlas/arbitrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ predicate, category, existing_object: existingObject, new_object: newObject }),
      signal: AbortSignal.timeout(8000),
    })
    if (!r.ok) return 'different'
    const d = await r.json()
    return d?.verdict === 'same' ? 'same' : 'different'
  } catch {
    return 'different'
  }
}

// Réconciliation : déterministe d'abord (match exact normalisé), arbitre LLM sur l'ambigu.
export async function reconcileFacts(userId: string, contactId: string | null, facts: ExtractedFact[], source: 'atlas' | 'aria' | 'nova' = 'atlas') {
  for (const f of facts) {
    const object = normalizeObject(f.object || '')
    if (!object || !f.predicate || !f.category) continue
    try {
      const existing = await db.atlasFact.findFirst({
        where: { userId, contactId, predicate: f.predicate, category: f.category, status: 'active' },
        orderBy: { lastSeenAt: 'desc' },
      })

      const confirm = async (id: string, cur: { confidence: number; importance: number }) =>
        db.atlasFact.update({
          where: { id },
          data: {
            confidence: Math.min(cur.confidence + 0.05, 0.99),
            supportCount: { increment: 1 },
            lastSeenAt: new Date(),
            importance: Math.max(cur.importance, f.importance ?? 0),
          },
        })
      const create = () =>
        db.atlasFact.create({
          data: {
            userId, contactId, predicate: f.predicate, object, category: f.category, source,
            importance: f.importance ?? 0.5, confidence: f.confidence ?? 0.75,
          },
        })

      if (!existing) {
        await create()
        continue
      }
      if (normalizeObject(existing.object) === object) {
        // Ré-observation identique → renforce la confiance
        await confirm(existing.id, existing)
        continue
      }
      // Ambigu : même (predicate, category), objet différent → l'arbitre tranche
      const verdict = await arbitrate(f.predicate, f.category, existing.object, object)
      if (verdict === 'same') {
        // Même concept reformulé → confirmation (et on garde le libellé le plus court = plus canonique)
        await confirm(existing.id, existing)
        if (object.length < existing.object.length) {
          await db.atlasFact.update({ where: { id: existing.id }, data: { object } })
        }
      } else if (STABLE_CATEGORIES.has(f.category)) {
        // Vraie contradiction sur catégorie stable → supersession traçable (jamais de DELETE)
        const neu = await create()
        await db.atlasFact.update({
          where: { id: existing.id },
          data: { status: 'superseded', supersededById: neu.id },
        })
      } else {
        await create()
      }
    } catch {
      /* un fait raté ne bloque pas les autres */
    }
  }
}

// Appel du service de réflexion (haiku) : profil réécrit + faits extraits.
// `reference` = données DÉJÀ déclarées (profil/contact structuré) → la réflexion reste
// cohérente avec elles et ne les redécouvre pas comme des faits. Utilisé par la passe
// nocturne (deep) ; vide sur le chemin live.
export async function reflect(
  kind: 'user' | 'contact',
  name: string,
  profile: string,
  exchange: string,
  deep = false,
  reference = '',
): Promise<{ profile: string; facts: ExtractedFact[] }> {
  try {
    const r = await fetch(`${ATLAS_URL}/api/atlas/reflect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, name, profile, exchange, deep, reference }),
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
// `source` = quel agent a mené l'échange (mémoire partagée, plumes multiples).
export async function reflectUserMemory(userId: string, query: string, answer: string, source: 'atlas' | 'aria' | 'nova' = 'atlas') {
  try {
    const prefs = await db.userPreferences.findUnique({
      where: { userId },
      select: { atlasProfile: true },
    })
    const user = await db.user.findUnique({ where: { id: userId }, select: { firstName: true } })
    const agentName = source === 'nova' ? 'Nova' : source === 'aria' ? 'Aria' : 'Atlas'
    const { profile, facts } = await reflect(
      'user',
      user?.firstName ?? '',
      prefs?.atlasProfile ?? '',
      `Utilisateur: ${query}\n${agentName}: ${answer}`,
    )
    if (profile) {
      await db.userPreferences.upsert({
        where: { userId },
        create: { userId, atlasProfile: profile, atlasProfileAt: new Date() },
        update: { atlasProfile: profile, atlasProfileAt: new Date() },
      })
    }
    if (facts.length) await reconcileFacts(userId, null, facts, source)
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

// Suggestions d'écriture de champs STRUCTURÉS (profil/activité) que l'utilisateur a dits
// explicitement dans la journée et qui diffèrent du profil actuel. RIEN n'est écrit ici :
// la passe de nuit les persiste en cartes [[ACTION]] à confirmer au réveil (jamais auto).
export type ProfileProposal = { cible: 'profile' | 'activite'; champ: string; valeur: string }

export async function proposeProfileUpdates(reference: string, exchange: string): Promise<ProfileProposal[]> {
  if (!exchange.trim()) return []
  try {
    const r = await fetch(`${ATLAS_URL}/api/atlas/propose-updates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference, exchange }),
      signal: AbortSignal.timeout(30000),
    })
    if (!r.ok) return []
    const d = await r.json()
    return Array.isArray(d.proposals) ? (d.proposals as ProfileProposal[]) : []
  } catch {
    return []
  }
}
