'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Sparkles, MoreVertical, Pencil, Trash2, ChevronDown, ChevronRight, AtSign } from 'lucide-react'
import { AgentShell } from '@/components/page-shell'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const NOVA = '#8B5CF6'

type Campaign = {
  id: string
  name: string
  goal: 'CLIENTS' | 'PARTENAIRES'
  status: 'BROUILLON' | 'ACTIVE' | 'PAUSE' | 'TERMINEE'
  channels: string[]
  cadence: number
  createdAt: string
  stats?: { posts: number; leads: number; inscrits: number; convertis: number }
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
    const onNew = () => router.push('/nova/campagne?fresh=1')
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
    <AgentShell title="Nova">
      <div className="px-4 pt-4 lg:px-0">
      {/* Accès compte (niveau user) : ce qu'il faut mettre sur ses réseaux */}
      <button
        type="button"
        onClick={() => router.push('/nova/comptes')}
        className="mb-3 flex w-full items-center gap-3 rounded-2xl border border-border bg-surface p-3.5 shadow-card transition-colors active:bg-muted"
      >
        <span className="flex size-9 items-center justify-center rounded-xl" style={{ background: `${NOVA}1a`, color: NOVA }}>
          <AtSign className="size-[18px] stroke-[1.5]" />
        </span>
        <span className="flex-1 text-left">
          <span className="block text-lg lg:text-sm font-bold text-foreground">Mes comptes</span>
          <span className="block text-xs text-muted-foreground">Prépare ton Instagram et ton TikTok</span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </button>

      {campaigns === null ? null : campaigns.length === 0 ? (
        <EmptyState onCreate={() => router.push('/nova/campagne?fresh=1')} />
      ) : (
        <div className="flex flex-col gap-3">
          {/* Mobile : création via le « + » du top bar agent. Desktop : bouton in-page (pas de « + » chrome). */}
          <button
            type="button"
            onClick={() => router.push('/nova/campagne?fresh=1')}
            className="hidden lg:flex items-center justify-center gap-2 rounded-2xl py-3 text-lg lg:text-sm font-bold text-white transition-transform active:scale-[0.98]"
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
    </AgentShell>
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
        <p className="mx-auto mt-1 max-w-xs text-lg lg:text-sm text-muted-foreground">
          Nova crée le contenu, capte les curieux et les amène à ta réunion.
        </p>
      </div>
      <button
        type="button"
        onClick={onCreate}
        className="flex items-center gap-2 rounded-xl px-5 py-3 text-lg lg:text-sm font-bold text-white transition-transform active:scale-[0.98]"
        style={{ background: NOVA }}
      >
        <Plus className="size-4" />
        Créer une campagne
      </button>
    </div>
  )
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2)
  const ini = parts.map((w) => w[0]).join('').toUpperCase()
  return ini || 'C'
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
  const [open, setOpen] = useState(false)
  const s = STATUS[campaign.status]
  const st = campaign.stats ?? { posts: 0, leads: 0, inscrits: 0, convertis: 0 }

  // Contenus de la campagne (chargés à la première ouverture) → on affiche les vidéos
  const [posts, setPosts] = useState<{ id: string; format: string; mediaUrl: string | null }[] | null>(null)
  useEffect(() => {
    if (!open || posts !== null) return
    fetch(`/api/nova/campaigns/${campaign.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setPosts(d?.posts ?? []))
      .catch(() => setPosts([]))
  }, [open, posts, campaign.id])
  const videos = (posts ?? []).filter((p) => p.mediaUrl)
  const roleLabel = (f: string) => (f === 'Attirer' ? 'Publication' : f === 'Nourrir' ? 'Nourrir' : 'Invitation')

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
      <div className="flex items-center gap-3 p-4">
        {/* Avatar = initiales du nom de la campagne */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-xl text-lg lg:text-sm font-bold text-white"
            style={{ background: NOVA }}
          >
            {initialsOf(campaign.name)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="truncate text-lg lg:text-sm font-bold text-foreground">{campaign.name}</span>
              <span
                className="flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{ background: `${s.color}1a`, color: s.color }}
              >
                <span className="size-1.5 rounded-full" style={{ background: s.color }} />
                {s.label}
              </span>
            </span>
          </span>
          <ChevronDown
            className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
          />
        </button>

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenu((v) => !v)}
            aria-label="Options"
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground active:bg-muted"
          >
            <MoreVertical className="size-[18px] stroke-[1.5]" />
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
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-lg lg:text-sm text-foreground active:bg-muted"
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
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-lg lg:text-sm text-destructive active:bg-muted"
                >
                  <Trash2 className="size-4" />
                  Supprimer
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {open && (
        <div className="border-t border-border px-4 pb-4 pt-3">
          <p className="eyebrow mb-2">Résultats</p>
          <div className="grid grid-cols-4 gap-2">
            <Kpi value={st.posts} label="Publications" />
            <Kpi value={st.leads} label="Leads" />
            <Kpi value={st.inscrits} label="Inscrits" />
            <Kpi value={st.convertis} label="Convertis" />
          </div>

          {videos.length > 0 && (
            <>
              <p className="eyebrow mb-2 mt-4">Mes vidéos</p>
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                {videos.map((v) => (
                  <div key={v.id} className="flex shrink-0 flex-col gap-1">
                    <video
                      src={`/api/nova/content/${v.id}/video`}
                      controls
                      playsInline
                      preload="metadata"
                      className="aspect-[9/16] h-44 rounded-xl bg-black object-cover"
                    />
                    <span className="text-center text-[10px] font-semibold text-muted-foreground">{roleLabel(v.format)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function Kpi({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-xl bg-muted/60 py-3">
      <span className="text-lg font-bold" style={{ color: NOVA }}>
        {value}
      </span>
      <span className="text-center text-[10px] font-semibold text-muted-foreground">{label}</span>
    </div>
  )
}
