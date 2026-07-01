'use client'

import Link from 'next/link'
import { createPortal } from 'react-dom'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  GitFork, Link2, Bot, FileText,
  Plus, MoreHorizontal, Pencil, Trash2,
} from 'lucide-react'
import { groupForPath } from '@/components/mobile/nav-config'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'
import { toast } from 'sonner'

/* ── Historique des agents (sidebar 2 sur pages agent) ──────────────────── */

type AgentSession = { id: string; title: string; daysAgo: number }

const AGENT_PANEL: Record<string, { title: string; newLabel: string; sessions: AgentSession[] }> = {
  '/atlas': {
    title: 'Conversations',
    newLabel: 'Nouvelle conversation',
    sessions: [
      { id: 'a1', title: 'Comment relancer un prospect tiède ?', daysAgo: 0 },
      { id: 'a2', title: 'Préparer mon closing avec Sophie', daysAgo: 0 },
      { id: 'a3', title: 'Analyse de mon rapport hebdo', daysAgo: 1 },
      { id: 'a4', title: "Script d'invitation profil DISC I", daysAgo: 3 },
      { id: 'a5', title: 'Optimiser mon temps de prospection', daysAgo: 9 },
    ],
  },
  '/aria': {
    title: 'Simulations',
    newLabel: 'Nouvelle simulation',
    sessions: [
      { id: 'r1', title: 'Invitation — Thomas Renard', daysAgo: 0 },
      { id: 'r2', title: "Objection « je n'ai pas le temps »", daysAgo: 1 },
      { id: 'r3', title: 'Closing — profil analytique', daysAgo: 4 },
      { id: 'r4', title: 'Découverte besoin santé', daysAgo: 12 },
    ],
  },
  '/nova': {
    title: 'Créations',
    newLabel: 'Nouvelle création',
    sessions: [
      { id: 'n1', title: 'Post — témoignage client', daysAgo: 0 },
      { id: 'n2', title: 'Reel — 3 erreurs en prospection', daysAgo: 2 },
      { id: 'n3', title: 'Story — coulisses de mon activité', daysAgo: 6 },
      { id: 'n4', title: 'Carrousel — bienfaits produit', daysAgo: 15 },
    ],
  },
}

const AGENT_HREFS = Object.keys(AGENT_PANEL)

const TIME_GROUPS: { label: string; test: (d: number) => boolean }[] = [
  { label: "Aujourd'hui",      test: (d) => d === 0 },
  { label: 'Hier',             test: (d) => d === 1 },
  { label: '7 derniers jours', test: (d) => d >= 2 && d <= 7 },
  { label: 'Plus ancien',      test: (d) => d > 7 },
]

function AgentHistory({ agentHref }: { agentHref: string }) {
  const panel = AGENT_PANEL[agentHref]
  const [sessions, setSessions] = useState<AgentSession[]>(panel?.sessions ?? [])
  const [activeId, setActiveId] = useState<string | undefined>(panel?.sessions[0]?.id)
  const [menuId, setMenuId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

  // Recharge quand on change d'agent (le composant reste monté)
  useEffect(() => {
    const p = AGENT_PANEL[agentHref]
    setSessions(p?.sessions ?? [])
    setActiveId(p?.sessions[0]?.id)
    setMenuId(null)
    setEditingId(null)
  }, [agentHref])

  // Ferme le menu au clic extérieur
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuId(null)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function startRename(s: AgentSession) {
    setEditingId(s.id)
    setDraft(s.title)
    setMenuId(null)
  }
  function commitRename() {
    if (editingId && draft.trim()) {
      setSessions((prev) => prev.map((s) => (s.id === editingId ? { ...s, title: draft.trim() } : s)))
    }
    setEditingId(null)
  }
  function remove(id: string) {
    setSessions((prev) => prev.filter((s) => s.id !== id))
    setMenuId(null)
    toast.info('Session supprimée')
  }

  if (!panel) return null

  return (
    <div className="flex h-full flex-col">
      {/* Header — pt-3 + h-11 = centre à 90px (aligné sur "Accueil", le chevron et l'icône agent) ; pr-5 dégage le chevron */}
      <div className="shrink-0 pl-4 pr-5 pt-3">
        <div className="flex h-11 items-center justify-between">
          <span className="text-sm font-bold text-foreground">{panel.title}</span>
          <button
            type="button"
            title={panel.newLabel}
            onClick={() => toast.info(panel.newLabel)}
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Plus className="size-4 stroke-[1.5]" />
          </button>
        </div>
      </div>

      {/* Liste groupée par temps — pr-5 pour dégager le chevron de bascule */}
      <div className="flex-1 overflow-y-auto no-scrollbar pl-2 pr-5 pb-3">
        {TIME_GROUPS.map((g) => {
          const items = sessions.filter((s) => g.test(s.daysAgo))
          if (!items.length) return null
          return (
            <div key={g.label} className="mb-1">
              <p className="px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                {g.label}
              </p>
              {items.map((s) =>
                editingId === s.id ? (
                  <input
                    key={s.id}
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename()
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none"
                  />
                ) : (
                  <div key={s.id} className="group relative">
                    <button
                      type="button"
                      onClick={() => setActiveId(s.id)}
                      className={cn(
                        'w-full truncate rounded-xl px-3 py-2 pr-8 text-left text-sm transition-colors',
                        activeId === s.id
                          ? 'bg-muted font-medium text-foreground'
                          : 'text-foreground/70 hover:bg-muted hover:text-foreground',
                      )}
                    >
                      {s.title}
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={() => setMenuId(menuId === s.id ? null : s.id)}
                      className={cn(
                        'absolute right-1 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-opacity hover:bg-background hover:text-foreground',
                        menuId === s.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                      )}
                    >
                      <MoreHorizontal className="size-4" />
                    </button>
                    {menuId === s.id && (
                      <div
                        ref={menuRef}
                        className="absolute right-0 top-9 z-20 w-44 overflow-hidden rounded-xl border border-border bg-background py-1.5 shadow-card"
                      >
                        <button
                          type="button"
                          onClick={() => startRename(s)}
                          className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-medium text-foreground hover:bg-muted transition-colors"
                        >
                          <Pencil className="size-4 stroke-[1.5] text-muted-foreground" />Renommer
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(s.id)}
                          className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="size-4 stroke-[1.5]" />Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                ),
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface SidebarItem {
  href: string
  label: string
  icon: LucideIcon
  color?: string
}

/* ── Atlas : historique RÉEL (DB AtlasConversation), piloté par l'URL ?c= ──────── */

type Conv = { id: string; title: string | null; updatedAt: string }

function AtlasHistory() {
  const router = useRouter()
  const activeId = useSearchParams().get('c')
  const [items, setItems] = useState<Conv[]>([])
  const [menuId, setMenuId] = useState<string | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/atlas/conversations')
      if (r.ok) setItems(await r.json())
    } catch {
      /* hors-ligne : on garde la liste courante */
    }
  }, [])

  // Recharge à l'ouverture et quand la conversation active change (nouvelle conv créée)
  useEffect(() => { load() }, [load, activeId])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuId(null)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function startRename(c: Conv) {
    setEditingId(c.id)
    setDraft(c.title ?? '')
    setMenuId(null)
  }
  async function commitRename() {
    const id = editingId
    const title = draft.trim()
    setEditingId(null)
    if (!id || !title) return
    setItems((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)))
    await fetch(`/api/atlas/conversations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    }).catch(() => {})
  }
  async function remove(id: string) {
    setMenuId(null)
    setItems((prev) => prev.filter((c) => c.id !== id))
    await fetch(`/api/atlas/conversations/${id}`, { method: 'DELETE' }).catch(() => {})
    if (id === activeId) router.push('/atlas')
  }

  const now = Date.now()
  const daysAgo = (iso: string) => Math.floor((now - new Date(iso).getTime()) / 86_400_000)

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 pl-4 pr-5 pt-3">
        <div className="flex h-11 items-center justify-between">
          <span className="text-sm font-bold text-foreground">Conversations</span>
          <button
            type="button"
            title="Nouvelle conversation"
            onClick={() => { localStorage.removeItem('atlas-last-conv'); router.push('/atlas') }}
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Plus className="size-4 stroke-[1.5]" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pl-2 pr-5 pb-3">
        {items.length === 0 && (
          <p className="px-3 pt-3 text-xs text-muted-foreground">Aucune conversation. Lance-toi avec Atlas.</p>
        )}
        {TIME_GROUPS.map((g) => {
          const group = items.filter((c) => g.test(daysAgo(c.updatedAt)))
          if (!group.length) return null
          return (
            <div key={g.label} className="mb-1">
              <p className="px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                {g.label}
              </p>
              {group.map((c) =>
                editingId === c.id ? (
                  <input
                    key={c.id}
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename()
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none"
                  />
                ) : (
                  <div key={c.id} className="group relative">
                    <Link
                      href={`/atlas?c=${c.id}`}
                      className={cn(
                        'block w-full truncate rounded-xl px-3 py-2 pr-8 text-left text-sm transition-colors',
                        activeId === c.id
                          ? 'bg-muted font-medium text-foreground'
                          : 'text-foreground/70 hover:bg-muted hover:text-foreground',
                      )}
                    >
                      {c.title || 'Sans titre'}
                    </Link>
                    <button
                      type="button"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        if (menuId === c.id) { setMenuId(null); return }
                        const btn = e.currentTarget.getBoundingClientRect()
                        const aside = e.currentTarget.closest('aside')?.getBoundingClientRect()
                        setMenuPos({
                          top: btn.bottom + 6,
                          right: aside ? window.innerWidth - aside.right : window.innerWidth - btn.right,
                        })
                        setMenuId(c.id)
                      }}
                      className={cn(
                        'absolute right-1 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-opacity hover:bg-background hover:text-foreground',
                        menuId === c.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                      )}
                    >
                      <MoreHorizontal className="size-4" />
                    </button>
                  </div>
                ),
              )}
            </div>
          )
        })}
      </div>

      {/* Menu ••• en portail (hors de l'aside transformée) → fixe, aligné sur le bord droit de la sidebar */}
      {menuId && menuPos && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[60] w-40 overflow-hidden rounded-xl border border-border bg-background py-1 shadow-card"
          style={{ top: menuPos.top, right: menuPos.right }}
        >
          <button
            type="button"
            onClick={() => { const conv = items.find((x) => x.id === menuId); if (conv) startRename(conv) }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            <Pencil className="size-3.5 stroke-[1.5] text-muted-foreground" />Renommer
          </button>
          <button
            type="button"
            onClick={() => { if (menuId) remove(menuId) }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="size-3.5 stroke-[1.5]" />Supprimer
          </button>
        </div>,
        document.body,
      )}
    </div>
  )
}

interface SidebarSection {
  title: string
  items: SidebarItem[]
  bottom?: SidebarItem[]
}

function getSidebarSection(pathname: string): SidebarSection | null {
  const g = groupForPath(pathname)
  return g ? { title: g.label, items: g.items.map((i) => ({ href: i.href, label: i.label, icon: i.icon })) } : null
}

export function getPageTitle(pathname: string): string {
  const section = getSidebarSection(pathname)
  if (!section) return ''
  const active = section.items.find(
    (i) => pathname === i.href || pathname.startsWith(i.href + '/'),
  )
  return active?.label ?? section.title
}

interface Props {
  hidden?: boolean
}

export function DesktopSidebar({ hidden = false }: Props) {
  const pathname = usePathname()
  const agentHref = AGENT_HREFS.find((h) => pathname === h || pathname.startsWith(h + '/'))
  const section = getSidebarSection(pathname)

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  // Sur les pages agent → historique ; sinon → sous-pages ; rien sinon
  if (!agentHref && !section) return null

  return (
    <aside
      style={{ transform: hidden ? 'translateX(-320px)' : 'translateX(0)' }}
      className={cn(
        'hidden lg:flex flex-col fixed left-16 top-14 h-[calc(100dvh-3.5rem)] z-40',
        agentHref ? 'w-64' : 'w-48',
        'bg-background border-r border-border overflow-hidden',
        'transition-[transform,width] duration-200 ease-out',
      )}
    >
      {agentHref === '/atlas' ? (
        <AtlasHistory />
      ) : agentHref ? (
        <AgentHistory agentHref={agentHref} />
      ) : (
        /* Contextual nav — sous-pages labellisées */
        <nav className="flex flex-col gap-0.5 pl-2 pr-5 pt-3 flex-1 overflow-y-auto overflow-x-hidden">
          {section!.items.map((item) => (
            <NavItem key={item.href} {...item} active={isActive(item.href)} collapsed={false} />
          ))}
        </nav>
      )}
    </aside>
  )
}

function NavItem({
  href, label, active,
}: {
  href: string
  label: string
  icon?: LucideIcon
  active: boolean
  collapsed?: boolean
  color?: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex h-11 items-center rounded-xl px-3 text-sm font-medium transition-colors whitespace-nowrap',
        active
          ? 'bg-muted font-semibold text-foreground'
          : 'text-foreground/70 hover:bg-muted hover:text-foreground',
      )}
    >
      {label}
    </Link>
  )
}
