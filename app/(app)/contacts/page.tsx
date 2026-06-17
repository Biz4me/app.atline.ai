'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { BusinessSwitcher } from '@/components/business-switcher'
import { useBusiness } from '@/components/business-provider'
import { DiscAvatar } from '@/components/disc-avatar'
import { StagePill } from '@/components/pills'
import { contacts, discColors } from '@/lib/data'
import type { ContactStage } from '@/lib/types'
import { Search, Plus, Bell, MessageCircle, X } from 'lucide-react'
import { AddContactSheet } from '@/components/add-contact-sheet'
import { cn } from '@/lib/utils'

type Segment = 'prospects' | 'clients' | 'partenaires'

const segmentConfig: Record<Segment, { label: string; stages: ContactStage[] }> = {
  prospects: { label: 'Prospects', stages: ['nouveau', 'chaud', 'prospect'] },
  clients: { label: 'Clients', stages: ['client'] },
  partenaires: { label: 'Partenaires', stages: ['partenaire'] },
}

const stageFilters: Record<Segment, { id: string; label: string; stages?: ContactStage[] }[]> = {
  prospects: [
    { id: 'tous', label: 'Tous' },
    { id: 'chaud', label: 'Chaud', stages: ['chaud'] },
    { id: 'qualifie', label: 'Qualifié', stages: ['prospect'] },
    { id: 'contacte', label: 'Contacté', stages: ['chaud', 'prospect'] },
    { id: 'nouveau', label: 'Nouveau', stages: ['nouveau'] },
  ],
  clients: [{ id: 'tous', label: 'Tous' }],
  partenaires: [{ id: 'tous', label: 'Tous' }],
}

const sourceColors: Record<string, string> = {
  instagram: 'text-[#E1306C]',
  linkedin: 'text-[#0077B5]',
  facebook: 'text-[#1877F2]',
  whatsapp: 'text-[#25D366]',
  recommandation: 'text-success',
  événement: 'text-violet-600',
  evenement: 'text-violet-600',
}

function sourceColor(source: string) {
  const key = source.toLowerCase()
  return sourceColors[key] ?? 'text-muted-foreground'
}

const discInfo = [
  { letter: 'Rouge', color: '#DC2626', bg: 'bg-red-100', text: 'text-red-700', desc: 'Direct' },
  { letter: 'Vert', color: '#22C55E', bg: 'bg-green-100', text: 'text-green-700', desc: 'Relationnel' },
  { letter: 'Bleu', color: '#3B82F6', bg: 'bg-blue-100', text: 'text-blue-700', desc: 'Analytique' },
  { letter: 'Jaune', color: '#F59E0B', bg: 'bg-amber-100', text: 'text-amber-700', desc: 'Enthousiaste' },
]

function ContactsContent() {
  const { current } = useBusiness()
  const [segment, setSegment] = useState<Segment>('prospects')
  const [stageFilter, setStageFilter] = useState('tous')
  const [query, setQuery] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [discDismissed, setDiscDismissed] = useState(false)

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
        query ? `${c.firstName} ${c.lastName}`.toLowerCase().includes(query.toLowerCase()) : true
      )
  }, [segment, stageFilter, query, current.id])

  const filters = stageFilters[segment]

  return (
    <>
      {/* Header V15 */}
      <header
        className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-background/90 px-4 py-3 backdrop-blur"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <BusinessSwitcher />
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          <Link href="/notifications" className="relative flex size-9 items-center justify-center rounded-full text-fg-2 active:bg-muted">
            <Bell className="size-5 stroke-[1.5]" />
            <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-primary ring-2 ring-background" />
          </Link>
          <Link href="/messages" className="relative flex size-9 items-center justify-center rounded-full text-fg-2 active:bg-muted">
            <MessageCircle className="size-5 stroke-[1.5]" />
            <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground ring-2 ring-background">2</span>
          </Link>
        </div>
      </header>

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

        {/* DISC info card dismissable */}
        {!discDismissed && (
          <div className="relative rounded-2xl border border-border bg-surface p-4">
            <button type="button" onClick={() => setDiscDismissed(true)} className="absolute right-3 top-3 text-muted-foreground">
              <X className="size-4" />
            </button>
            <p className="mb-1.5 text-sm font-bold text-foreground">Travaille mieux avec tes contacts</p>
            <p className="mb-3 text-xs text-muted-foreground leading-relaxed">
              Attribue une couleur de personnalité à chaque contact. Aria et Atlas s'en servent pour adapter leur approche.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {discInfo.map((d) => (
                <span key={d.letter} className={cn('flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold', d.bg, d.text)}>
                  {d.letter} · {d.desc}
                </span>
              ))}
            </div>
            <button type="button" className="mt-3 text-xs font-semibold text-primary">
              Comment ça marche →
            </button>
          </div>
        )}

        {/* 3 tabs segments */}
        <div className="grid grid-cols-3 rounded-xl bg-muted p-1 gap-1">
          {(Object.keys(segmentConfig) as Segment[]).map((seg) => (
            <button
              key={seg}
              type="button"
              onClick={() => handleSegmentChange(seg)}
              className={cn(
                'rounded-lg py-2 text-sm font-semibold transition-colors',
                segment === seg ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground'
              )}
            >
              {segmentConfig[seg].label}
            </button>
          ))}
        </div>

        {/* Chips de filtre */}
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
                      <span className={cn('font-semibold', sourceColor(c.source))}>{c.source}</span>
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <StagePill stage={c.stage} />
                    <span className="text-[10px] text-muted-foreground">{c.lastInteraction}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AddContactSheet open={addOpen} onOpenChange={setAddOpen} />
    </>
  )
}

export default function ContactsPage() {
  return <ContactsContent />
}
