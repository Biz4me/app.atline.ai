'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft,
  Plus,
  SquarePen,
  Users,
  UserPlus,
  Radio,
  Sparkles,
} from 'lucide-react'

const NOVA = '#8B5CF6'

type Campaign = {
  id: string
  name: string
  goal: 'CLIENTS' | 'PARTENAIRES'
  status: 'BROUILLON' | 'ACTIVE' | 'PAUSE' | 'TERMINEE'
  channels: string[]
  cadence: number
  createdAt: string
  _count?: { leads: number; posts: number }
}

const STATUS: Record<Campaign['status'], { label: string; color: string }> = {
  BROUILLON: { label: 'Brouillon', color: 'var(--muted-foreground)' },
  ACTIVE: { label: 'Active', color: '#22C55E' },
  PAUSE: { label: 'En pause', color: '#F4B342' },
  TERMINEE: { label: 'Terminée', color: 'var(--muted-foreground)' },
}

export default function NovaPage() {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null)

  useEffect(() => {
    fetch('/api/nova/campaigns')
      .then((r) => (r.ok ? r.json() : { campaigns: [] }))
      .then((d) => setCampaigns(d.campaigns ?? []))
      .catch(() => setCampaigns([]))
  }, [])

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center gap-3 bg-background/90 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur lg:px-6 lg:py-0 lg:h-[68px]">
        <button
          type="button"
          onClick={() => router.back()}
          className="-ml-1 flex size-9 items-center justify-center rounded-full text-muted-foreground active:bg-muted lg:hidden"
        >
          <ChevronLeft className="size-5 stroke-[1.5]" />
        </button>
        <span
          className="hidden lg:flex size-9 shrink-0 items-center justify-center rounded-[11px] text-white shadow-sm"
          style={{ backgroundColor: NOVA }}
        >
          <SquarePen className="size-[18px] stroke-[1.5]" />
        </span>
        <h1 className="flex-1 font-display text-lg font-bold text-foreground lg:text-2xl">Nova</h1>
        <button
          type="button"
          onClick={() => router.push('/nova/campagne')}
          aria-label="Nouvelle campagne"
          className="flex size-9 items-center justify-center rounded-full text-muted-foreground active:bg-muted"
        >
          <Plus className="size-5 stroke-[1.5]" />
        </button>
      </header>

      <div className="px-4 pt-4 lg:px-8 lg:pt-6 lg:max-w-3xl lg:mx-auto">
        {campaigns === null ? (
          <div className="flex flex-col gap-3">
            {[0, 1].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <EmptyState onCreate={() => router.push('/nova/campagne')} />
        ) : (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => router.push('/nova/campagne')}
              className="flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white transition-transform active:scale-[0.98]"
              style={{ background: NOVA }}
            >
              <Plus className="size-4" />
              Nouvelle campagne
            </button>
            {campaigns.map((c) => (
              <CampaignCard key={c.id} campaign={c} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center">
      <span
        className="flex size-14 items-center justify-center rounded-2xl"
        style={{ background: `${NOVA}1a`, color: NOVA }}
      >
        <Sparkles className="size-7" />
      </span>
      <div>
        <p className="font-display text-lg font-semibold text-foreground">Lance ta première campagne</p>
        <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
          Nova crée le contenu, capte les curieux et les amène à ta réunion.
        </p>
      </div>
      <button
        type="button"
        onClick={onCreate}
        className="flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white transition-transform active:scale-[0.98]"
        style={{ background: NOVA }}
      >
        <Plus className="size-4" />
        Créer une campagne
      </button>
    </div>
  )
}

function CampaignCard({ campaign }: { campaign: Campaign }) {
  const s = STATUS[campaign.status]
  const GoalIcon = campaign.goal === 'PARTENAIRES' ? UserPlus : Users
  const goalLabel = campaign.goal === 'PARTENAIRES' ? 'Partenaires' : 'Clients'
  const channels = campaign.channels
    .map((c) => (c === 'INSTAGRAM' ? 'Instagram' : c === 'FACEBOOK' ? 'Facebook' : c))
    .join(' · ')
  const leads = campaign._count?.leads ?? 0

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-card">
      <div className="flex items-start gap-3">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: `${NOVA}1a`, color: NOVA }}
        >
          <GoalIcon className="size-5 stroke-[1.5]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-bold text-foreground">{campaign.name}</p>
            <span
              className="flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ background: `${s.color}1a`, color: s.color }}
            >
              <span className="size-1.5 rounded-full" style={{ background: s.color }} />
              {s.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Objectif {goalLabel.toLowerCase()}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-4 border-t border-border pt-3 text-xs text-muted-foreground">
        {channels && (
          <span className="flex items-center gap-1.5">
            <Radio className="size-3.5" style={{ color: NOVA }} />
            {channels}
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <Users className="size-3.5" style={{ color: NOVA }} />
          {leads} lead{leads > 1 ? 's' : ''}
        </span>
        <span className="ml-auto font-semibold">{campaign.cadence}/sem</span>
      </div>
    </div>
  )
}
