'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Users, UserPlus, Radio, Sparkles, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

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

  // Cohérent avec Atlas : le « + » du top bar agent émet `agent:new` → nouvelle campagne.
  useEffect(() => {
    const onNew = () => router.push('/nova/campagne')
    window.addEventListener('agent:new', onNew)
    return () => window.removeEventListener('agent:new', onNew)
  }, [router])

  async function remove(id: string, name: string) {
    if (!window.confirm(`Supprimer la campagne « ${name} » ? Cette action est définitive.`)) return
    setCampaigns((cs) => (cs ? cs.filter((c) => c.id !== id) : cs)) // optimiste
    try {
      const res = await fetch(`/api/nova/campaigns/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Campagne supprimée')
    } catch {
      toast.error('Suppression impossible')
      fetch('/api/nova/campaigns')
        .then((r) => (r.ok ? r.json() : { campaigns: [] }))
        .then((d) => setCampaigns(d.campaigns ?? []))
        .catch(() => {})
    }
  }

  return (
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
          {/* Mobile : création via le « + » du top bar agent. Desktop : bouton in-page (pas de « + » chrome). */}
          <button
            type="button"
            onClick={() => router.push('/nova/campagne')}
            className="hidden lg:flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-white transition-transform active:scale-[0.98]"
            style={{ background: NOVA }}
          >
            <Plus className="size-4" />
            Nouvelle campagne
          </button>
          {campaigns.map((c) => (
            <CampaignCard
              key={c.id}
              campaign={c}
              onEdit={() => router.push(`/nova/campagne?id=${c.id}`)}
              onDelete={() => remove(c.id, c.name)}
            />
          ))}
        </div>
      )}
    </div>
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

function CampaignCard({
  campaign,
  onEdit,
  onDelete,
}: {
  campaign: Campaign
  onEdit: () => void
  onDelete: () => void
}) {
  const [menu, setMenu] = useState(false)
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

        <div className="relative -mr-1 -mt-1 shrink-0">
          <button
            type="button"
            onClick={() => setMenu((v) => !v)}
            aria-label="Options"
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground active:bg-muted"
          >
            <MoreVertical className="size-4.5 stroke-[1.5]" />
          </button>
          {menu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />
              <div className="absolute right-0 top-9 z-50 w-40 overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setMenu(false)
                    onEdit()
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-foreground active:bg-muted"
                >
                  <Pencil className="size-4 text-muted-foreground" />
                  Modifier
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenu(false)
                    onDelete()
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-destructive active:bg-muted"
                >
                  <Trash2 className="size-4" />
                  Supprimer
                </button>
              </div>
            </>
          )}
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
