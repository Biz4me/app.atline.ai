'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { TopBar } from '@/components/top-bar'
import { useBusiness } from '@/components/business-provider'
import { DiscAvatar } from '@/components/disc-avatar'
import { StagePill, DiscBadge } from '@/components/pills'
import { contacts } from '@/lib/data'
import type { Contact, ContactStage } from '@/lib/types'
import {
  Search, Plus, UserRound,
  Mic, Sparkles, Trash2, ArrowUpDown, ArrowUp, ArrowDown,
} from 'lucide-react'
import { AddContactSheet } from '@/components/add-contact-sheet'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type Segment = 'prospects' | 'clients' | 'partenaires'
type SortKey = 'name' | 'disc' | 'stage' | 'city' | 'lastInteraction'
type SortDir = 'asc' | 'desc'

const segmentConfig: Record<Segment, { label: string; stages: ContactStage[] }> = {
  prospects:   { label: 'Prospects',   stages: ['nouveau', 'chaud', 'prospect'] },
  clients:     { label: 'Clients',     stages: ['client']                        },
  partenaires: { label: 'Partenaires', stages: ['partenaire']                   },
}

const stageFilters: Record<Segment, { id: string; label: string; stages?: ContactStage[] }[]> = {
  prospects: [
    { id: 'tous',     label: 'Tous' },
    { id: 'chaud',    label: 'Chaud',   stages: ['chaud']    },
    { id: 'qualifie', label: 'Qualifié', stages: ['prospect'] },
    { id: 'nouveau',  label: 'Nouveau', stages: ['nouveau']  },
  ],
  clients:     [{ id: 'tous', label: 'Tous' }],
  partenaires: [{ id: 'tous', label: 'Tous' }],
}

const sourceColors: Record<string, string> = {
  instagram:      'text-[#E1306C]',
  linkedin:       'text-[#0077B5]',
  facebook:       'text-[#1877F2]',
  whatsapp:       'text-[#25D366]',
  recommandation: 'text-success',
  événement:      'text-violet',
  evenement:      'text-violet',
}
function sourceColor(s: string) {
  return sourceColors[s.toLowerCase()] ?? 'text-muted-foreground'
}

const discHex: Record<string, string> = {
  D: '#dc2626',
  I: '#f59e0b',
  S: '#22c55e',
  C: '#3b82f6',
}

/* ── Icône de tri ────────────────────────────────────────────── */
function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ArrowUpDown className="size-3 shrink-0 opacity-30" />
  return dir === 'asc'
    ? <ArrowUp className="size-3 shrink-0 text-primary" />
    : <ArrowDown className="size-3 shrink-0 text-primary" />
}

/* ── En-tête de colonne triable ──────────────────────────────── */
function Th({
  label, sortKey, current, dir, onSort, className,
}: {
  label: string
  sortKey: SortKey
  current: SortKey | null
  dir: SortDir
  onSort: (k: SortKey) => void
  className?: string
}) {
  const active = current === sortKey
  return (
    <th className={cn('px-4 py-3 text-left', className)}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        {label}
        <SortIcon active={active} dir={dir} />
      </button>
    </th>
  )
}

/* ── Page principale ─────────────────────────────────────────── */
function ContactsContent() {
  const { current } = useBusiness()
  const router = useRouter()
  const [segment, setSegment]         = useState<Segment>('prospects')
  const [stageFilter, setStageFilter] = useState('tous')
  const [query, setQuery]             = useState('')
  const [addOpen, setAddOpen]         = useState(false)
  const [sortKey, setSortKey]         = useState<SortKey | null>(null)
  const [sortDir, setSortDir]         = useState<SortDir>('asc')

  const handleSegmentChange = (seg: Segment) => {
    setSegment(seg)
    setStageFilter('tous')
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const list = useMemo(() => {
    const segStages    = segmentConfig[segment].stages
    const filterDef    = stageFilters[segment].find((f) => f.id === stageFilter)
    const activeStages = filterDef?.stages ?? segStages

    let result = contacts
      .filter((c) => c.businessId === current.id)
      .filter((c) => activeStages.includes(c.stage))
      .filter((c) =>
        query
          ? `${c.firstName} ${c.lastName}`.toLowerCase().includes(query.toLowerCase())
          : true
      )

    if (sortKey) {
      result = [...result].sort((a, b) => {
        let va = ''
        let vb = ''
        if (sortKey === 'name')            { va = `${a.firstName} ${a.lastName}`; vb = `${b.firstName} ${b.lastName}` }
        else if (sortKey === 'disc')       { va = a.disc ?? ''; vb = b.disc ?? '' }
        else if (sortKey === 'stage')      { va = a.stage; vb = b.stage }
        else if (sortKey === 'city')       { va = a.city ?? ''; vb = b.city ?? '' }
        else if (sortKey === 'lastInteraction') { va = a.lastInteraction ?? ''; vb = b.lastInteraction ?? '' }
        const cmp = va.localeCompare(vb, 'fr')
        return sortDir === 'asc' ? cmp : -cmp
      })
    }

    return result
  }, [segment, stageFilter, query, current.id, sortKey, sortDir])

  const filters = stageFilters[segment]
  const thProps = { current: sortKey, dir: sortDir, onSort: toggleSort }

  return (
    <>
      {/* ══ MOBILE ══════════════════════════════════════════════ */}
      <div className="lg:hidden">
        <TopBar />

        <div className="flex flex-col gap-4 px-4 pt-5">
          {/* Titre + bouton + */}
          <div className="flex items-center justify-between">
            <h1 className="font-display text-[32px] font-extrabold leading-tight tracking-[-0.025em] text-foreground">
              Mes contacts
            </h1>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 active:scale-95 transition-transform"
            >
              <Plus className="size-5 stroke-2" />
            </button>
          </div>

          {/* Recherche */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un contact"
              className="w-full rounded-xl border border-border bg-surface py-3 pl-10 pr-4 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40"
            />
          </div>

          {/* 3 segments */}
          <div className="grid grid-cols-3 rounded-xl bg-muted p-1 gap-1">
            {(Object.keys(segmentConfig) as Segment[]).map((seg) => (
              <button
                key={seg}
                type="button"
                onClick={() => handleSegmentChange(seg)}
                className={cn(
                  'rounded-lg py-2 text-sm font-semibold transition-colors',
                  segment === seg
                    ? 'bg-background text-primary shadow-sm'
                    : 'text-muted-foreground'
                )}
              >
                {segmentConfig[seg].label}
              </button>
            ))}
          </div>

          {/* Chips filtres */}
          {filters.length > 1 && (
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
              {filters.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStageFilter(f.id)}
                  className={cn(
                    'shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors',
                    stageFilter === f.id
                      ? 'bg-primary/10 text-primary'
                      : 'border border-border bg-surface text-fg-2'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {/* Liste */}
          {list.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center">
              <p className="text-sm text-muted-foreground">Aucun contact ici</p>
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
              >
                <Plus className="size-4 stroke-2" />
                Ajouter un contact
              </button>
            </div>
          ) : (
            <ul className="flex flex-col gap-2 pb-8">
              {list.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/contacts/${c.id}`}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3.5 shadow-card transition-colors active:bg-muted"
                  >
                    <DiscAvatar firstName={c.firstName} lastName={c.lastName} disc={c.disc} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-foreground">
                        {c.firstName} {c.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {c.city && <span>{c.city} </span>}
                        <span className={cn('font-semibold', sourceColor(c.source))}>
                          {c.source}
                        </span>
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <StagePill stage={c.stage} />
                      <span className="text-[10px] text-muted-foreground">
                        {c.lastInteraction}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ══ DESKTOP ═════════════════════════════════════════════ */}
      <div className="hidden lg:flex flex-col h-[calc(100dvh-56px)] overflow-hidden">

        {/* Sub-header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-foreground">Mes contacts</h1>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {list.length}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="size-4 stroke-2" />
            Ajouter un contact
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col border-b border-border shrink-0">
          <div className="flex items-center gap-4 px-6 py-3">
            {/* Recherche */}
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un contact…"
                className="w-full rounded-lg border border-border bg-muted py-2 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring/40"
              />
            </div>

            {/* Segments */}
            <div className="flex items-center gap-1">
              {(Object.keys(segmentConfig) as Segment[]).map((seg) => (
                <button
                  key={seg}
                  type="button"
                  onClick={() => handleSegmentChange(seg)}
                  className={cn(
                    'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                    segment === seg
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {segmentConfig[seg].label}
                </button>
              ))}
            </div>
          </div>

          {/* Chips filtres */}
          {filters.length > 1 && (
            <div className="flex gap-2 px-6 pb-3">
              {filters.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStageFilter(f.id)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                    stageFilter === f.id
                      ? 'bg-primary/10 text-primary'
                      : 'border border-border text-muted-foreground hover:text-foreground'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Main : table + panel */}
        <div className="flex flex-1 overflow-hidden">

          {/* Table */}
          <div className="flex-1 overflow-auto">
            {list.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-20 text-center">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-muted">
                  <UserRound className="size-6 stroke-[1.5] text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">Aucun contact dans cette catégorie</p>
                <button
                  type="button"
                  onClick={() => setAddOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
                >
                  <Plus className="size-4 stroke-2" />
                  Ajouter un contact
                </button>
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead className="sticky top-0 z-10 bg-background border-b border-border">
                  <tr>
                    <th className="w-10 px-4 py-3">
                      <input type="checkbox" className="rounded border-border" />
                    </th>
                    <Th label="Contact"            sortKey="name"            {...thProps} className="min-w-[200px]" />
                    <Th label="DISC"               sortKey="disc"            {...thProps} />
                    <Th label="Stade"              sortKey="stage"           {...thProps} />
                    <Th label="Ville"              sortKey="city"            {...thProps} />
                    <Th label="Dernière activité"  sortKey="lastInteraction" {...thProps} />
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => router.push(`/contacts/${c.id}`)}
                      className="border-b border-border cursor-pointer transition-colors hover:bg-muted/40 group/row"
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" className="rounded border-border" />
                      </td>

                      {/* Contact */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <DiscAvatar
                            firstName={c.firstName}
                            lastName={c.lastName}
                            disc={c.disc}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">
                              {c.firstName} {c.lastName}
                            </p>
                            {c.source && (
                              <p className={cn('text-xs', sourceColor(c.source))}>
                                {c.source}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* DISC */}
                      <td className="px-4 py-3.5">
                        {c.disc
                          ? <DiscBadge disc={c.disc} />
                          : <span className="text-xs text-muted-foreground">—</span>
                        }
                      </td>

                      {/* Stade */}
                      <td className="px-4 py-3.5">
                        <StagePill stage={c.stage} />
                      </td>

                      {/* Ville */}
                      <td className="px-4 py-3.5 text-sm text-muted-foreground">
                        {c.city ?? '—'}
                      </td>

                      {/* Dernière activité */}
                      <td className="px-4 py-3.5 text-sm text-muted-foreground">
                        {c.lastInteraction ?? '—'}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity">
                          <Link
                            href={`/atlas?contact=${c.id}`}
                            title="Préparer avec Atlas"
                            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                          >
                            <Sparkles className="size-4 stroke-[1.5]" />
                          </Link>
                          <Link
                            href={`/aria?contact=${c.id}`}
                            title="Simuler avec ARIA"
                            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:text-[#14B8A6] hover:bg-[#14B8A6]/10 transition-colors"
                          >
                            <Mic className="size-4 stroke-[1.5]" />
                          </Link>
                          <button
                            type="button"
                            title="Supprimer"
                            onClick={() => toast.error(`Supprimer ${c.firstName} ${c.lastName} ?`)}
                            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                          >
                            <Trash2 className="size-4 stroke-[1.5]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <AddContactSheet open={addOpen} onOpenChange={setAddOpen} />
    </>
  )
}

export default function ContactsPage() {
  return <ContactsContent />
}
