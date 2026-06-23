'use client'

import { useMemo, useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { TopBar } from '@/components/top-bar'
import { useBusiness } from '@/components/business-provider'
import { DiscAvatar } from '@/components/disc-avatar'
import { StagePill } from '@/components/pills'
import { contacts } from '@/lib/data'
import type { Contact, ContactStage } from '@/lib/types'
import {
  Search, Plus, UserRound, ChevronDown, Check,
  Mic, Sparkles, Trash2, ArrowUpDown, ArrowUp, ArrowDown,
  Download, Upload, FileUp, X,
} from 'lucide-react'
import { AddContactSheet } from '@/components/add-contact-sheet'
import { Card } from '@/components/card'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type Segment = 'tous' | 'prospects' | 'clients' | 'partenaires'
type SortKey = 'name' | 'stade' | 'stage' | 'city' | 'lastInteraction'
type SortDir = 'asc' | 'desc'

const segmentConfig: Record<Segment, { label: string; stages: ContactStage[] }> = {
  tous:        { label: 'Tous',        stages: ['nouveau', 'chaud', 'prospect', 'client', 'partenaire'] },
  prospects:   { label: 'Prospects',   stages: ['nouveau', 'chaud', 'prospect'] },
  clients:     { label: 'Clients',     stages: ['client']                        },
  partenaires: { label: 'Partenaires', stages: ['partenaire']                   },
}

const stageFilters: Record<Segment, { id: string; label: string; stages?: ContactStage[] }[]> = {
  tous:        [{ id: 'tous', label: 'Tous' }],
  prospects: [
    { id: 'tous',     label: 'Tous' },
    { id: 'chaud',    label: 'Chaud',    stages: ['chaud']    },
    { id: 'qualifie', label: 'Qualifié', stages: ['prospect'] },
    { id: 'nouveau',  label: 'Nouveau',  stages: ['nouveau']  },
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
        className="flex items-center gap-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        {label}
        <SortIcon active={active} dir={dir} />
      </button>
    </th>
  )
}

/* ── En-tête filtrable + triable ─────────────────────────────── */
function ThFilter({
  label, sortKey, current, dir, onSort,
  options, value, onChange,
  open, onToggle, containerRef, className,
}: {
  label: string
  sortKey: SortKey
  current: SortKey | null
  dir: SortDir
  onSort: (k: SortKey) => void
  options: { id: string; label: string }[]
  value: string
  onChange: (v: string) => void
  open: boolean
  onToggle: () => void
  containerRef: { current: HTMLDivElement | null }
  className?: string
}) {
  const active = current === sortKey
  return (
    <th className={cn('px-4 py-3 text-left', className)}>
      <div ref={containerRef} className="relative inline-flex items-center gap-2">
        {/* Label cliquable pour le tri */}
        <button
          type="button"
          onClick={() => onSort(sortKey)}
          className={cn(
            'flex items-center gap-3 text-xs font-medium transition-colors',
            active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {label}
          <SortIcon active={active} dir={dir} />
        </button>

        {/* Chevron filtre uniquement */}
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            'flex size-4 items-center justify-center rounded transition-colors',
            value !== 'all' ? 'text-primary' : 'text-muted-foreground/50 hover:text-muted-foreground'
          )}
        >
          <ChevronDown className={cn('size-3 stroke-2 transition-transform', open && 'rotate-180')} />
        </button>

        {/* Dropdown aligné sur le début du wrapper */}
        {open && (
          <div className="absolute left-0 top-full mt-1.5 z-20 min-w-[170px] rounded-xl border border-border bg-surface shadow-lg overflow-hidden py-1">
            {options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChange(opt.id)}
                className={cn(
                  'flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-left transition-colors',
                  value === opt.id ? 'bg-primary/5 text-primary font-medium' : 'text-foreground hover:bg-muted'
                )}
              >
                <span className="flex size-4 shrink-0 items-center justify-center">
                  {value === opt.id && <Check className="size-3.5 stroke-2" />}
                </span>
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </th>
  )
}

/* ── Page principale ─────────────────────────────────────────── */
function ContactsContent() {
  const { current } = useBusiness()
  const router = useRouter()
  const [segment, setSegment]         = useState<Segment>('tous')
  const [stageFilter, setStageFilter] = useState('tous')
  const [query, setQuery]             = useState('')
  const [addOpen, setAddOpen]         = useState(false)
  const [sortKey, setSortKey]         = useState<SortKey | null>(null)
  const [sortDir, setSortDir]         = useState<SortDir>('asc')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [exportImportOpen, setExportImportOpen] = useState(false)
  const exportImportRef = useRef<HTMLDivElement>(null)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [stadeColFilter, setStadeColFilter] = useState('all')
  const [stadeColOpen, setStadeColOpen] = useState(false)
  const stadeColRef = useRef<HTMLDivElement>(null)
  const [tempColFilter, setTempColFilter] = useState('all')
  const [tempColOpen, setTempColOpen] = useState(false)
  const tempColRef = useRef<HTMLDivElement>(null)
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(0)
  const [pageSizeOpen, setPageSizeOpen] = useState(false)
  const pageSizeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false)
      if (exportImportRef.current && !exportImportRef.current.contains(e.target as Node)) setExportImportOpen(false)
      if (stadeColRef.current && !stadeColRef.current.contains(e.target as Node)) setStadeColOpen(false)
      if (tempColRef.current && !tempColRef.current.contains(e.target as Node)) setTempColOpen(false)
      if (pageSizeRef.current && !pageSizeRef.current.contains(e.target as Node)) setPageSizeOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

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
      .filter((c) => stadeColFilter === 'all' || c.stade === stadeColFilter)
      .filter((c) => tempColFilter === 'all' || c.stage === tempColFilter)
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
        else if (sortKey === 'stade')      { va = a.stade ?? ''; vb = b.stade ?? '' }
        else if (sortKey === 'stage')      { va = a.stage; vb = b.stage }
        else if (sortKey === 'city')       { va = a.city ?? ''; vb = b.city ?? '' }
        else if (sortKey === 'lastInteraction') { va = a.lastInteraction ?? ''; vb = b.lastInteraction ?? '' }
        const cmp = va.localeCompare(vb, 'fr')
        return sortDir === 'asc' ? cmp : -cmp
      })
    }

    return result
  }, [segment, stageFilter, query, current.id, sortKey, sortDir, stadeColFilter, tempColFilter])

  const totalPages = Math.max(1, Math.ceil(list.length / pageSize))
  const safePage   = Math.min(page, totalPages - 1)
  const paginated  = list.slice(safePage * pageSize, (safePage + 1) * pageSize)

  useEffect(() => { setPage(0) }, [segment, stageFilter, query, stadeColFilter, tempColFilter, sortKey, sortDir])

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
      <div className="hidden lg:flex flex-col h-[calc(100dvh-56px)] overflow-hidden bg-muted/40 px-8 pt-8 pb-8 gap-4">

        {/* KPI Strip — même pattern que Home */}
        {(() => {
          const all    = contacts.filter((c) => c.businessId === current.id)
          const chauds = all.filter((c) => c.stage === 'chaud').length
          const nouveaux = all.filter((c) => c.stage === 'nouveau').length
          return (
            <div className="grid grid-cols-3 gap-3 shrink-0">
              {[
                { label: 'Total contacts',    value: String(all.length), sub: 'dans ma liste'    },
                { label: 'Contacts chauds',   value: String(chauds),     sub: 'à relancer'       },
                { label: 'Sans qualification', value: String(nouveaux),  sub: 'à qualifier'      },
              ].map((kpi) => (
                <Card key={kpi.label} className="px-4 py-3">
                  <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
                  <p className="text-xl font-bold text-foreground mt-1 tabular-nums">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{kpi.sub}</p>
                </Card>
              ))}
            </div>
          )
        })()}

        {/* Card — même composant que la Home */}
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden rounded-2xl border border-border bg-surface shadow-card">

        {/* Barre unique : search | filtres | export + [+] */}
        <div className="flex items-center gap-3 border-b border-border px-6 py-3 shrink-0">
          {/* Recherche */}
          <div className="relative w-56 shrink-0">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un contact…"
              className="w-full rounded-xl border border-border bg-muted py-2 pl-9 pr-3 text-xs outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring/40"
            />
          </div>

          <div className="h-5 w-px bg-border shrink-0" />

          {/* Segments + dropdown */}
          <div ref={dropdownRef} className="relative flex items-center gap-1">
            {(Object.keys(segmentConfig) as Segment[]).map((seg) => {
              const hasFilters = stageFilters[seg].length > 1
              const activeFilter = segment === seg && hasFilters && stageFilter !== 'tous'
                ? stageFilters[seg].find((f) => f.id === stageFilter)?.label
                : null
              return (
                <button
                  key={seg}
                  type="button"
                  onClick={() => {
                    if (seg !== segment) handleSegmentChange(seg)
                    if (hasFilters) setDropdownOpen(seg === segment ? !dropdownOpen : true)
                  }}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    segment === seg
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {segmentConfig[seg].label}
                  {hasFilters && (
                    <ChevronDown className={cn(
                      'size-3.5 stroke-2 transition-transform',
                      dropdownOpen && segment === seg && 'rotate-180'
                    )} />
                  )}
                </button>
              )
            })}

            {/* Dropdown filtres */}
            {dropdownOpen && filters.length > 1 && (
              <div className="absolute left-0 top-full mt-1.5 z-20 min-w-[160px] rounded-xl border border-border bg-surface shadow-lg overflow-hidden py-1">
                {filters.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => { setStageFilter(f.id); setDropdownOpen(false) }}
                    className={cn(
                      'flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-left transition-colors',
                      stageFilter === f.id
                        ? 'bg-primary/5 text-primary font-medium'
                        : 'text-foreground hover:bg-muted'
                    )}
                  >
                    <span className="flex size-4 shrink-0 items-center justify-center">
                      {stageFilter === f.id && <Check className="size-3.5 stroke-2" />}
                    </span>
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2 shrink-0">
            <div className="h-5 w-px bg-border" />
            {/* Export / Import */}
            <div ref={exportImportRef} className="relative">
              <button
                type="button"
                onClick={() => setExportImportOpen((o) => !o)}
                className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Download className="size-3.5 stroke-[1.5]" />
                Export / Import
                <ChevronDown className={cn('size-3 stroke-2 transition-transform', exportImportOpen && 'rotate-180')} />
              </button>
              {exportImportOpen && (
                <div className="absolute right-0 top-full mt-1.5 z-20 min-w-[200px] rounded-xl border border-border bg-surface shadow-lg overflow-hidden py-1">
                  <button type="button"
                    onClick={() => { setExportImportOpen(false); toast.success('Export CSV en cours…') }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors">
                    <Download className="size-4 stroke-[1.5] shrink-0" />
                    Exporter en CSV
                  </button>
                  <button type="button"
                    onClick={() => { setExportImportOpen(false); setImportModalOpen(true) }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors">
                    <Upload className="size-4 stroke-[1.5] shrink-0" />
                    Importer des contacts
                  </button>
                </div>
              )}
            </div>
            {/* + */}
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              title="Ajouter un contact"
              className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="size-4 stroke-2" />
            </button>
          </div>
        </div>

        {/* Main : table + pagination */}
        <div className="flex flex-col flex-1 overflow-hidden">

          {/* Table — scroll sans barre visible */}
          <div className="flex-1 overflow-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                <thead className="sticky top-0 z-10 bg-surface border-b border-border">
                  <tr>
                    <Th label="Contact"            sortKey="name"            {...thProps} className="min-w-[200px]" />
                    <ThFilter
                      label="Stade" sortKey="stade" {...thProps}
                      options={[
                        { id: 'all', label: 'Tous' },
                        { id: 'invitation', label: 'Invitation' },
                        { id: 'présentation', label: 'Présentation' },
                        { id: 'suivi', label: 'Suivi' },
                        { id: 'closing', label: 'Closing' },
                        { id: 'démarré', label: 'Démarré' },
                      ]}
                      value={stadeColFilter}
                      onChange={(v) => { setStadeColFilter(v); setStadeColOpen(false) }}
                      open={stadeColOpen}
                      onToggle={() => setStadeColOpen((o) => !o)}
                      containerRef={stadeColRef}
                    />
                    <ThFilter
                      label="Température" sortKey="stage" {...thProps}
                      options={[
                        { id: 'all', label: 'Tous' },
                        { id: 'nouveau', label: 'Nouveau' },
                        { id: 'chaud', label: 'Chaud' },
                        { id: 'prospect', label: 'Qualifié' },
                        { id: 'client', label: 'Client' },
                        { id: 'partenaire', label: 'Partenaire' },
                      ]}
                      value={tempColFilter}
                      onChange={(v) => { setTempColFilter(v); setTempColOpen(false) }}
                      open={tempColOpen}
                      onToggle={() => setTempColOpen((o) => !o)}
                      containerRef={tempColRef}
                    />
                    <Th label="Ville"              sortKey="city"            {...thProps} />
                    <Th label="Dernière activité"  sortKey="lastInteraction" {...thProps} />
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => router.push(`/contacts/${c.id}`)}
                      className="border-b border-border cursor-pointer transition-colors hover:bg-muted/40"
                    >
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

                      {/* Stade pipeline */}
                      <td className="px-4 py-3.5">
                        {c.stade ? (
                          <span className={cn(
                            'rounded-full px-2.5 py-0.5 text-xs font-medium',
                            c.stade === 'invitation'   && 'bg-[#3b82f6]/10 text-[#3b82f6]',
                            c.stade === 'présentation' && 'bg-[#f59e0b]/10 text-[#f59e0b]',
                            c.stade === 'suivi'        && 'bg-[#dc2626]/10 text-[#dc2626]',
                            c.stade === 'closing'      && 'bg-[#22c55e]/10 text-[#22c55e]',
                            c.stade === 'démarré'      && 'bg-[#14B8A6]/10 text-[#14B8A6]',
                          )}>
                            {c.stade.charAt(0).toUpperCase() + c.stade.slice(1)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>

                      {/* Température */}
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
                        <div className="flex items-center justify-end gap-0.5">
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
                            onClick={() => toast(`Supprimer ${c.firstName} ${c.lastName} ?`, {
                              description: 'Cette action est irréversible.',
                              action: { label: 'Supprimer', onClick: () => toast.success('Contact supprimé') },
                              cancel: { label: 'Annuler', onClick: () => {} },
                              duration: 7000,
                            })}
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

          {/* Pagination */}
          {list.length > 0 && (
            <div className="flex items-center justify-between border-t border-border px-6 py-3 shrink-0">

              {/* Lignes par page */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div ref={pageSizeRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setPageSizeOpen((o) => !o)}
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    {pageSize}
                    <ChevronDown className={cn('size-3.5 stroke-2 transition-transform', pageSizeOpen && 'rotate-180')} />
                  </button>
                  {pageSizeOpen && (
                    <div className="absolute bottom-full mb-1.5 left-0 z-20 min-w-[80px] rounded-xl border border-border bg-surface shadow-lg overflow-hidden py-1">
                      {[10, 20, 50].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => { setPageSize(n); setPage(0); setPageSizeOpen(false) }}
                          className={cn(
                            'flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors',
                            pageSize === n ? 'bg-primary/5 text-primary font-medium' : 'text-foreground hover:bg-muted'
                          )}
                        >
                          {pageSize === n && <Check className="size-3.5 stroke-2" />}
                          {n}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Navigation pages */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={safePage === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Précédent
                </button>

                {(() => {
                  const pages: (number | '…')[] = []
                  if (totalPages <= 7) {
                    for (let i = 0; i < totalPages; i++) pages.push(i)
                  } else {
                    pages.push(0)
                    if (safePage > 2) pages.push('…')
                    for (let i = Math.max(1, safePage - 1); i <= Math.min(totalPages - 2, safePage + 1); i++) pages.push(i)
                    if (safePage < totalPages - 3) pages.push('…')
                    pages.push(totalPages - 1)
                  }
                  return pages.map((p, i) =>
                    p === '…' ? (
                      <span key={`ellipsis-${i}`} className="px-2 text-sm text-muted-foreground">…</span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPage(p as number)}
                        className={cn(
                          'flex size-8 items-center justify-center rounded-lg text-sm font-medium transition-colors',
                          safePage === p
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-muted'
                        )}
                      >
                        {(p as number) + 1}
                      </button>
                    )
                  )
                })()}

                <button
                  type="button"
                  disabled={safePage === totalPages - 1}
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Suivant
                </button>
              </div>

              {/* Info */}
              <span className="text-xs text-muted-foreground">
                {safePage * pageSize + 1}–{Math.min((safePage + 1) * pageSize, list.length)} sur {list.length}
              </span>
            </div>
          )}
        </div>
        </div>{/* fin card principale */}
      </div>

      <AddContactSheet open={addOpen} onOpenChange={setAddOpen} />

      {/* ══ MODALE IMPORT ════════════════════════════════════════ */}
      {importModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setImportModalOpen(false)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-foreground">Importer des contacts</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Fichier CSV, encodage UTF-8</p>
              </div>
              <button
                type="button"
                onClick={() => { setImportModalOpen(false); setImportFile(null) }}
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="size-4 stroke-2" />
              </button>
            </div>

            {/* Drop zone */}
            <label className="block cursor-pointer">
              <input
                type="file"
                accept=".csv"
                className="sr-only"
                onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
              />
              <div className={cn(
                'flex flex-col items-center gap-3 rounded-xl border-2 border-dashed py-10 transition-colors',
                importFile ? 'border-primary/50 bg-primary/5' : 'border-border bg-muted/40 hover:border-primary/30'
              )}>
                <div className="flex size-10 items-center justify-center rounded-xl bg-muted">
                  <FileUp className="size-5 stroke-[1.5] text-muted-foreground" />
                </div>
                {importFile ? (
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">{importFile.name}</p>
                    <p className="text-xs text-muted-foreground">{(importFile.size / 1024).toFixed(1)} Ko</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">Glisser un fichier ou cliquer</p>
                    <p className="text-xs text-muted-foreground">Format CSV requis</p>
                  </div>
                )}
              </div>
            </label>

            {/* Format info */}
            <div className="mt-3 rounded-xl bg-muted px-4 py-3">
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Colonnes attendues :</p>
              <p className="font-mono text-xs text-muted-foreground leading-relaxed">
                prénom, nom, email, téléphone, ville, source, stage
              </p>
            </div>

            {/* Actions */}
            <div className="mt-4 flex gap-2.5">
              <button
                type="button"
                onClick={() => { setImportModalOpen(false); setImportFile(null) }}
                className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={!importFile}
                onClick={() => {
                  setImportModalOpen(false)
                  setImportFile(null)
                  toast.success("Import lancé — les contacts seront ajoutés sous peu.")
                }}
                className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors"
              >
                Importer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default function ContactsPage() {
  return <ContactsContent />
}
