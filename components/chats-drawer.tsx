'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { UserRound, Briefcase, BarChart3, CreditCard, Settings, Moon, Sun, ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

// ═══ NAV MESSAGERIE T6 — le ☰ gère : le tiroir COMPTE, pur ═══
// Profil, activité (switcher multi-MLM), bilan, abonnement, réglages, thème.
// La formation n'y est PAS (elle vit dans le plan, /formation et la recherche).
// Chaque item ouvre une page existante en feuille — zéro nouvelle surface.

type Biz = { id: string; name: string; initials: string; color: string; isActive: boolean }
type Me = { firstName?: string; lastName?: string; email?: string; photoUrl?: string | null }

const ITEMS = [
  { icon: UserRound, label: 'Mon profil', to: '/profile' },
  { icon: Briefcase, label: 'Mon activité', to: '/activities' },
  { icon: BarChart3, label: 'Mon bilan', to: '/home' },
  { icon: CreditCard, label: 'Abonnement', to: '/mon-abonnement' },
  { icon: Settings, label: 'Réglages', to: '/settings' },
]

export function ChatsDrawer({ open, onClose, onBusinessChanged }: { open: boolean; onClose: () => void; onBusinessChanged?: () => void }) {
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const [me, setMe] = useState<Me | null>(null)
  const [bizs, setBizs] = useState<Biz[]>([])
  const [bizOpen, setBizOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    setBizOpen(false)
    fetch('/api/me').then((r) => (r.ok ? r.json() : null)).then((d) => d && setMe(d)).catch(() => {})
    fetch('/api/businesses').then((r) => (r.ok ? r.json() : [])).then((d) => Array.isArray(d) && setBizs(d)).catch(() => {})
  }, [open])

  if (!open) return null
  const active = bizs.find((b) => b.isActive) ?? bizs[0]
  const initials = `${me?.firstName?.[0] ?? ''}${me?.lastName?.[0] ?? ''}`.toUpperCase() || '·'

  const switchBiz = async (id: string) => {
    try {
      await fetch('/api/businesses/active', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
      setBizs((prev) => prev.map((b) => ({ ...b, isActive: b.id === id })))
      setBizOpen(false)
      onBusinessChanged?.() // la liste des conversations recharge (contacts de l'activité active)
    } catch { /* best-effort */ }
  }

  const go = (to: string) => { onClose(); router.push(to) }

  return (
    <>
      <button type="button" aria-label="Fermer" onClick={onClose} className="fixed inset-0 z-[62] bg-black/50" />
      <div className="fixed bottom-0 left-0 top-0 z-[63] flex w-[78%] max-w-xs flex-col border-r border-border bg-surface" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        {/* Identité + activité active (switcher) */}
        <div className="border-b border-border px-4 pb-4 pt-6">
          {me?.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={me.photoUrl} alt="" className="size-14 rounded-full object-cover" />
          ) : (
            <span className="grid size-14 place-items-center rounded-full bg-muted text-lg font-bold text-foreground">{initials}</span>
          )}
          <p className="mt-2.5 text-sm font-bold text-foreground">{[me?.firstName, me?.lastName].filter(Boolean).join(' ') || 'Mon compte'}</p>
          {me?.email && <p className="mt-0.5 truncate text-xs text-muted-foreground">{me.email}</p>}

          {active && (
            <div className="mt-3 overflow-hidden rounded-xl border border-border bg-background">
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
                  <button type="button" onClick={() => go('/activities/new')} className="flex w-full items-center gap-2.5 border-t border-border px-3 py-2.5 text-left text-xs font-medium text-primary active:bg-muted">
                    + Nouvelle activité
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Les entrées compte — chacune ouvre une page existante */}
        <div className="flex flex-1 flex-col pt-2">
          {ITEMS.map((it) => (
            <button key={it.to} type="button" onClick={() => go(it.to)} className="flex items-center gap-3.5 px-5 py-3 text-left text-sm font-medium text-foreground active:bg-muted">
              <it.icon className="size-[18px] shrink-0 stroke-[1.5] text-muted-foreground" /> {it.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="mt-auto mb-6 flex items-center gap-3.5 px-5 py-3 text-left text-sm font-medium text-muted-foreground active:bg-muted"
          >
            {resolvedTheme === 'dark' ? <Sun className="size-[18px] shrink-0 stroke-[1.5]" /> : <Moon className="size-[18px] shrink-0 stroke-[1.5]" />}
            {resolvedTheme === 'dark' ? 'Thème clair' : 'Thème sombre'}
          </button>
        </div>
      </div>
    </>
  )
}
