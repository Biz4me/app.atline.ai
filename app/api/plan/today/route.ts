import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ── Moteur de priorité : cascade (5 niveaux) + score + équilibre ──
// Niveaux : 1 Temporel · 2 Momentum · 3 Valeur · 4 Discipline · 5 Investissement

type Cand = {
  contactId: string
  name: string
  prenom: string
  initials: string
  accent: string
  level: number
  priority: number
  action: string
  headline: string
  reason: string
  channel: string | null
  stage: string
  phone: string | null
  email: string | null
  market: string | null
  route: string | null // socle : surface à ouvrir (fondation) ; null pour une action par contact
}

// score_opportunité (aligné sur computeScore de /api/contacts/[id])
function opportunity(c: { kind: string; prospectStage: string | null; partnerStage: string | null; market: string | null; lastContact: Date | null }): number {
  let base = 15
  if (c.kind === 'PARTENAIRE') base = ({ DEMARRAGE: 55, FORMATION: 70, ACTIF: 85, LEADER: 95 } as Record<string, number>)[c.partnerStage ?? ''] ?? 55
  else if (c.kind === 'CLIENT') base = 55
  else base = ({ NOUVEAU: 15, INVITATION: 30, PRESENTATION: 50, SUIVI: 65, CLOSING: 80 } as Record<string, number>)[c.prospectStage ?? ''] ?? 15
  let fresh = 0
  if (c.lastContact) {
    const days = (Date.now() - new Date(c.lastContact).getTime()) / 86_400_000
    fresh = days < 7 ? 0 : days < 14 ? -5 : days < 30 ? -15 : -25
  }
  const temp = c.market === 'CHAUD' ? 5 : c.market === 'FROID' ? -5 : 0
  return Math.max(0, Math.min(100, Math.round(base + fresh + temp)))
}

// potentiel_partenaire : nb de signaux renseignés (motivation/insatisfaction/réseau/ouverture)
function potentielMult(q: unknown): number {
  const obj = (q && typeof q === 'object' && !Array.isArray(q)) ? (q as Record<string, unknown>) : {}
  const n = ['motivation', 'insatisfaction', 'reseau', 'ouverture'].filter((k) => typeof obj[k] === 'string' && (obj[k] as string).trim()).length
  return n >= 3 ? 1.5 : n === 2 ? 1.2 : 1.0
}

async function activeBusinessId(userId: string): Promise<string | null> {
  const prefs = await db.userPreferences.findUnique({ where: { userId }, select: { activeCompanyId: true } })
  if (prefs?.activeCompanyId) {
    const b = await db.userMlmBusiness.findFirst({ where: { id: prefs.activeCompanyId, userId }, select: { id: true } })
    if (b) return b.id
  }
  const first = await db.userMlmBusiness.findFirst({ where: { userId }, orderBy: { position: 'asc' }, select: { id: true } })
  return first?.id ?? null
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  const bizId = await activeBusinessId(userId)
  if (!bizId) return NextResponse.json({ items: [] })

  const now = Date.now()
  const [contacts, appts, relances] = await Promise.all([
    db.contact.findMany({
      where: { userId, mlmBusinessId: bizId },
      select: {
        id: true, name: true, firstName: true, initials: true, accent: true, kind: true,
        prospectStage: true, partnerStage: true, market: true, exposures: true,
        lastContact: true, birthDate: true, phone: true, email: true, qualification: true,
      },
    }),
    db.appointment.findMany({ where: { userId, done: false }, select: { id: true, contactId: true, title: true, startAt: true } }),
    db.relance.findMany({ where: { userId, status: 'PENDING', dueAt: { lte: new Date() } }, select: { id: true, contactId: true, channel: true } }).catch(() => []),
  ])

  const byId = new Map(contacts.map((c) => [c.id, c]))
  const prenom = (c: { firstName: string | null; name: string }) => c.firstName || c.name.split(' ')[0]
  const initialsOf = (c: { initials: string | null; name: string }) => c.initials ?? c.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  const cands: Cand[] = []
  const seen = new Set<string>() // 1 candidat max par contact (le 1er = le plus prioritaire)

  const push = (c: typeof contacts[number], level: number, action: string, headline: string, reason: string, channel: string | null) => {
    cands.push({
      contactId: c.id, name: c.name, prenom: prenom(c), initials: initialsOf(c), accent: c.accent ?? '#F97316',
      level, priority: Math.round(opportunity(c) * potentielMult(c.qualification)),
      action, headline, reason, channel, stage: c.prospectStage ?? c.partnerStage ?? '',
      phone: c.phone, email: c.email, market: c.market, route: null,
    })
  }

  // ── Niveau 1.5 — GATE de phase : la Fondation (Bande A) prime tant qu'elle n'est pas posée ──
  // Séquence : Rencontre (mon histoire avec l'activité) → M1 Mindset → M2 Pourquoi → M4 Liste.
  // On ne pousse au tunnel (niv. 2+) qu'une fois ces prérequis posés. Les incontournables temporels (niv. 1) passent toujours avant.
  const [user, business, mindsetModule] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { coaching: true } }),
    db.userMlmBusiness.findUnique({ where: { id: bizId }, select: { story: true } }),
    db.lmsModule.findFirst({ where: { position: 0 }, select: { id: true } }).catch(() => null),
  ])
  let mindsetDone = false
  if (mindsetModule) {
    const p = await db.userLmsProgress.findFirst({ where: { userId, moduleId: mindsetModule.id }, select: { status: true } }).catch(() => null)
    mindsetDone = p?.status === 'DONE'
  }
  const coaching = (user?.coaching && typeof user.coaching === 'object' && !Array.isArray(user.coaching)) ? (user.coaching as Record<string, unknown>) : {}
  const hasStory = typeof business?.story === 'string' && business.story.trim().length > 0
  const hasWhy = typeof coaching.why === 'string' && (coaching.why as string).trim().length > 0
  const listCount = contacts.length

  const foundItem = (action: string, rank: number, headline: string, reason: string, route: string | null): Cand => ({
    contactId: '', name: '', prenom: '', initials: '', accent: '#F97316',
    level: 1.5, priority: 100 + rank, action, headline, reason, channel: null, stage: 'SOCLE',
    phone: null, email: null, market: null, route,
  })
  // Le bon départ (dans l'ordre) : brise-glace (rencontre) → posture (mindset) → profondeur (pourquoi) → matière (liste).
  if (!hasStory)               cands.push(foundItem('FOUND_RENCONTRE', 4, 'Raconte-moi ta rencontre avec ton activité', 'Ton histoire avec ce business : comment tu l’as découvert et pourquoi tu y crois. C’est mon point de départ pour te coacher juste.', null))
  // Mindset : seulement au tout début (pas encore de pourquoi) pour ne pas harceler un utilisateur lancé.
  if (!hasWhy && !mindsetDone) cands.push(foundItem('FOUND_MINDSET', 3, 'Pose ton état d’esprit de pro', 'Module 1 — la base : comprendre le métier avant de te lancer. 15 min qui changent tout.', mindsetModule ? `/formation/${mindsetModule.id}` : '/formation'))
  if (!hasWhy)                cands.push(foundItem('FOUND_WHY', 2, 'Formule ton pourquoi', 'Module 2 — ton moteur. Sans un pourquoi clair, tout s’essouffle. On le travaille ensemble.', null))
  if (listCount < 10)         cands.push(foundItem('FOUND_LIST', 1, 'Construis ta liste de noms', `Module 4 — la matière première de ton activité. Tu as ${listCount} contact${listCount > 1 ? 's' : ''}, vise 100 noms.`, '/contacts'))

  // ── Niveau 1 — Temporel (fenêtres qui se ferment) ──
  const today = new Date()
  for (const c of contacts) {
    if (!c.birthDate) continue
    const b = new Date(c.birthDate)
    if (b.getMonth() === today.getMonth() && b.getDate() === today.getDate()) {
      push(c, 1, 'MESSAGE', `Souhaite l'anniversaire de ${prenom(c)} 🎂`, `C'est son anniversaire aujourd'hui — un mot fait toute la différence.`, c.phone ? 'WHATSAPP' : c.email ? 'EMAIL' : null)
    }
  }
  for (const a of appts) {
    if (!a.contactId) continue
    const c = byId.get(a.contactId); if (!c) continue
    const t = new Date(a.startAt).getTime()
    if (t < now) push(c, 1, 'DEBRIEF', `Débriefe ton RDV avec ${prenom(c)}`, `RDV passé non débriefé — saisis le résultat pour débloquer la suite.`, null)
    else if (t - now < 2 * 86_400_000) push(c, 1, 'RDV', `Prépare ton RDV avec ${prenom(c)}`, `RDV « ${a.title} » à venir — prépare-le et confirme.`, null)
  }
  for (const r of relances) {
    const c = byId.get(r.contactId); if (!c) continue
    push(c, 1, 'MESSAGE', `Relance ${prenom(c)}`, `Relance programmée arrivée à échéance.`, (r.channel || '').toUpperCase() || (c.phone ? 'WHATSAPP' : c.email ? 'EMAIL' : null))
  }

  // ── Niveaux 2-4 — un pas par contact selon le flow ──
  for (const c of contacts) {
    const days = c.lastContact ? Math.floor((now - new Date(c.lastContact).getTime()) / 86_400_000) : null
    const stale = days !== null && days >= 5
    const channel = c.phone ? 'WHATSAPP' : c.email ? 'EMAIL' : null
    if (c.kind === 'PARTENAIRE') {
      if (c.partnerStage === 'DEMARRAGE') push(c, 2, 'MESSAGE', `Accompagne le démarrage de ${prenom(c)}`, `Nouveau partenaire — cadre ses 48h et ses premières actions.`, channel)
      else push(c, 4, 'MESSAGE', `Soutiens ${prenom(c)}`, `Reste présent, valorise sa progression (Go Pro · Skill 6).`, channel)
      continue
    }
    if (c.kind === 'CLIENT') { push(c, 4, 'MESSAGE', `Prends des nouvelles de ${prenom(c)}`, stale ? `Client sans contact depuis ${days}j — relance / propose l'opportunité.` : `Fidélise ou propose l'opportunité (upsell).`, channel); continue }
    // PROSPECT
    switch (c.prospectStage) {
      case 'CLOSING':
        push(c, 2, 'MESSAGE', `Close ${prenom(c)}`, `En phase de décision — propose-lui de démarrer maintenant.`, channel); break
      case 'SUIVI':
        if (c.exposures >= 4) push(c, 2, 'MESSAGE', `Tente le closing avec ${prenom(c)}`, `${c.exposures} expositions — c'est le moment de proposer de décider.`, channel)
        else push(c, 4, 'MESSAGE', `Continue le suivi de ${prenom(c)}`, `${c.exposures} exposition${c.exposures > 1 ? 's' : ''} — encore un contact ou deux avant de closer.`, channel)
        break
      case 'PRESENTATION':
        push(c, 4, 'MESSAGE', `Fais le suivi de ${prenom(c)}`, `« La fortune est dans le suivi » — reviens vers lui/elle.`, channel); break
      case 'INVITATION':
        push(c, stale ? 4 : 3, 'MESSAGE', stale ? `Relance ton invitation à ${prenom(c)}` : `Propose une présentation à ${prenom(c)}`, stale ? `Invité il y a ${days}j sans suite.` : `A réagi — propose d'en voir plus.`, channel); break
      default: // NOUVEAU
        push(c, 3, 'MESSAGE', `Invite ${prenom(c)}`, `Nouveau dans ta liste — lance la conversation et crée la curiosité.`, channel)
    }
  }

  // ── Tri : niveau asc, puis priorité desc ; équilibre : 1 par contact, plafond 7 ──
  cands.sort((a, b) => a.level - b.level || b.priority - a.priority)
  const plan: Cand[] = []
  for (const c of cands) {
    const key = c.contactId || c.action // socle : pas de contact → clé = l'action (unique)
    if (seen.has(key)) continue
    seen.add(key)
    plan.push(c)
    if (plan.length >= 7) break
  }

  return NextResponse.json({ items: plan, total: cands.length })
}
