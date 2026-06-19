'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { TopBar } from '@/components/top-bar'
import { useBusiness } from '@/components/business-provider'
import { DiscAvatar } from '@/components/disc-avatar'
import { StagePill, DiscBadge } from '@/components/pills'
import { contacts } from '@/lib/data'
import type { Contact, ContactStage } from '@/lib/types'
import {
  Search, Plus, MessageSquare, PhoneCall, CalendarPlus,
  Mic, Phone, Mail, Link2, Clock, UserRound,
} from 'lucide-react'
import { AddContactSheet } from '@/components/add-contact-sheet'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type Segment = 'prospects' | 'clients' | 'partenaires'

const segmentConfig: Record<Segment, { label: string; stages: ContactStage[] }> = {
  prospects:   { label: 'Prospects',  stages: ['nouveau', 'chaud', 'prospect'] },
  clients:     { label: 'Clients',    stages: ['client']                        },
  partenaires: { label: 'Partenaires', stages: ['partenaire']                   },
}

const stageFilters: Record<Segment, { id: string; label: string; stages?: ContactStage[] }[]> = {
  prospects: [
    { id: 'tous',    label: 'Tous' },
    { id: 'chaud',   label: 'Chaud',   stages: ['chaud']    },
    { id: 'qualifie',label: 'Qualifié', stages: ['prospect'] },
    { id: 'nouveau', label: 'Nouveau', stages: ['nouveau']  },
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

/* ── Desktop — panneau contact ───────────────────────────────── */
function DesktopContactPanel({ contact }: { contact: Contact }) {
  const initials = `${contact.firstName[0]}${contact.lastName[0]}`
  const avatarColor = contact.disc ? discHex[contact.disc] : undefined

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Profil */}
      <div className="flex flex-col items-center gap-3 px-6 py-8 border-b border-border">
        <div
          className="flex size-[72px] items-center justify-center rounded-full text-2xl font-bold text-white"
          style={{ backgroundColor: avatarColor ?? 'var(--muted)' }}
        >
          {initials}
        </div>
        <div className="text-center">
          <h2 className="text-base font-bold text-foreground">
            {contact.firstName} {contact.lastName}
          </h2>
          {contact.city && (
            <p className="text-sm text-muted-foreground mt-0.5">{contact.city}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-center">
          {contact.disc && <DiscBadge disc={contact.disc} />}
          <StagePill stage={contact.stage} />
        </div>
      </div>

      {/* 3 actions */}
      <div className="grid grid-cols-3 gap-2 p-4 border-b border-border">
        {([
          { icon: MessageSquare, label: 'Message', href: `/messages/${contact.id}` },
          { icon: PhoneCall,     label: 'Appel',   href: undefined                  },
          { icon: CalendarPlus, label: 'RDV',      href: '/agenda'                  },
        ] as const).map((tile) => {
          const Icon = tile.icon
          const cls = 'flex flex-col items-center gap-1.5 rounded-xl border border-border bg-surface py-3.5 transition-colors hover:bg-muted/50'
          if (tile.href) {
            return (
              <Link key={tile.label} href={tile.href} className={cls}>
                <Icon className="size-[18px] stroke-[1.5] text-primary" />
                <span className="text-xs font-medium text-foreground">{tile.label}</span>
              </Link>
            )
          }
          return (
            <button
              key={tile.label}
              type="button"
              onClick={() => toast.success(`Appel vers ${contact.firstName}`)}
              className={cls}
            >
              <Icon className="size-[18px] stroke-[1.5] text-primary" />
              <span className="text-xs font-medium text-foreground">{tile.label}</span>
            </button>
          )
        })}
      </div>

      {/* Actions IA */}
      <div className="grid grid-cols-2 gap-2 px-4 py-3 border-b border-border">
        <Link
          href={`/aria?contact=${contact.id}`}
          className="flex items-center justify-center gap-2 rounded-xl bg-primary/10 py-2.5 text-sm font-bold text-primary hover:bg-primary/15 transition-colors"
        >
          <Mic className="size-4 stroke-[1.5]" />
          Simuler
        </Link>
        <button
          type="button"
          onClick={() => toast.success("Atlas analyse ce contact…")}
          className="flex items-center justify-center gap-2 rounded-xl bg-primary/10 py-2.5 text-sm font-bold text-primary hover:bg-primary/15 transition-colors"
        >
          <span className="font-display font-bold">A</span>
          Atlas
        </button>
      </div>

      {/* Coordonnées */}
      <div className="flex flex-col divide-y divide-border px-4">
        {contact.phone && (
          <div className="flex items-center gap-3 py-3">
            <Phone className="size-4 shrink-0 stroke-[1.5] text-muted-foreground" />
            <a href={`tel:${contact.phone}`} className="text-sm font-medium text-primary">
              {contact.phone}
            </a>
          </div>
        )}
        {contact.email && (
          <div className="flex items-center gap-3 py-3">
            <Mail className="size-4 shrink-0 stroke-[1.5] text-muted-foreground" />
            <span className="text-sm text-muted-foreground truncate">{contact.email}</span>
          </div>
        )}
        {contact.source && (
          <div className="flex items-center gap-3 py-3">
            <Link2 className="size-4 shrink-0 stroke-[1.5] text-muted-foreground" />
            <span className={cn('text-sm font-medium', sourceColor(contact.source))}>
              {contact.source}
            </span>
          </div>
        )}
        <div className="flex items-center gap-3 py-3">
          <Clock className="size-4 shrink-0 stroke-[1.5] text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Dernier contact ·{' '}
            <span className="font-medium text-foreground">{contact.lastInteraction}</span>
          </span>
        </div>
      </div>

      {/* Note */}
      {contact.notes && (
        <div className="px-4 py-4 border-t border-border">
          <p className="eyebrow mb-2">Note</p>
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">
            {contact.notes}
          </p>
        </div>
      )}

      {/* Lien fiche complète */}
      <div className="mt-auto px-4 py-4 border-t border-border">
        <Link
          href={`/contacts/${contact.id}`}
          className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          Voir la fiche complète →
        </Link>
      </div>
    </div>
  )
}

/* ── Desktop — état vide ─────────────────────────────────────── */
function DesktopEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-muted">
        <UserRound className="size-6 stroke-[1.5] text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">
        Sélectionne un contact pour voir sa fiche
      </p>
    </div>
  )
}

/* ── Page principale ─────────────────────────────────────────── */
function ContactsContent() {
  const { current } = useBusiness()
  const [segment, setSegment]       = useState<Segment>('prospects')
  const [stageFilter, setStageFilter] = useState('tous')
  const [query, setQuery]           = useState('')
  const [addOpen, setAddOpen]       = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const handleSegmentChange = (seg: Segment) => {
    setSegment(seg)
    setStageFilter('tous')
    setSelectedId(null)
  }

  const list = useMemo(() => {
    const segStages  = segmentConfig[segment].stages
    const filterDef  = stageFilters[segment].find((f) => f.id === stageFilter)
    const activeStages = filterDef?.stages ?? segStages
    return contacts
      .filter((c) => c.businessId === current.id)
      .filter((c) => activeStages.includes(c.stage))
      .filter((c) =>
        query
          ? `${c.firstName} ${c.lastName}`.toLowerCase().includes(query.toLowerCase())
          : true
      )
  }, [segment, stageFilter, query, current.id])

  const filters  = stageFilters[segment]
  const selected = list.find((c) => c.id === selectedId) ?? null

  return (
    <>
      {/* ══ MOBILE ══════════════════════════════════════════ */}
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

      {/* ══ DESKTOP ═════════════════════════════════════════ */}
      <div className="hidden lg:flex h-[calc(100dvh-56px)] overflow-hidden">

        {/* Panneau gauche — liste */}
        <div className="flex w-[300px] shrink-0 flex-col border-r border-border overflow-hidden">

          {/* En-tête */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-border">
            <h1 className="text-sm font-bold text-foreground">CRM</h1>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="size-[14px] stroke-[2.5]" />
            </button>
          </div>

          {/* Recherche */}
          <div className="relative px-3 py-2 border-b border-border">
            <Search className="absolute left-6 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher…"
              className="w-full rounded-lg border border-border bg-muted py-2 pl-8 pr-3 text-xs outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring/40"
            />
          </div>

          {/* Segments */}
          <div className="flex border-b border-border">
            {(Object.keys(segmentConfig) as Segment[]).map((seg) => (
              <button
                key={seg}
                type="button"
                onClick={() => handleSegmentChange(seg)}
                className={cn(
                  'flex-1 py-2.5 text-xs font-medium transition-colors border-b-2',
                  segment === seg
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {segmentConfig[seg].label}
              </button>
            ))}
          </div>

          {/* Chips filtres */}
          {filters.length > 1 && (
            <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-3 py-2 border-b border-border">
              {filters.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStageFilter(f.id)}
                  className={cn(
                    'shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition-colors',
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

          {/* Rows */}
          <div className="flex-1 overflow-y-auto">
            {list.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center px-4">
                <p className="text-xs text-muted-foreground">Aucun contact</p>
              </div>
            ) : (
              <ul>
                {list.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(c.id === selectedId ? null : c.id)}
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 border-l-2',
                        selectedId === c.id
                          ? 'bg-primary/5 border-primary'
                          : 'border-transparent'
                      )}
                    >
                      <DiscAvatar
                        firstName={c.firstName}
                        lastName={c.lastName}
                        disc={c.disc}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          {c.firstName} {c.lastName}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {c.city ? `${c.city} · ` : ''}{c.source}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <StagePill stage={c.stage} />
                        <span className="text-[10px] text-muted-foreground">
                          {c.lastInteraction}
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Panneau droit — détail */}
        <div className="flex-1 overflow-hidden">
          {selected
            ? <DesktopContactPanel contact={selected} />
            : <DesktopEmptyState />
          }
        </div>
      </div>

      <AddContactSheet open={addOpen} onOpenChange={setAddOpen} />
    </>
  )
}

export default function ContactsPage() {
  return <ContactsContent />
}
