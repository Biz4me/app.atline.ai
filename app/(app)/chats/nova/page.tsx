'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Rocket, ArrowUpRight } from 'lucide-react'

// ═══ NAV MESSAGERIE T8 — le fil Nova : la vitrine de ses livrables ═══
// Nova propose, tu décides. V1 honnête : ses VRAIS posts (ContentPost) en cartes,
// le cockpit en feuille pour agir. Les ronds « Publier / Ajuster / Autre idée »
// arriveront AVEC le moteur (n8n) — pas de bouton factice d'ici là.

type Post = {
  id: string; caption: string; platform: string; status: string
  format: string | null; createdAt: string; campaignId: string | null
}

const NOVA = '#8B5CF6'
const PLATFORM_LABEL: Record<string, string> = {
  INSTAGRAM: 'Instagram', TIKTOK: 'TikTok', FACEBOOK: 'Facebook', LINKEDIN: 'LinkedIn', YOUTUBE: 'YouTube', TWITTER: 'X',
}
const STATUS_LABEL: Record<string, string> = {
  BROUILLON: 'brouillon', PLANIFIE: 'planifié', PUBLIE: 'publié', ARCHIVE: 'archivé',
}

export default function NovaThreadPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/nova/content')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => Array.isArray(d) && setPosts(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="mx-auto flex h-dvh w-full max-w-2xl flex-col bg-background">
      {/* En-tête Nova */}
      <div className="flex shrink-0 items-center gap-2.5 border-b border-border bg-background/90 px-3 py-2 backdrop-blur" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}>
        <button type="button" aria-label="Retour" onClick={() => router.push('/chats')} className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground active:bg-muted">
          <ChevronLeft className="size-5 stroke-[1.5]" />
        </button>
        <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full text-sm font-bold text-white" style={{ backgroundColor: NOVA }}><img src="/avatars/nova.png" alt="" className="size-full rounded-full object-cover" /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-foreground">Nova</span>
          <span className="block text-xs text-muted-foreground">ta community manager · réseaux sociaux</span>
        </span>
      </div>

      {/* Ses livrables */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-3">
        {loading && <p className="py-6 text-center text-sm text-muted-foreground">Chargement…</p>}
        {!loading && posts.length === 0 && (
          <div className="rounded-2xl bg-surface px-4 py-3 text-sm leading-relaxed text-foreground">
            Ici, je te présenterai mes idées et tes posts prêts à publier — tu décideras d'un tap.
            Pour l'instant, tout se crée dans mon cockpit : campagnes, contenus, tendances. On y va ?
          </div>
        )}
        <div className="flex flex-col gap-3">
          {posts.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => router.push('/nova')}
              className="overflow-hidden rounded-2xl border border-border bg-surface text-left active:bg-muted"
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                <p className="text-sm font-semibold text-foreground">{PLATFORM_LABEL[p.platform] ?? p.platform}{p.format ? ` · ${p.format}` : ''}</p>
                <p className="shrink-0 pl-2 text-[10px] text-muted-foreground">
                  <span className="rounded-full px-2 py-0.5 font-medium" style={{ backgroundColor: 'rgba(139,92,246,.12)', color: NOVA }}>{STATUS_LABEL[p.status] ?? p.status.toLowerCase()}</span>
                  {' '}{new Date(p.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </p>
              </div>
              <p className="px-4 py-3 text-sm leading-relaxed text-foreground [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:4] overflow-hidden">{p.caption}</p>
              <p className="flex items-center gap-1 px-4 pb-3 text-xs font-semibold" style={{ color: NOVA }}>
                Ouvrir dans le cockpit <ArrowUpRight className="size-3.5" />
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Le geste : le cockpit (campagnes, création, tendances) */}
      <div className="shrink-0 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2">
        <button
          type="button"
          onClick={() => router.push('/nova')}
          className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-base font-semibold text-white transition-transform active:scale-[0.98]"
          style={{ backgroundColor: NOVA }}
        >
          <Rocket className="size-5 stroke-[1.5]" /> Ouvrir le cockpit Nova
        </button>
      </div>
    </div>
  )
}
