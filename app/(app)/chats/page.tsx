'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Menu, Search, Pencil, X, ChevronLeft, MessageSquarePlus, UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PlanItem } from '@/components/atlas-plan-card'
import { AddContactSheet } from '@/components/add-contact-sheet'

// ═══ NAV MESSAGERIE — T0 socle + T1 badges ═══
// Page Conversations en PARALLÈLE de la nav actuelle (URL /chats, aucun lien) jusqu'à la bascule (T10).
// T1 : les badges = le plan du jour (même moteur /api/plan/today que le chat, plafond 7).
// Action liée à un contact → badge sur SON fil ; fondation/formation → badge Atlas. Inbox zéro = journée faite.

type Agent = { id: string; name: string; role: string; line: string; at: string | null }
type Thread = {
  contactId: string; name: string; prenom: string; initials: string; accent: string
  kind: string; stage: string | null; recruiting: boolean
  lastContact: string | null; draft: string | null; birthdayToday: boolean
}

const AGENT_COLOR: Record<string, string> = { atlas: '#F97316', aria: '#14B8A6', nova: '#8B5CF6', communaute: '#3f434b' }
const AGENT_ROUTE: Record<string, string> = { atlas: '/atlas', aria: '/aria', nova: '/nova', communaute: '/communaute' }
const AGENT_PILL: Record<string, string> = { atlas: 'bg-primary/10 text-primary', aria: 'bg-[#14B8A6]/10 text-[#14B8A6]', nova: 'bg-[#8B5CF6]/10 text-[#8B5CF6]', communaute: 'bg-muted text-muted-foreground' }
const STAGE_LABEL: Record<string, string> = {
  NOUVEAU: 'Nouveau', INVITATION: 'Invitation', PRESENTATION: 'Présentation', SUIVI: 'Suivi', CLOSING: 'Closing',
  DEMARRAGE: 'Démarrage', FORMATION: 'Formation', ACTIF: 'Actif', LEADER: 'Leader',
}

// Heure façon messagerie : aujourd'hui = HH:MM, cette semaine = jour, sinon date courte.
function when(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const days = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  if (days < 7) return d.toLocaleDateString('fr-FR', { weekday: 'short' })
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

const daysSince = (iso: string | null) => (iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)) : null)

// UNE seule rangée pour agents ET contacts (règle des 7 : un composant, deux usages).
function ThreadRow({ avatarBg, avatarText, title, titlePill, line, lineOrange, time, count, endPill, dim, onClick }: {
  avatarBg: string; avatarText: string; title: string; titlePill?: { label: string; cls: string }
  line: string; lineOrange?: boolean; time?: string; count?: number
  endPill?: { label: string; cls: string }; dim?: boolean; onClick: () => void
}) {
  return (
    <button type="button" onClick={onClick} className={cn('flex w-full items-center gap-3 px-4 py-2.5 text-left active:bg-muted', dim && 'opacity-50')}>
      <span className="grid size-12 shrink-0 place-items-center rounded-full text-base font-bold text-white" style={{ backgroundColor: avatarBg }}>{avatarText}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          {title}
          {titlePill && <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', titlePill.cls)}>{titlePill.label}</span>}
        </span>
        <span className={cn('block truncate text-xs', lineOrange ? 'font-medium text-primary' : 'text-muted-foreground')}>{line}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        {time !== undefined && <span className="text-[10px] text-muted-foreground">{time}</span>}
        {count ? (
          <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">{count}</span>
        ) : endPill ? (
          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', endPill.cls)}>{endPill.label}</span>
        ) : null}
      </span>
    </button>
  )
}

export default function ChatsPage() {
  const router = useRouter()
  const [agents, setAgents] = useState<Agent[]>([])
  const [threads, setThreads] = useState<Thread[]>([])
  const [plan, setPlan] = useState<PlanItem[]>([])
  const [loading, setLoading] = useState(true)
  // T2 — créer : popover du ✎, picker « Nouveau message », feuille « Nouveau contact »
  const [fabOpen, setFabOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerQ, setPickerQ] = useState('')
  const [addOpen, setAddOpen] = useState(false)

  const load = useCallback(() => {
    Promise.all([
      fetch('/api/chats/threads').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/plan/today').then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([t, p]) => {
        if (t) { setAgents(t.agents ?? []); setThreads(t.threads ?? []) }
        if (p) setPlan(p.items ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])

  // Badges = le plan du jour : rang par contact (pour le tri), le reste (fondation/formation) au fil Atlas.
  const planRank = new Map<string, number>()
  plan.forEach((it, i) => { if (it.contactId && !planRank.has(it.contactId)) planRank.set(it.contactId, i) })
  const atlasBadge = plan.filter((it) => !it.contactId).length

  // Tri : les fils à traiter d'abord (dans l'ordre du plan), puis par dernier échange (ordre API).
  const sorted = [...threads].sort((a, b) => {
    const ra = planRank.has(a.contactId) ? planRank.get(a.contactId)! : Infinity
    const rb = planRank.has(b.contactId) ? planRank.get(b.contactId)! : Infinity
    return ra - rb
  })

  // Picker « Nouveau message » : tri par SUIVI À FAIRE — jamais contactés en tête,
  // puis les plus anciens échanges d'abord, les froids (≥30 j) grisés en bas.
  const picker = threads
    .filter((t) => !pickerQ.trim() || t.name.toLowerCase().includes(pickerQ.trim().toLowerCase()))
    .sort((a, b) => {
      const da = daysSince(a.lastContact), db = daysSince(b.lastContact)
      const ca = da !== null && da >= 30, cb = db !== null && db >= 30
      if (ca !== cb) return ca ? 1 : -1
      if (da === null || db === null) return da === null && db === null ? 0 : da === null ? -1 : 1
      return db - da
    })

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col bg-background">
      {/* Rangée unique : ☰ + atline + recherche (tiroir = T6, recherche plein écran = T3) */}
      <div className="sticky top-0 z-30 flex items-center gap-2.5 bg-background/90 px-4 py-2.5 backdrop-blur" style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top))' }}>
        <button type="button" aria-label="Menu" className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground active:bg-muted">
          <Menu className="size-5 stroke-[1.5]" />
        </button>
        <p className="shrink-0 text-lg font-bold tracking-tight text-foreground">atl<span className="text-primary">i</span>ne</p>
        <div className="flex flex-1 items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-2 text-sm text-muted-foreground">
          <Search className="size-4 shrink-0 stroke-[1.5]" /> Rechercher…
        </div>
      </div>

      {/* Agents épinglés */}
      <div className="flex flex-col">
        {agents.map((a) => (
          <ThreadRow
            key={a.id}
            avatarBg={AGENT_COLOR[a.id] ?? '#3f434b'}
            avatarText={a.id === 'communaute' ? '👥' : a.name[0]}
            title={a.name}
            titlePill={{ label: a.role, cls: AGENT_PILL[a.id] ?? AGENT_PILL.communaute }}
            line={a.id === 'atlas' && plan.length > 0 ? `Ton plan est prêt · ${plan.length} action${plan.length > 1 ? 's' : ''} aujourd'hui 🎯` : a.line}
            lineOrange={a.id === 'atlas' && plan.length > 0}
            time={when(a.at)}
            count={a.id === 'atlas' ? atlasBadge : 0}
            onClick={() => router.push(AGENT_ROUTE[a.id] ?? '/atlas')}
          />
        ))}
      </div>

      {/* Contacts : à traiter d'abord (badges du plan), puis par dernier échange */}
      <p className="px-4 pb-1 pt-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Contacts</p>
      <div className="flex flex-1 flex-col pb-24">
        {loading && <p className="px-4 py-6 text-sm text-muted-foreground">Chargement…</p>}
        {!loading && sorted.length === 0 && <p className="px-4 py-6 text-sm text-muted-foreground">Aucun contact pour l'instant.</p>}
        {sorted.map((t) => {
          const days = daysSince(t.lastContact)
          const cold = days !== null && days >= 30 && !planRank.has(t.contactId)
          const planItem = planRank.has(t.contactId) ? plan[planRank.get(t.contactId)!] : null
          const line = planItem ? planItem.headline
            : t.birthdayToday ? "🎂 C'est son anniversaire aujourd'hui"
            : t.draft ? `✍️ Brouillon : ${t.draft}`
            : days !== null ? `dernier contact il y a ${days} j${cold ? ' 🥶' : ''}`
            : 'jamais contacté — lance la conversation'
          return (
            <ThreadRow
              key={t.contactId}
              avatarBg={t.accent}
              avatarText={t.initials}
              title={t.name}
              line={line}
              lineOrange={!!planItem || !!t.draft}
              time={when(t.lastContact)}
              count={planItem ? 1 : 0}
              endPill={
                t.recruiting ? { label: 'En recrutement', cls: 'bg-primary/10 text-primary' }
                : t.kind === 'PARTENAIRE' ? { label: 'Partenaire', cls: 'bg-[#14B8A6]/10 text-[#14B8A6]' }
                : t.stage ? { label: STAGE_LABEL[t.stage] ?? t.stage, cls: 'bg-muted text-muted-foreground' }
                : undefined
              }
              dim={cold}
              onClick={() => router.push(`/contacts/${t.contactId}`)}
            />
          )
        })}
      </div>

      {/* ✎ : le crayon crée — popover 2 gestes (message, contact) */}
      {fabOpen && (
        <>
          <button type="button" aria-label="Fermer" onClick={() => setFabOpen(false)} className="fixed inset-0 z-[45] bg-black/40" />
          <div className="fixed bottom-24 right-5 z-[46] w-60 overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_16px_40px_rgba(0,0,0,.45)]">
            <button type="button" onClick={() => { setFabOpen(false); setPickerQ(''); setPickerOpen(true) }} className="flex w-full items-center gap-3 border-b border-border px-4 py-3.5 text-sm font-medium text-foreground active:bg-muted">
              <MessageSquarePlus className="size-4.5 shrink-0 stroke-[1.5] text-primary" /> Nouveau message
            </button>
            <button type="button" onClick={() => { setFabOpen(false); setAddOpen(true) }} className="flex w-full items-center gap-3 px-4 py-3.5 text-sm font-medium text-foreground active:bg-muted">
              <UserPlus className="size-4.5 shrink-0 stroke-[1.5] text-primary" /> Nouveau contact
            </button>
          </div>
        </>
      )}
      <button type="button" aria-label={fabOpen ? 'Fermer' : 'Créer'} onClick={() => setFabOpen((o) => !o)} className={cn('fixed bottom-6 right-5 z-[46] grid size-14 place-items-center rounded-full shadow-[0_8px_24px_rgba(249,115,22,.35)] transition-transform active:scale-95', fabOpen ? 'bg-muted text-foreground' : 'bg-primary text-primary-foreground')}>
        {fabOpen ? <X className="size-5 stroke-[1.5]" /> : <Pencil className="size-5 stroke-[1.5]" />}
      </button>

      {/* Picker « Nouveau message » : choisir AVEC QUI ouvrir le fil — trié par suivi à faire */}
      {pickerOpen && (
        <div className="fixed inset-0 z-[60] mx-auto flex w-full max-w-2xl flex-col bg-background">
          <div className="flex items-center gap-2.5 px-4 py-2.5" style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top))' }}>
            <button type="button" aria-label="Retour" onClick={() => setPickerOpen(false)} className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground active:bg-muted">
              <ChevronLeft className="size-5 stroke-[1.5]" />
            </button>
            <div className="flex flex-1 items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-2">
              <Search className="size-4 shrink-0 stroke-[1.5] text-muted-foreground" />
              <input
                autoFocus
                value={pickerQ}
                onChange={(e) => setPickerQ(e.target.value)}
                placeholder="Rechercher un contact…"
                className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <p className="px-4 pb-1 pt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {picker.length} contact{picker.length > 1 ? 's' : ''} · triés par suivi
          </p>
          <div className="flex-1 overflow-y-auto pb-8">
            {picker.map((t) => {
              const days = daysSince(t.lastContact)
              const cold = days !== null && days >= 30
              return (
                <ThreadRow
                  key={t.contactId}
                  avatarBg={t.accent}
                  avatarText={t.initials}
                  title={t.name}
                  line={days !== null ? `dernier contact il y a ${days} j${cold ? ' 🥶' : ''}` : 'jamais contacté — lance la conversation'}
                  endPill={
                    t.recruiting ? { label: 'En recrutement', cls: 'bg-primary/10 text-primary' }
                    : t.kind === 'PARTENAIRE' ? { label: 'Partenaire', cls: 'bg-[#14B8A6]/10 text-[#14B8A6]' }
                    : t.stage ? { label: STAGE_LABEL[t.stage] ?? t.stage, cls: 'bg-muted text-muted-foreground' }
                    : undefined
                  }
                  dim={cold}
                  onClick={() => router.push(`/contacts/${t.contactId}`)}
                />
              )
            })}
            {picker.length === 0 && <p className="px-4 py-6 text-sm text-muted-foreground">Aucun contact ne correspond.</p>}
          </div>
        </div>
      )}

      {/* Nouveau contact : la feuille existante, telle quelle */}
      <AddContactSheet open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) load() }} />
    </div>
  )
}
