'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { X, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { HomeContent } from '@/app/(app)/home/home-content'
import { Summary } from '@/app/(app)/mon-abonnement/page'
import { AccountBody } from '@/app/(app)/settings/page'
import ProfileEditPage from '@/app/(app)/profile/edit/page'
import ActivitiesPage from '@/app/(app)/activities/page'

// ═══ MON COMPTE — « ta fiche » : le look des fiches (header + onglets), mais DESTINATION (centre), pas rail ═══
// Consolide 5 pages (bilan, profil, activité, abonnement, réglages) en UNE page à onglets. Chaque onglet
// rend le composant de contenu DÉJÀ existant (zéro réécriture). Entrée : l'avatar (PH) du tiroir.

type Biz = { id: string; name: string; initials: string; color: string; isActive: boolean }
type Me = { firstName?: string; lastName?: string; email?: string; photoUrl?: string | null }

const TABS = [
  ['apercu', 'Aperçu'],
  ['profil', 'Profil'],
  ['activite', 'Activité'],
  ['abonnement', 'Abonnement'],
  ['reglages', 'Réglages'],
] as const
type TabId = (typeof TABS)[number][0]

export default function ComptePage() {
  const router = useRouter()
  const sp = useSearchParams()
  const [tab, setTab] = useState<TabId>(() => {
    const t = sp.get('tab')
    return (TABS.some(([id]) => id === t) ? t : 'apercu') as TabId
  })
  const [me, setMe] = useState<Me | null>(null)
  const [bizs, setBizs] = useState<Biz[]>([])
  const [bizOpen, setBizOpen] = useState(false)

  useEffect(() => {
    fetch('/api/me').then((r) => (r.ok ? r.json() : null)).then((d) => d && setMe(d)).catch(() => {})
    fetch('/api/businesses').then((r) => (r.ok ? r.json() : [])).then((d) => Array.isArray(d) && setBizs(d)).catch(() => {})
  }, [])

  const active = bizs.find((b) => b.isActive) ?? bizs[0]
  const initials = `${me?.firstName?.[0] ?? ''}${me?.lastName?.[0] ?? ''}`.toUpperCase() || '·'
  const goTab = (t: TabId) => { setTab(t); router.replace(`/compte?tab=${t}`, { scroll: false }) }
  const switchBiz = async (id: string) => {
    try {
      await fetch('/api/businesses/active', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
      setBizs((prev) => prev.map((b) => ({ ...b, isActive: b.id === id })))
      setBizOpen(false)
      router.refresh()
    } catch { /* best-effort */ }
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* Topbar — croix pour fermer, titre centré (même format que la fiche contact) */}
      <div className="sticky top-0 z-30 flex items-center gap-2 bg-background/90 px-4 py-3 backdrop-blur" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
        <button type="button" onClick={() => router.push('/chats')} aria-label="Fermer" className="-ml-1 flex size-9 items-center justify-center rounded-full text-muted-foreground active:bg-muted"><X className="size-5 stroke-[1.5]" /></button>
        <h1 className="flex-1 text-center text-lg font-semibold text-foreground">Mon compte</h1>
        <span className="size-9 shrink-0" aria-hidden />
      </div>

      {/* Identité + activité active (switcher) — l'en-tête de TA fiche */}
      <div className="flex flex-col items-center gap-2 px-4 pb-3 pt-2">
        {me?.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={me.photoUrl} alt="" className="size-20 rounded-full object-cover" />
        ) : (
          <span className="grid size-20 place-items-center rounded-full bg-muted text-2xl font-bold text-foreground">{initials}</span>
        )}
        <p className="text-lg font-semibold text-foreground">{[me?.firstName, me?.lastName].filter(Boolean).join(' ') || 'Mon compte'}</p>
        {me?.email && <p className="-mt-1 truncate text-xs text-muted-foreground">{me.email}</p>}
        {active && (
          <div className="mt-1 w-full max-w-xs overflow-hidden rounded-xl border border-border bg-surface">
            <button type="button" onClick={() => setBizOpen((o) => !o)} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left">
              <span className="grid size-7 shrink-0 place-items-center rounded-lg text-[10px] font-extrabold text-white" style={{ backgroundColor: active.color }}>{active.initials}</span>
              <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">{active.name}</span>
              {bizs.length > 1 && <ChevronDown className={cn('size-3.5 shrink-0 text-muted-foreground transition-transform', bizOpen && 'rotate-180')} />}
            </button>
            {bizOpen && bizs.length > 1 && (
              <div className="border-t border-border">
                {bizs.filter((b) => !b.isActive).map((b) => (
                  <button key={b.id} type="button" onClick={() => switchBiz(b.id)} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left active:bg-muted">
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg text-[10px] font-extrabold text-white" style={{ backgroundColor: b.color }}>{b.initials}</span>
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">{b.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Onglets horizontaux (même nav soulignée que la fiche) — scrollables sur mobile */}
      <div className="sticky top-[48px] z-20 flex overflow-x-auto border-y border-border bg-background no-scrollbar">
        {TABS.map(([tid, label]) => (
          <button key={tid} type="button" onClick={() => goTab(tid)} className={cn('shrink-0 whitespace-nowrap px-4 py-3 text-sm transition-colors', tab === tid ? 'border-b-2 border-primary font-medium text-primary' : 'text-muted-foreground active:bg-muted')}>{label}</button>
        ))}
      </div>

      {/* Contenu — chaque onglet rend le composant DÉJÀ existant */}
      <div className="pb-24 pt-3">
        {tab === 'apercu' && <HomeContent mantra="" />}
        {tab === 'profil' && <ProfileEditPage />}
        {tab === 'activite' && <ActivitiesPage />}
        {tab === 'abonnement' && <div className="px-4"><Summary /></div>}
        {tab === 'reglages' && <div className="space-y-5 px-4"><AccountBody compact /></div>}
      </div>
    </div>
  )
}
