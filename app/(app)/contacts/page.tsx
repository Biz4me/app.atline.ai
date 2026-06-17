'use client'

import { useMemo, useState, Suspense } from 'react'
import Link from 'next/link'
import { AppHeader } from '@/components/app-header'
import { BusinessSwitcher } from '@/components/business-switcher'
import { useBusiness } from '@/components/business-provider'
import { DiscAvatar } from '@/components/disc-avatar'
import { StagePill } from '@/components/pills'
import { contacts } from '@/lib/data'
import type { ContactStage } from '@/lib/types'
import { Search, UserPlus, Users } from 'lucide-react'
import { AddContactSheet } from '@/components/add-contact-sheet'

type Segment = 'prospects' | 'clients' | 'partenaires'

const segmentConfig: Record<Segment, { label: string; stages: ContactStage[] }> = {
  prospects: { label: 'Prospects', stages: ['nouveau', 'chaud', 'prospect'] },
  clients: { label: 'Clients', stages: ['client'] },
  partenaires: { label: 'Partenaires', stages: ['partenaire'] },
}

const stageFilters: Record<Segment, { id: string; label: string; stages?: ContactStage[] }[]> = {
  prospects: [
    { id: 'tous', label: 'Tous' },
    { id: 'chaud', label: 'Chauds', stages: ['chaud'] },
    { id: 'prospect', label: 'Qualifiés', stages: ['prospect'] },
    { id: 'nouveau', label: 'Nouveaux', stages: ['nouveau'] },
  ],
  clients: [{ id: 'tous', label: 'Tous' }],
  partenaires: [{ id: 'tous', label: 'Tous' }],
}

function ContactsContent() {
  const { current } = useBusiness()
  const [segment, setSegment] = useState<Segment>('prospects')
  const [stageFilter, setStageFilter] = useState('tous')
  const [query, setQuery] = useState('')
  const [addOpen, setAddOpen] = useState(false)

  const handleSegmentChange = (seg: Segment) => {
    setSegment(seg)
    setStageFilter('tous')
  }

  const list = useMemo(() => {
    const segStages = segmentConfig[segment].stages
    const filterDef = stageFilters[segment].find((f) => f.id === stageFilter)
    const activeStages = filterDef?.stages ?? segStages
    return contacts
      .filter((c) => c.businessId === current.id)
      .filter((c) => activeStages.includes(c.stage))
      .filter((c) =>
        query
          ? `${c.firstName} ${c.lastName}`.toLowerCase().includes(query.toLowerCase())
          : true,
      )
  }, [segment, stageFilter, query, current.id])

  const filters = stageFilters[segment]

  return (
    <>
      <AppHeader title="Contacts" showNova />

      <div className="flex flex-col gap-4 px-4 pt-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {list.length} contact{list.length > 1 ? 's' : ''}
          </p>
          <BusinessSwitcher />
        </div>

        {/* Barre de recherche */}
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

        {/* 3 tabs segments */}
        <div className="grid grid-cols-3 rounded-xl bg-muted p-1 gap-1">
          {(Object.keys(segmentConfig) as Segment[]).map((seg) => (
            <button
              key={seg}
              type="button"
              onClick={() => handleSegmentChange(seg)}
              className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
                segment === seg
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {segmentConfig[seg].label}
            </button>
          ))}
        </div>

        {/* Chips de filtre (si > 1 option) */}
        {filters.length > 1 && (
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStageFilter(f.id)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                  stageFilter === f.id
                    ? 'bg-primary/10 text-primary'
                    : 'border border-border bg-surface text-fg-2'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {/* Liste ou vide */}
        {list.length === 0 ? (
          <EmptyContacts onAdd={() => setAddOpen(true)} segment={segmentConfig[segment].label} />
        ) : (
          <ul className="flex flex-col gap-2 pb-6">
            {list.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/contacts/${c.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 shadow-card transition-colors active:bg-muted"
                >
                  <DiscAvatar firstName={c.firstName} lastName={c.lastName} disc={c.disc} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-bold text-foreground">
                        {c.firstName} {c.lastName}
                      </p>
                      <StagePill stage={c.stage} />
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {c.source} · {c.lastInteraction}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Floating add button */}
      <button
        type="button"
        onClick={() => setAddOpen(true)}
        aria-label="Ajouter un contact"
        className="fixed bottom-[96px] left-1/2 z-30 inline-flex -translate-x-[calc(50%-150px)] items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-95"
      >
        <UserPlus className="size-4 stroke-2" />
        Ajouter
      </button>

      <AddContactSheet open={addOpen} onOpenChange={setAddOpen} />
    </>
  )
}

function EmptyContacts({ onAdd, segment }: { onAdd: () => void; segment: string }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <Users className="size-7 stroke-[1.5]" />
      </span>
      <div>
        <p className="font-display text-lg font-semibold text-foreground">
          Aucun {segment.toLowerCase()} ici
        </p>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          Ajoute ton premier contact pour que Atlas commence à te coacher.
        </p>
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-transform active:scale-[0.98]"
      >
        <UserPlus className="size-4 stroke-2" />
        Ajouter un contact
      </button>
    </div>
  )
}

export default function ContactsPage() {
  return (
    <Suspense fallback={null}>
      <ContactsContent />
    </Suspense>
  )
}
