'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ChevronDown, Check, Plus, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBusiness } from '@/components/business-provider'
import type { Business } from '@/lib/types'
import { DRAWER_SECTIONS, AGENTS } from '@/components/mobile/nav-config'

// LA sidebar desktop = le tiroir mobile ÉPINGLÉ (même contenu, même ordre, même source
// nav-config) : contexte en haut (activité + cloche), pages, agents zone basse, avatar.
// Remplace l'ancien trio top bar + rail + sidebar 2 (navigation à 2 étages supprimée).

export function DesktopNav({ hidden = false }: { hidden?: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const { current, all, setCurrent } = useBusiness()
  const [bizOpen, setBizOpen] = useState(false)

  const [account, setAccount] = useState<{ photoUrl: string; initials: string }>({ photoUrl: '', initials: '' })
  useEffect(() => {
    fetch('/api/me').then((r) => (r.ok ? r.json() : null)).then((u) => {
      if (u) setAccount({ photoUrl: u.photoUrl || '', initials: `${(u.firstName || '')[0] ?? ''}${(u.lastName || '')[0] ?? ''}`.toUpperCase() })
    }).catch(() => {})
  }, [])

  // Vraies notifications non lues — rafraîchies à chaque navigation
  const [unread, setUnread] = useState(0)
  useEffect(() => {
    fetch('/api/notifications').then((r) => (r.ok ? r.json() : null))
      .then((d) => setUnread((d?.notifications ?? []).filter((n: { unread: boolean }) => n.unread).length))
      .catch(() => {})
  }, [pathname])

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')
  const persist = (id: string) => {
    fetch('/api/businesses/active', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id }) }).catch(() => {})
  }
  const selectBiz = (b: Business) => { setCurrent(b); if (b.id && !b.isAtline) persist(b.id) }
  const gerer = (b: Business) => { selectBiz(b); setBizOpen(false); router.push('/activities') }

  return (
    <aside
      style={{ transform: hidden ? 'translateX(-100%)' : 'translateX(0)' }}
      className="hidden lg:flex fixed left-0 top-0 z-40 h-dvh w-[260px] flex-col border-r border-border bg-background transition-transform duration-200 ease-out"
    >
      {/* Contexte — l'activité MLM en cours (tap = liste) + la cloche */}
      <div className="flex items-center gap-1 px-3 pb-2 pt-4">
        <button type="button" onClick={() => setBizOpen((o) => !o)} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1 py-1 text-left hover:bg-muted">
          <span className="grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: current.color }}>
            {current.initials || current.name?.charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">{current.name}</span>
          <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform', bizOpen && 'rotate-180')} />
        </button>
        <button
          type="button"
          onClick={() => router.push('/notifications')}
          aria-label="Notifications"
          className="relative flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
        >
          <Bell className="size-5 stroke-[1.5]" />
          {unread > 0 && (
            <span className="absolute right-0.5 top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white ring-2 ring-background">{unread > 9 ? '9+' : unread}</span>
          )}
        </button>
      </div>
      {bizOpen && (
        <div className="border-b border-border px-2 pb-2">
          {all.map((b) => {
            const active = current.id === b.id
            return (
              <div key={b.id} className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-muted">
                <button type="button" onClick={() => selectBiz(b)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <span
                    className={cn('grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white', active && 'ring-2 ring-offset-2 ring-offset-background')}
                    style={{ backgroundColor: b.color, ...(active ? { ['--tw-ring-color']: b.color } : {}) } as React.CSSProperties}
                  >
                    {b.initials || b.name?.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{b.name}</span>
                  {active && <Check className="size-4 shrink-0 text-foreground" />}
                </button>
                {!b.isAtline && (
                  <button type="button" onClick={() => gerer(b)} className="shrink-0 rounded-full border border-border px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted">
                    Gérer
                  </button>
                )}
              </div>
            )
          })}
          <button type="button" onClick={() => { setBizOpen(false); router.push('/activities/new') }} className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-muted">
            <span className="grid size-8 shrink-0 place-items-center rounded-full border-2 border-dashed border-border text-muted-foreground">
              <Plus className="size-4" />
            </span>
            <span className="text-sm font-medium text-muted-foreground">Ajouter une activité</span>
          </button>
        </div>
      )}

      {/* Pages */}
      <nav className="flex-1 overflow-y-auto no-scrollbar px-2 py-1">
        {DRAWER_SECTIONS.map((item) => {
          const Icon = item.icon
          const act = isActive(item.href)
          return (
            <button
              key={item.href}
              type="button"
              onClick={() => router.push(item.href)}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm',
                act ? 'bg-muted font-semibold text-foreground' : 'text-foreground hover:bg-muted',
              )}
            >
              <Icon className={cn('size-[18px] shrink-0', act ? 'text-foreground' : 'text-muted-foreground')} />
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Les 3 agents — mêmes rectangles mats que le tiroir, de bas en haut : Atlas, Aria, Nova */}
      <div className="flex flex-col items-end gap-2 px-3 pb-3">
        {[...AGENTS].reverse().map((a) => {
          const Icon = a.icon
          return (
            <button
              key={a.href}
              type="button"
              onClick={() => router.push(a.href)}
              className="flex min-w-[124px] items-center gap-2.5 rounded-xl px-4 py-2 transition-all active:translate-y-px hover:brightness-105"
              style={{
                background: `linear-gradient(180deg, rgba(255,255,255,.14), rgba(255,255,255,0) 55%), ${a.color}`,
                boxShadow: '0 1px 2px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.22)',
              }}
            >
              <Icon className="size-[18px] shrink-0 text-white" />
              <span className="text-sm font-semibold text-white">{a.label}</span>
            </button>
          )
        })}
      </div>

      {/* Identité — l'avatar seul (→ Mon compte) */}
      <div className="flex items-center px-3 pb-4 pt-1">
        <button
          type="button"
          onClick={() => router.push('/settings')}
          aria-label="Mon compte"
          className="size-9 shrink-0 overflow-hidden rounded-full ring-2 ring-primary/60 transition-opacity hover:opacity-90"
        >
          {account.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={account.photoUrl} alt="" className="size-full object-cover" />
          ) : (
            <span className="grid size-full place-items-center bg-[#3B82F6] text-sm font-medium text-white">{account.initials || 'A'}</span>
          )}
        </button>
      </div>
    </aside>
  )
}
