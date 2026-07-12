'use client'

import { useMemo, useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useBusiness } from '@/components/business-provider'
import { DiscAvatar } from '@/components/disc-avatar'
import { StagePill } from '@/components/pills'
import { SelectMenu } from '@/components/select-menu'
import type { ContactStage, ContactPipelineStage, DiscType } from '@/lib/types'
import {
  Search, Plus, UserRound, ChevronDown, Check,
  Mic, Sparkles, Trash2, ArrowUpDown, ArrowUp, ArrowDown,
  Download, Upload, FileUp, X, Loader2, Users, Flame,
} from 'lucide-react'
import { AddContactSheet } from '@/components/add-contact-sheet'
import { Card } from '@/components/card'
import { KpiCard } from '@/components/kpi-card'
import { PageHeader } from '@/components/page-shell'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type Segment = 'tous' | 'prospects' | 'clients' | 'partenaires'
type SortKey = 'name' | 'stade' | 'stage' | 'city' | 'lastInteraction'
type SortDir = 'asc' | 'desc'

const segmentConfig: Record<Segment, { label: string; stages: ContactStage[] }> = {
  tous:        { label: 'Tous',        stages: ['nouveau', 'closing', 'prospect', 'client', 'partenaire'] },
  prospects:   { label: 'Prospects',   stages: ['nouveau', 'closing', 'prospect'] },
  clients:     { label: 'Clients',     stages: ['client']                        },
  partenaires: { label: 'Partenaires', stages: ['partenaire']                   },
}

// « Tous » n'est plus un onglet : c'est l'état par défaut (aucun segment actif = tout).
// Les onglets sont un toggle → re-cliquer le segment actif revient à « tous ». (desktop)
const SEGMENT_TABS: Segment[] = ['prospects', 'clients', 'partenaires']

// ── 3 déroulants de la liste (mobile) : Segment · Marché · Stade ──────────────
const SEGMENT_OPTS = [
  { value: 'tous', label: 'Tous' }, { value: 'prospects', label: 'Prospects' },
  { value: 'clients', label: 'Clients' }, { value: 'partenaires', label: 'Partenaires' },
]
const MARKET_OPTS = [
  { value: 'all', label: 'Marché' }, { value: 'CHAUD', label: 'Chaud' },
  { value: 'TIEDE', label: 'Tiède' }, { value: 'FROID', label: 'Froid' },
]
const DD_CLS = 'rounded-xl border border-border bg-surface px-3 py-2.5 text-base'
// Stades du tunnel opportunité — adaptés au segment (déroulant 3).
const PROSPECT_STADES = [
  { value: 'NOUVEAU', label: 'Nouveau' }, { value: 'INVITATION', label: 'Invitation' },
  { value: 'PRESENTATION', label: 'Présentation' }, { value: 'SUIVI', label: 'Suivi' }, { value: 'CLOSING', label: 'Closing' },
]
const PARTNER_STADES = [
  { value: 'DEMARRAGE', label: 'Démarrage' }, { value: 'FORMATION', label: 'Formation' },
  { value: 'ACTIF', label: 'Actif' }, { value: 'LEADER', label: 'Leader' },
]
const stadeOptionsFor = (seg: Segment) =>
  seg === 'prospects' ? PROSPECT_STADES
  : seg === 'partenaires' ? PARTNER_STADES
  : seg === 'tous' ? [...PROSPECT_STADES, ...PARTNER_STADES]
  : [] // clients = binaire, pas de stade

// Segment dérivé (double-track) : un contact peut être Client ET en recrutement (prospectStage actif).
const segMatch = (c: UiContact, seg: Segment): boolean => {
  if (seg === 'tous') return true
  if (seg === 'partenaires') return c.isPartner
  if (seg === 'clients') return c.isClient
  if (seg === 'prospects') return !c.isPartner && c.prospectStage != null
  return true
}
// Stade du tunnel opportunité actif (partenaire prioritaire sur prospect).
const oppStageOf = (c: UiContact): string | null => (c.isPartner ? c.partnerStage : c.prospectStage)

const stageFilters: Record<Segment, { id: string; label: string; stages?: ContactStage[] }[]> = {
  tous:        [{ id: 'tous', label: 'Tous' }],
  prospects: [
    { id: 'tous',     label: 'Tous' },
    { id: 'closing',  label: 'Closing',  stages: ['closing']  },
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

/* ── Adaptateur API → forme UI ───────────────────────────────── */
// personality (4 couleurs Big Al) → lettre dont discColors donne la bonne teinte d'avatar
const PERSONALITY_DISC: Record<string, DiscType> = { ROUGE: 'D', JAUNE: 'I', VERT: 'S', BLEU: 'C' }

type ApiContact = {
  id: string; name: string; stage: ContactStage; source: string
  city: string; phone: string; email: string; personality: string | null
  lastContact: string | null; businessId: string
  market: string | null; prospectStage: string | null; partnerStage: string | null
  isClient: boolean; isPartner: boolean
}
type UiContact = {
  id: string; firstName: string; lastName: string
  stage: ContactStage; stade?: ContactPipelineStage; disc: DiscType | null
  source: string; lastInteraction: string; city: string
  phone: string; email: string; businessId: string
  // Double-track : produit (isClient) + opportunité (prospect/partner stage) + marché (proximité).
  market: string | null; prospectStage: string | null; partnerStage: string | null
  isClient: boolean; isPartner: boolean
}

function relTime(iso: string | null): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const h = 3600000, d = 86400000
  if (diff < h) return "À l'instant"
  if (diff < d) return `Il y a ${Math.floor(diff / h)} h`
  if (diff < 7 * d) return `Il y a ${Math.floor(diff / d)} j`
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function adaptContact(c: ApiContact): UiContact {
  const parts = (c.name ?? '').trim().split(/\s+/)
  return {
    id: c.id,
    firstName: parts[0] ?? c.name ?? '',
    lastName: parts.slice(1).join(' '),
    stage: c.stage,
    stade: undefined,
    disc: c.personality ? (PERSONALITY_DISC[c.personality] ?? null) : null,
    source: c.source ?? 'manuel',
    lastInteraction: relTime(c.lastContact),
    city: c.city ?? '',
    phone: c.phone ?? '',
    email: c.email ?? '',
    businessId: c.businessId,
    market: c.market ?? null,
    prospectStage: c.prospectStage ?? null,
    partnerStage: c.partnerStage ?? null,
    isClient: !!c.isClient,
    isPartner: !!c.isPartner,
  }
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
  const [rows, setRows]               = useState<UiContact[]>([])
  const [loading, setLoading]         = useState(true)
  const [segment, setSegment]         = useState<Segment>('tous')
  const [stageFilter, setStageFilter] = useState('tous')
  const [market, setMarket]           = useState('all')   // déroulant 2 (marché/proximité)
  const [stade, setStade]             = useState('all')   // déroulant 3 (stade du tunnel)
  // Deep-link concierge : Atlas peut ouvrir la liste pré-filtrée sur un prénom (/contacts?q=Julien).
  const initialQuery = useSearchParams().get('q') ?? ''
  const [query, setQuery]             = useState(initialQuery)
  const [addOpen, setAddOpen]         = useState(false)
  const [sortKey, setSortKey]         = useState<SortKey | null>(null)
  const [sortDir, setSortDir]         = useState<SortDir>('asc')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [exportImportOpen, setExportImportOpen] = useState(false)
  const exportImportRef = useRef<HTMLDivElement>(null)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importText, setImportText] = useState('')
  const [importCandidates, setImportCandidates] = useState<{ firstName: string; lastName: string; phone: string; email: string; duplicate: boolean; selected: boolean }[] | null>(null)
  const [importBusy, setImportBusy] = useState(false)
  const [reloadTick, setReloadTick] = useState(0)
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

  // Chargement des contacts réels (business actif côté serveur)
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch('/api/contacts')
      .then((r) => (r.ok ? r.json() : []))
      .then((data: ApiContact[]) => {
        if (!cancelled) setRows(Array.isArray(data) ? data.map(adaptContact) : [])
      })
      .catch(() => { if (!cancelled) setRows([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [reloadTick])

  // Handoff depuis le composeur Atlas : un fichier déposé → ouvre l'import pré-rempli
  useEffect(() => {
    const t = sessionStorage.getItem('atline_import_text')
    if (t) { sessionStorage.removeItem('atline_import_text'); setImportText(t); setImportModalOpen(true) }
  }, [])

  const handleSegmentChange = (seg: Segment) => {
    setSegment(seg)
    setStageFilter('tous')
    setStade('all')   // un stade d'un autre tunnel devient invalide → on repart à « tous »
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
    let result = rows
      // 3 déroulants (mobile) — segment dérivé (double-track) · marché · stade du tunnel
      .filter((c) => segMatch(c, segment))
      .filter((c) => market === 'all' || c.market === market)
      .filter((c) => stade === 'all' || oppStageOf(c) === stade)
      // filtres colonnes desktop (défaut 'all'/'tous' → sans effet en mobile)
      .filter((c) => stageFilter === 'tous' || (stageFilters[segment].find((f) => f.id === stageFilter)?.stages ?? []).includes(c.stage))
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
  }, [rows, segment, market, stade, stageFilter, query, sortKey, sortDir, stadeColFilter, tempColFilter])

  const totalPages = Math.max(1, Math.ceil(list.length / pageSize))
  const safePage   = Math.min(page, totalPages - 1)
  const paginated  = list.slice(safePage * pageSize, (safePage + 1) * pageSize)

  useEffect(() => { setPage(0) }, [segment, market, stade, stageFilter, query, stadeColFilter, tempColFilter, sortKey, sortDir])

  const filters = stageFilters[segment]
  const thProps = { current: sortKey, dir: sortDir, onSort: toggleSort }

  function resetImport() { setImportModalOpen(false); setImportText(''); setImportCandidates(null); setImportFile(null) }
  function readCsvFile(file: File) {
    setImportFile(file)
    const reader = new FileReader()
    reader.onload = () => setImportText(String(reader.result ?? ''))
    reader.readAsText(file)
  }
  async function analyzeImport() {
    const text = importText.trim()
    if (!text) { toast.error('Colle une liste ou un CSV'); return }
    setImportBusy(true)
    try {
      const res = await fetch('/api/contacts/import/extract', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) })
      if (!res.ok) { toast.error("Échec de l'analyse"); return }
      const d = await res.json()
      const list = (d.contacts ?? []).map((c: { firstName: string; lastName: string; phone: string; email: string; duplicate: boolean }) => ({ ...c, selected: !c.duplicate }))
      if (list.length === 0) toast.error('Aucun contact détecté')
      setImportCandidates(list)
    } finally { setImportBusy(false) }
  }
  async function commitImport() {
    const sel = (importCandidates ?? []).filter((c) => c.selected)
    if (sel.length === 0) { toast.error('Sélectionne au moins un contact'); return }
    setImportBusy(true)
    try {
      const res = await fetch('/api/contacts/import/commit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contacts: sel }) })
      if (!res.ok) { toast.error("Échec de l'import"); return }
      const d = await res.json()
      toast.success(`${d.created} contact${d.created > 1 ? 's' : ''} importé${d.created > 1 ? 's' : ''}`)
      resetImport(); setReloadTick((t) => t + 1)
    } finally { setImportBusy(false) }
  }

  return (
    <>
      {/* ══ MOBILE ══════════════════════════════════════════════ */}
      <div className="lg:hidden">
        <div className="flex flex-col gap-4 px-4 pt-5">
          {/* Actions (titre géré par la top-bar centrée) */}
          <div className="flex items-center justify-end">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setImportModalOpen(true)}
                title="Importer des contacts"
                className="flex size-10 items-center justify-center rounded-xl border border-border bg-surface text-muted-foreground active:scale-95 transition-transform"
              >
                <Upload className="size-5 stroke-[1.5]" />
              </button>
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 active:scale-95 transition-transform"
              >
                <Plus className="size-5 stroke-2" />
              </button>
            </div>
          </div>

          {/* Recherche */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un contact"
              className="w-full rounded-xl border border-border bg-surface py-3 pl-10 pr-4 text-base outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40"
            />
          </div>

          {/* 3 déroulants indépendants : Segment · Marché · Stade (stade grisé si Clients = binaire) */}
          <div className="grid grid-cols-3 gap-2">
            <SelectMenu className={DD_CLS} value={segment} onChange={(v) => handleSegmentChange(v as Segment)} placeholder="Tous" options={SEGMENT_OPTS} />
            <SelectMenu className={DD_CLS} value={market} onChange={setMarket} placeholder="Marché" options={MARKET_OPTS} />
            {segment === 'clients' ? (
              <div className={`${DD_CLS} flex items-center justify-between opacity-50`}>
                <span className="truncate text-muted-foreground">Stade</span>
                <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
              </div>
            ) : (
              <SelectMenu className={DD_CLS} value={stade} onChange={setStade} placeholder="Stade" options={[{ value: 'all', label: 'Stade' }, ...stadeOptionsFor(segment)]} />
            )}
          </div>

          {/* Liste */}
          {!loading && list.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center">
              <p className="text-lg text-muted-foreground">Aucun contact ici</p>
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-base font-bold text-primary-foreground"
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
                      <p className="text-lg font-bold text-foreground">
                        {c.firstName} {c.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">
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
      {/* Gabarit unique : cadre max-w-6xl + gouttière px-10 + en-tête 68px centré (page pleine hauteur) */}
      <div className="hidden lg:flex mx-auto w-full max-w-6xl flex-col h-dvh overflow-hidden px-10 pb-8 gap-4">

        <div className="shrink-0"><PageHeader title="Contacts" /></div>

        {/* KPI Strip — composant KpiCard partagé (identique au tableau de bord) */}
        {(() => {
          const all    = rows
          const closings = all.filter((c) => c.stage === 'closing').length
          const nouveaux = all.filter((c) => c.stage === 'nouveau').length
          return (
            <div className="grid grid-cols-3 gap-3 shrink-0">
              <KpiCard icon={Users} label="Total contacts" value={all.length} sub="dans ma liste" />
              <KpiCard icon={Flame} label="En closing" value={closings} sub="à relancer" />
              <KpiCard icon={Sparkles} label="Sans qualification" value={nouveaux} sub="à qualifier" />
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
            {SEGMENT_TABS.map((seg) => {
              const hasFilters = stageFilters[seg].length > 1
              const activeFilter = segment === seg && hasFilters && stageFilter !== 'tous'
                ? stageFilters[seg].find((f) => f.id === stageFilter)?.label
                : null
              return (
                <button
                  key={seg}
                  type="button"
                  onClick={() => {
                    if (seg === segment) {
                      // re-clic sur l'actif → retour à « tous »
                      handleSegmentChange('tous')
                      setDropdownOpen(false)
                    } else {
                      handleSegmentChange(seg)
                      setDropdownOpen(hasFilters)
                    }
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
            {!loading && list.length === 0 ? (
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
                        { id: 'closing', label: 'Closing' },
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
                            c.stade === 'présentation' && 'bg-[#f4b342]/10 text-[#f4b342]',
                            c.stade === 'suivi'        && 'bg-[#ef4444]/10 text-[#ef4444]',
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
                            title="Simuler avec Aria"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={resetImport}>
          <div className="relative flex max-h-[88dvh] w-full max-w-md flex-col rounded-2xl border border-border bg-surface p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-foreground">Importer des contacts</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Atlas extrait et dédoublonne — colle une liste ou un CSV</p>
              </div>
              <button type="button" onClick={resetImport} className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"><X className="size-4 stroke-2" /></button>
            </div>

            {importCandidates === null ? (
              <>
                <textarea value={importText} onChange={(e) => setImportText(e.target.value)} rows={6}
                  placeholder="Colle ta liste : noms, téléphones, emails… (ou le contenu d'un CSV)"
                  className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground" />
                <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-primary">
                  <input type="file" accept=".csv,.txt" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) readCsvFile(f) }} />
                  <FileUp className="size-3.5" /> …ou charger un fichier CSV / TXT
                </label>
                <div className="mt-4 flex gap-2.5">
                  <button type="button" onClick={resetImport} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted">Annuler</button>
                  <button type="button" disabled={importBusy || !importText.trim()} onClick={analyzeImport}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-40">
                    {importBusy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Analyser avec Atlas
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span><span className="font-bold text-foreground">{importCandidates.filter((c) => c.selected).length}</span> sélectionné(s)</span>
                  <span>{importCandidates.filter((c) => c.duplicate).length} doublon(s) détecté(s)</span>
                </div>
                <div className="-mx-1 flex-1 space-y-1.5 overflow-y-auto px-1">
                  {importCandidates.map((c, i) => (
                    <button type="button" key={i} onClick={() => setImportCandidates((list) => (list ?? []).map((x, j) => (j === i ? { ...x, selected: !x.selected } : x)))}
                      className={cn('flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left', c.selected ? 'border-primary/40 bg-primary/5' : 'border-border bg-background')}>
                      <span className={cn('flex size-5 shrink-0 items-center justify-center rounded-md border', c.selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border')}>{c.selected && <Check className="size-3.5" />}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{`${c.firstName} ${c.lastName}`.trim() || 'Sans nom'}{c.duplicate && <span className="ml-2 rounded bg-[#F4B342]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#F4B342]">doublon</span>}</p>
                        <p className="truncate text-xs text-muted-foreground">{[c.phone, c.email].filter(Boolean).join(' · ') || '—'}</p>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="mt-4 flex gap-2.5">
                  <button type="button" onClick={() => setImportCandidates(null)} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted">Retour</button>
                  <button type="button" disabled={importBusy} onClick={commitImport}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-40">
                    {importBusy && <Loader2 className="size-4 animate-spin" />} Importer {importCandidates.filter((c) => c.selected).length}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default function ContactsPage() {
  return <ContactsContent />
}
