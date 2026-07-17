'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Menu, Search, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'

// ═══ NAV MESSAGERIE — TRANCHE 0 (squelette) ═══
// Page Conversations développée EN PARALLÈLE de la nav actuelle : accessible
// uniquement par l'URL /chats (aucun lien dans l'app) jusqu'à la bascule (T10).
// T1 branchera : badges = plan du jour, recherche, forfaits (agents grisés), FAB.

type Agent = { id: string; name: string; role: string; line: string; at: string | null }
type Thread = {
  contactId: string; name: string; prenom: string; initials: string; accent: string
  kind: string; stage: string | null; recruiting: boolean
  lastContact: string | null; draft: string | null; birthdayToday: boolean
}

const AGENT_COLOR: Record<string, string> = { atlas: '#F97316', aria: '#14B8A6', nova: '#8B5CF6', communaute: '#3f434b' }
const AGENT_ROUTE: Record<string, string> = { atlas: '/atlas', aria: '/aria', nova: '/nova', communaute: '/communaute' }
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

export default function ChatsPage() {
  const router = useRouter()
  const [agents, setAgents] = useState<Agent[]>([])
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/chats/threads')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) { setAgents(d.agents ?? []); setThreads(d.threads ?? []) } })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col bg-background">
      {/* Rangée unique : ☰ + atline + recherche (T1 : tiroir + recherche plein écran) */}
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
          <button key={a.id} type="button" onClick={() => router.push(AGENT_ROUTE[a.id] ?? '/atlas')} className="flex items-center gap-3 px-4 py-2.5 text-left active:bg-muted">
            <span className="grid size-12 shrink-0 place-items-center rounded-full text-base font-bold text-white" style={{ backgroundColor: AGENT_COLOR[a.id] }}>
              {a.id === 'communaute' ? '👥' : a.name[0]}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                {a.name}
                <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', a.id === 'atlas' ? 'bg-primary/10 text-primary' : a.id === 'aria' ? 'bg-[#14B8A6]/10 text-[#14B8A6]' : a.id === 'nova' ? 'bg-[#8B5CF6]/10 text-[#8B5CF6]' : 'bg-muted text-muted-foreground')}>
                  {a.role}
                </span>
              </span>
              <span className="block truncate text-xs text-muted-foreground">{a.line}</span>
            </span>
            <span className="shrink-0 text-[10px] text-muted-foreground">{when(a.at)}</span>
          </button>
        ))}
      </div>

      {/* Contacts triés par dernier échange */}
      <p className="px-4 pb-1 pt-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Contacts</p>
      <div className="flex flex-1 flex-col pb-24">
        {loading && <p className="px-4 py-6 text-sm text-muted-foreground">Chargement…</p>}
        {!loading && threads.length === 0 && <p className="px-4 py-6 text-sm text-muted-foreground">Aucun contact pour l'instant.</p>}
        {threads.map((t) => {
          const days = daysSince(t.lastContact)
          const cold = days !== null && days >= 30
          return (
            <button key={t.contactId} type="button" onClick={() => router.push(`/contacts/${t.contactId}`)} className={cn('flex items-center gap-3 px-4 py-2.5 text-left active:bg-muted', cold && 'opacity-50')}>
              <span className="grid size-12 shrink-0 place-items-center rounded-full text-base font-bold text-white" style={{ backgroundColor: t.accent }}>{t.initials}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">{t.name}</span>
                <span className={cn('block truncate text-xs', t.draft ? 'text-primary' : 'text-muted-foreground')}>
                  {t.birthdayToday ? "🎂 C'est son anniversaire aujourd'hui"
                    : t.draft ? `✍️ Brouillon : ${t.draft}`
                    : days !== null ? `dernier contact il y a ${days} j${cold ? ' 🥶' : ''}`
                    : 'jamais contacté — lance la conversation'}
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-[10px] text-muted-foreground">{when(t.lastContact)}</span>
                {t.recruiting ? (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">En recrutement</span>
                ) : t.kind === 'PARTENAIRE' ? (
                  <span className="rounded-full bg-[#14B8A6]/10 px-2 py-0.5 text-[10px] font-medium text-[#14B8A6]">Partenaire</span>
                ) : t.stage ? (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{STAGE_LABEL[t.stage] ?? t.stage}</span>
                ) : null}
              </span>
            </button>
          )
        })}
      </div>

      {/* FAB ✎ (T2 : popover Nouveau message / Nouveau contact) */}
      <button type="button" aria-label="Créer" className="fixed bottom-6 right-5 z-40 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_24px_rgba(249,115,22,.35)] active:scale-95">
        <Pencil className="size-5 stroke-[1.5]" />
      </button>
    </div>
  )
}
