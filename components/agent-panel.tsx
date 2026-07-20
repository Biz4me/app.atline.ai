'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { X, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

// ═══ Panneau d'agent (rail droit, façon fiche contact) ═══
// Même format d'accueil que la fiche : croix, avatar size-20 + nom + rôle, action principale, cartes.
// Le rail SYNTHÉTISE et RENVOIE vers les surfaces existantes (profil, cockpit, simulateur) — il ne re-saisit rien.
// « app dans l'app » : le fil = l'action, le rail = le contexte + les réglages de cet agent.

type AgentId = 'atlas' | 'aria' | 'nova'

const AGENTS: Record<AgentId, { name: string; role: string; color: string; cta: { label: string; href: string } }> = {
  atlas: { name: 'Atlas', role: 'Ton coach, chaque jour', color: '#F97316', cta: { label: 'Modifier mon profil', href: '/profile' } },
  aria: { name: 'Aria', role: "Ton simulateur d'appels", color: '#14B8A6', cta: { label: 'Nouvelle simulation', href: '/aria' } },
  nova: { name: 'Nova', role: 'Ta community manager', color: '#8B5CF6', cta: { label: 'Ouvrir le cockpit', href: '/nova' } },
}

const DISC: Record<string, { l: string; hex: string }> = {
  ROUGE: { l: 'Rouge', hex: '#EF4444' }, VERT: { l: 'Vert', hex: '#22C55E' },
  BLEU: { l: 'Bleu', hex: '#3B82F6' }, JAUNE: { l: 'Jaune', hex: '#F4B342' },
}
const PLATFORM: Record<string, string> = {
  INSTAGRAM: 'Instagram', TIKTOK: 'TikTok', FACEBOOK: 'Facebook', LINKEDIN: 'LinkedIn', YOUTUBE: 'YouTube', TWITTER: 'X',
}

// — Petits blocs partagés (charte fiche : cartes sans ombre) —
function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <p className="border-b border-border px-4 py-2.5 text-sm font-semibold text-foreground">{title}</p>
      {children}
    </div>
  )
}
function Row({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-2.5 text-sm">
      <span className="shrink-0 text-muted-foreground">{k}</span>
      <span className="min-w-0 text-right font-medium text-foreground">{children}</span>
    </div>
  )
}
function Empty({ text }: { text: string }) {
  return <p className="px-4 py-3 text-sm leading-relaxed text-muted-foreground">{text}</p>
}
function Stats({ items, color }: { items: { n: string | number; l: string }[]; color: string }) {
  return (
    <div className="grid grid-cols-3 divide-x divide-border">
      {items.map((s, i) => (
        <div key={i} className="flex flex-col items-center gap-0.5 py-3">
          <span className="text-2xl font-bold" style={{ color }}>{s.n}</span>
          <span className="text-xs text-muted-foreground">{s.l}</span>
        </div>
      ))}
    </div>
  )
}

// — Contenus par agent —
type Me = { personality?: string | null }
type Activity = { mlmName?: string; goal?: string; produit?: string; story?: string } | null
function AtlasCards({ me, activity }: { me: Me | null; activity: Activity }) {
  const disc = me?.personality ? DISC[me.personality] : null
  const rows = [
    disc && { k: 'Ta couleur', v: <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{ backgroundColor: disc.hex }} />{disc.l}</span> },
    activity?.goal && { k: 'Ton objectif', v: activity.goal },
    activity?.produit && { k: 'Produit phare', v: activity.produit },
    activity?.mlmName && { k: 'Ton activité', v: activity.mlmName },
  ].filter(Boolean) as { k: string; v: ReactNode }[]
  return (
    <>
      <Card title="Ce qu'Atlas sait de toi">
        {rows.length ? (
          <div className="divide-y divide-border">{rows.map((r) => <Row key={r.k} k={r.k}>{r.v}</Row>)}</div>
        ) : (
          <Empty text="Complète ton profil pour qu'Atlas te coache mieux (ta couleur, ton objectif, ton activité)." />
        )}
      </Card>
      {activity?.story && (
        <Card title="Ton pourquoi"><p className="px-4 py-3 text-sm leading-relaxed text-foreground">{activity.story}</p></Card>
      )}
    </>
  )
}

type Sim = { characterId: string; score: number | null }
function AriaCards({ sessions }: { sessions: Sim[] }) {
  const scored = sessions.filter((s) => typeof s.score === 'number')
  const avg = scored.length ? Math.round(scored.reduce((a, s) => a + (s.score ?? 0), 0) / scored.length) : null
  const last = sessions[sessions.length - 1]
  if (!sessions.length) {
    return <Card title="Ton entraînement"><Empty text="Tu n'as pas encore simulé d'appel. Lance ta première simulation pour t'entraîner sans risque." /></Card>
  }
  return (
    <Card title="Ton entraînement">
      <Stats color="#14B8A6" items={[
        { n: sessions.length, l: sessions.length > 1 ? 'simulations' : 'simulation' },
        { n: avg ?? '—', l: 'score moyen' },
        { n: last?.score ?? '—', l: 'dernier' },
      ]} />
      {last && (
        <div className="border-t border-border px-4 py-2.5 text-sm">
          <span className="text-muted-foreground">Dernière : </span>
          <span className="font-medium capitalize text-foreground">{last.characterId.replace(/_/g, ' ')}</span>
        </div>
      )}
    </Card>
  )
}

type Post = { platform: string; status: string }
function NovaCards({ posts }: { posts: Post[] }) {
  const drafts = posts.filter((p) => p.status === 'BROUILLON').length
  const pub = posts.filter((p) => p.status === 'PUBLIE').length
  const platforms = [...new Set(posts.map((p) => p.platform))]
  if (!posts.length) {
    return <Card title="Ton contenu"><Empty text="Nova n'a pas encore préparé de contenu. Ouvre le cockpit pour lancer tes premières idées." /></Card>
  }
  return (
    <Card title="Ton contenu">
      <Stats color="#8B5CF6" items={[
        { n: posts.length, l: posts.length > 1 ? 'contenus' : 'contenu' },
        { n: drafts, l: drafts > 1 ? 'brouillons' : 'brouillon' },
        { n: pub, l: pub > 1 ? 'publiés' : 'publié' },
      ]} />
      {platforms.length > 0 && (
        <div className="border-t border-border px-4 py-2.5 text-sm">
          <span className="text-muted-foreground">Plateformes : </span>
          <span className="font-medium text-foreground">{platforms.map((p) => PLATFORM[p] ?? p).join(' · ')}</span>
        </div>
      )}
    </Card>
  )
}

export function AgentPanel({ agent, onClose }: { agent: AgentId; onClose: () => void }) {
  const router = useRouter()
  const a = AGENTS[agent]
  const [d, setD] = useState<{ me?: Me | null; activity?: Activity; sessions?: Sim[]; posts?: Post[] } | null>(null)

  useEffect(() => {
    let off = false
    ;(async () => {
      try {
        if (agent === 'atlas') {
          const [rm, ra] = await Promise.all([fetch('/api/me'), fetch('/api/activities/active')])
          const me = rm.ok ? await rm.json() : null
          const activity = ra.ok ? (await ra.json())?.activity ?? null : null
          if (!off) setD({ me, activity })
        } else if (agent === 'aria') {
          const r = await fetch('/api/aria/sessions')
          if (!off) setD({ sessions: r.ok ? await r.json() : [] })
        } else {
          const r = await fetch('/api/nova/content')
          if (!off) setD({ posts: r.ok ? await r.json() : [] })
        }
      } catch { if (!off) setD({}) }
    })()
    return () => { off = true }
  }, [agent])

  return (
    <div className="flex w-full flex-col bg-background">
      {/* Topbar — croix à gauche, nom centré (même format que la fiche contact) */}
      <div className="sticky top-0 z-30 flex items-center gap-2 bg-background/90 px-4 py-3 backdrop-blur" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
        <button type="button" onClick={onClose} aria-label="Fermer" className="-ml-1 flex size-9 items-center justify-center rounded-full text-muted-foreground active:bg-muted"><X className="size-5 stroke-[1.5]" /></button>
        <h1 className="flex-1 text-center text-lg font-semibold text-foreground">{a.name}</h1>
        <span className="size-9 shrink-0" aria-hidden />
      </div>

      {/* Accueil identité — avatar size-20 + nom + rôle */}
      <div className="flex flex-col items-center gap-2.5 px-4 pb-2 pt-2">
        <div className="grid size-20 place-items-center overflow-hidden rounded-full" style={{ backgroundColor: a.color }}>
          <img src={`/avatars/${agent}.png`} alt="" className="size-full object-cover" />
        </div>
        <p className="text-lg font-semibold text-foreground">{a.name}</p>
        <p className="text-xs text-muted-foreground">{a.role}</p>
      </div>

      {/* Action principale — le verbe de l'agent, renvoie vers sa surface complète */}
      <div className="px-4 pb-3 pt-1">
        <button type="button" onClick={() => router.push(a.cta.href)} className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold text-white transition-transform active:scale-[0.98]" style={{ backgroundColor: a.color }}>
          {a.cta.label}<ChevronRight className="size-4 stroke-[2]" />
        </button>
      </div>

      {/* Cartes — synthèse par agent */}
      <div className="flex flex-col gap-3 px-4 pb-10 pt-1">
        {d === null ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Chargement…</p>
        ) : agent === 'atlas' ? (
          <AtlasCards me={d.me ?? null} activity={d.activity ?? null} />
        ) : agent === 'aria' ? (
          <AriaCards sessions={d.sessions ?? []} />
        ) : (
          <NovaCards posts={d.posts ?? []} />
        )}
      </div>
    </div>
  )
}
