'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Search, Sparkles, UserSearch, Users, Pencil, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PlanItem } from '@/components/atlas-plan-card'
import { ThreadRow } from '@/components/thread-row'
import { AddContactSheet } from '@/components/add-contact-sheet'

// ═══ ESPACES — l'accordéon (refonte nav, tranche 4) ═══
// Remplace la liste plate (ChatsHome). 3 sections dépliables, UNE seule ouverte à la fois :
//  · Agents (Atlas/Aria/Nova)        · Prospects (prospects + clients)   · Partenaires (kind PARTENAIRE)
// Dans les listes de contacts : recherche en tête (taper = filtrer), tri ACTION-FIRST
// (« À faire aujourd'hui » = plan du jour, en haut), badges plan du jour sur les en-têtes.
// Données réutilisées telles quelles : /api/chats/threads + /api/plan/today + ThreadRow.

type Agent = { id: string; name: string; role: string; line: string; at: string | null; badge?: number }
type Thread = {
  contactId: string; name: string; prenom: string; initials: string; accent: string; personality: string | null
  kind: string; stage: string | null; recruiting: boolean
  lastContact: string | null; lastChatAt: string | null; draft: string | null; birthdayToday: boolean
}
type Section = 'agents' | 'prospects' | 'partenaires'

const AGENT_COLOR: Record<string, string> = { atlas: '#F97316', aria: '#14B8A6', nova: '#8B5CF6' }
const AGENT_ROUTE: Record<string, string> = { atlas: '/atlas', aria: '/chats/aria', nova: '/chats/nova' }
const AGENT_PILL: Record<string, string> = { atlas: 'bg-primary/10 text-primary', aria: 'bg-[#14B8A6]/10 text-[#14B8A6]', nova: 'bg-[#8B5CF6]/10 text-[#8B5CF6]' }
const DISC_HEX: Record<string, string> = { ROUGE: '#EF4444', VERT: '#22C55E', BLEU: '#3B82F6', JAUNE: '#F4B342' }
const STAGE_LABEL: Record<string, string> = {
  NOUVEAU: 'Nouveau', INVITATION: 'Invitation', PRESENTATION: 'Présentation', SUIVI: 'Suivi', CLOSING: 'Closing',
  DEMARRAGE: 'Démarrage', FORMATION: 'Formation', ACTIF: 'Actif', LEADER: 'Leader',
}
const avatarColor = (t: { personality: string | null; accent: string }) => (t.personality && DISC_HEX[t.personality]) || t.accent
const daysSince = (iso: string | null) => (iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)) : null)
function when(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso), now = new Date()
  const days = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  if (days < 7) return d.toLocaleDateString('fr-FR', { weekday: 'short' })
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

export function EspacesNav() {
  const router = useRouter()
  const [agents, setAgents] = useState<Agent[]>([])
  const [threads, setThreads] = useState<Thread[]>([])
  const [plan, setPlan] = useState<PlanItem[]>([])
  const [open, setOpen] = useState<Section | null>('prospects')
  const [q, setQ] = useState('')
  const [addOpen, setAddOpen] = useState(false)

  const load = useCallback(() => {
    Promise.all([
      fetch('/api/chats/threads').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/plan/today').then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([t, p]) => { if (t) { setAgents(t.agents ?? []); setThreads(t.threads ?? []) } if (p) setPlan(p.items ?? []) })
      .catch(() => {})
  }, [])
  useEffect(() => { load() }, [load])

  // Le plan du jour = les badges + le tri (rang par contact ; le reste au fil Atlas).
  const planRank = new Map<string, number>()
  plan.forEach((it, i) => { if (it.contactId && !planRank.has(it.contactId)) planRank.set(it.contactId, i) })
  const atlasBadge = plan.filter((it) => !it.contactId).length

  const agentList = agents.filter((a) => ['atlas', 'aria', 'nova'].includes(a.id))
  const sortT = (arr: Thread[]) => [...arr].sort((a, b) => {
    const ra = planRank.has(a.contactId) ? planRank.get(a.contactId)! : Infinity
    const rb = planRank.has(b.contactId) ? planRank.get(b.contactId)! : Infinity
    if (ra !== rb) return ra - rb
    return new Date(b.lastChatAt ?? b.lastContact ?? 0).getTime() - new Date(a.lastChatAt ?? a.lastContact ?? 0).getTime()
  })
  // Cloisonnement : Prospects = prospects + clients ; Partenaires = kind PARTENAIRE.
  const prospects = sortT(threads.filter((t) => t.kind !== 'PARTENAIRE'))
  const partenaires = sortT(threads.filter((t) => t.kind === 'PARTENAIRE'))
  const badge = (arr: Thread[]) => arr.filter((t) => planRank.has(t.contactId)).length

  const toggle = (s: Section) => { setOpen((o) => (o === s ? null : s)); setQ('') }
  const filt = (arr: Thread[]) => (q.trim() ? arr.filter((t) => t.name.toLowerCase().includes(q.trim().toLowerCase())) : arr)

  return (
    <div className="flex min-h-dvh w-full flex-col bg-background max-lg:pb-[calc(62px+env(safe-area-inset-bottom))]">
      <div
        className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-background/95 px-4 py-3 backdrop-blur"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <span className="flex-1 text-lg font-bold text-foreground">Espaces</span>
        <button type="button" aria-label="Nouveau contact" onClick={() => setAddOpen(true)} className="flex size-9 items-center justify-center rounded-full text-muted-foreground active:bg-muted">
          <Pencil className="size-5 stroke-[1.5]" />
        </button>
      </div>

      <Sect label="Agents" icon={Sparkles} open={open === 'agents'} onToggle={() => toggle('agents')}>
        {agentList.map((a) => (
          <ThreadRow
            key={a.id}
            avatarBg={AGENT_COLOR[a.id]}
            avatarSrc={`/avatars/${a.id}.png`}
            avatarText={a.name[0]}
            title={a.name}
            titlePill={{ label: a.role, cls: AGENT_PILL[a.id] }}
            line={a.line}
            time={when(a.at)}
            count={a.id === 'atlas' ? atlasBadge : a.badge ?? 0}
            online
            big
            onClick={() => router.push(AGENT_ROUTE[a.id])}
          />
        ))}
      </Sect>

      <Sect label="Prospects" icon={UserSearch} open={open === 'prospects'} onToggle={() => toggle('prospects')} badge={badge(prospects)}>
        <SearchRow q={q} setQ={setQ} placeholder="Rechercher un prospect…" />
        <ContactList list={filt(prospects)} planRank={planRank} plan={plan} />
      </Sect>

      <Sect label="Partenaires" icon={Users} open={open === 'partenaires'} onToggle={() => toggle('partenaires')} badge={badge(partenaires)}>
        <SearchRow q={q} setQ={setQ} placeholder="Rechercher un partenaire…" />
        <ContactList list={filt(partenaires)} planRank={planRank} plan={plan} />
      </Sect>

      <AddContactSheet open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) load() }} />
    </div>
  )
}

// Une section d'accordéon (en-tête cliquable + corps si ouverte).
function Sect({ label, icon: Icon, open, onToggle, badge, children }: {
  label: string; icon: LucideIcon; open: boolean; onToggle: () => void; badge?: number; children: ReactNode
}) {
  return (
    <div className="border-b border-border">
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-2.5 px-4 py-3 text-left active:bg-muted/50">
        <ChevronRight className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-90')} />
        <Icon className="size-5 shrink-0 stroke-[1.5] text-muted-foreground" />
        <span className="flex-1 text-sm font-semibold text-foreground">{label}</span>
        {badge ? <span className="rounded-full bg-primary/10 px-2 py-0.5 text-2xs font-semibold text-primary">{badge} à faire</span> : null}
      </button>
      {open && <div className="pb-1">{children}</div>}
    </div>
  )
}

// Recherche en tête de section : taper les premières lettres pour sauter au contact.
function SearchRow({ q, setQ, placeholder }: { q: string; setQ: (v: string) => void; placeholder: string }) {
  return (
    <div className="px-4 pb-2 pt-1">
      <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-2">
        <Search className="size-4 shrink-0 stroke-[1.5] text-muted-foreground" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>
    </div>
  )
}

// Liste de contacts triée action-first : « À faire aujourd'hui » (plan du jour) puis « Tous ».
function ContactList({ list, planRank, plan }: { list: Thread[]; planRank: Map<string, number>; plan: PlanItem[] }) {
  const router = useRouter()
  if (list.length === 0) return <p className="px-4 py-4 text-sm text-muted-foreground">Personne pour l&apos;instant.</p>

  const todo = list.filter((t) => planRank.has(t.contactId))
  const rest = list.filter((t) => !planRank.has(t.contactId))

  const row = (t: Thread) => {
    const days = daysSince(t.lastContact)
    const cold = days !== null && days >= 30 && !planRank.has(t.contactId)
    const planItem = planRank.has(t.contactId) ? plan[planRank.get(t.contactId)!] : null
    const line =
        t.draft ? '✍️ Message prêt à envoyer'
      : t.birthdayToday ? '🎂 Anniversaire aujourd\'hui'
      : planItem?.action === 'DEBRIEF' ? 'RDV à débriefer'
      : planItem?.action === 'RDV' ? 'RDV à venir'
      : days !== null ? `Vu il y a ${days} j`
      : 'Pas encore contacté'
    return (
      <ThreadRow
        key={t.contactId}
        avatarBg={avatarColor(t)}
        avatarText={t.initials}
        title={t.name}
        line={line}
        time={when(t.lastChatAt ?? t.lastContact)}
        count={planItem ? 1 : 0}
        endPill={
          t.recruiting ? { label: 'En recrutement', cls: 'bg-primary/10 text-primary' }
          : t.kind === 'PARTENAIRE' ? { label: 'Partenaire', cls: 'bg-[#14B8A6]/10 text-[#14B8A6]' }
          : t.stage ? { label: STAGE_LABEL[t.stage] ?? t.stage, cls: 'bg-muted text-muted-foreground' }
          : undefined
        }
        dim={cold}
        big
        onClick={() => router.push(`/chats/${t.contactId}`)}
      />
    )
  }

  return (
    <>
      {todo.length > 0 && <Grp label="À faire aujourd'hui" />}
      {todo.map(row)}
      {rest.length > 0 && todo.length > 0 && <Grp label="Tous" />}
      {rest.map(row)}
    </>
  )
}

function Grp({ label }: { label: string }) {
  return <p className="px-4 pb-1 pt-2 text-2xs font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
}
