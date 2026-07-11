'use client'

import { createPortal } from 'react-dom'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { ChevronDown, Check, Plus, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useOverlay } from '@/components/overlay-provider'
import { useBusiness } from '@/components/business-provider'
import type { Business } from '@/lib/types'
import { DRAWER_SECTIONS, AGENTS } from '@/components/mobile/nav-config'

export function MobileDrawer() {
  const { openId, setOpenId } = useOverlay()
  const { current, all, setCurrent } = useBusiness()
  const pathname = usePathname()
  const router = useRouter()
  const open = openId === 'drawer'
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [bizOpen, setBizOpen] = useState(false)

  // Swipe-to-close : suivi du doigt (horizontal gauche)
  const [drag, setDrag] = useState(0)
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const modeRef = useRef<'?' | 'h' | 'v'>('?')

  // Avatar compte (photo ou initiales) — chargé une fois
  const [account, setAccount] = useState<{ photoUrl: string; initials: string }>({ photoUrl: '', initials: '' })
  useEffect(() => {
    fetch('/api/me').then((r) => (r.ok ? r.json() : null)).then((u) => {
      if (u) setAccount({ photoUrl: u.photoUrl || '', initials: `${(u.firstName || '')[0] ?? ''}${(u.lastName || '')[0] ?? ''}`.toUpperCase() })
    }).catch(() => {})
  }, [])

  // Compteur de notifications non lues — le VRAI chiffre, rafraîchi à chaque ouverture du tiroir
  const [unread, setUnread] = useState(0)
  useEffect(() => {
    if (!open) return
    fetch('/api/notifications').then((r) => (r.ok ? r.json() : null))
      .then((d) => setUnread((d?.notifications ?? []).filter((n: { unread: boolean }) => n.unread).length))
      .catch(() => {})
  }, [open])

  useEffect(() => {
    if (open) {
      setMounted(true)
      const r = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(r)
    }
    if (mounted) {
      setVisible(false)
      setBizOpen(false)
      const t = setTimeout(() => setMounted(false), 300)
      return () => clearTimeout(t)
    }
  }, [open, mounted])

  if (!mounted || typeof window === 'undefined') return null

  const close = () => setOpenId(null)
  const go = (href: string) => { close(); router.push(href) }
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const persist = (id: string) => {
    fetch('/api/businesses/active', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id }) }).catch(() => {})
  }
  // Sélectionner change l'activité active mais garde le menu ouvert (on peut vouloir « Gérer » ensuite)
  const selectBiz = (b: Business) => { setCurrent(b); if (b.id && !b.isAtline) persist(b.id) }
  const gerer = (b: Business) => { setCurrent(b); if (b.id && !b.isAtline) persist(b.id); go('/activities') }

  // ── Swipe ──
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    startRef.current = { x: t.clientX, y: t.clientY }
    modeRef.current = '?'
  }
  const onTouchMove = (e: React.TouchEvent) => {
    if (!startRef.current) return
    const t = e.touches[0]
    const dx = t.clientX - startRef.current.x
    const dy = t.clientY - startRef.current.y
    if (modeRef.current === '?' && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
      modeRef.current = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
    }
    if (modeRef.current === 'h' && dx < 0) setDrag(Math.max(dx, -360))
  }
  const onTouchEnd = () => {
    if (modeRef.current === 'h' && drag < -80) close()
    setDrag(0)
    startRef.current = null
    modeRef.current = '?'
  }

  return createPortal(
    <div className="lg:hidden fixed inset-0 z-[70]">
      <div
        className={cn('absolute inset-0 bg-black/40 transition-opacity duration-300', visible ? 'opacity-100' : 'opacity-0')}
        onClick={close}
      />
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className={cn(
          'absolute inset-y-0 left-0 flex w-[82%] max-w-[320px] flex-col bg-background',
          !drag && 'transition-transform duration-300 ease-out',
          !drag && (visible ? 'translate-x-0' : '-translate-x-full'),
        )}
        style={drag ? { transform: `translateX(${drag}px)`, transition: 'none' } : undefined}
      >
        {/* Switcher MLM — EN HAUT : le contexte se choisit AVANT ce qu'il filtre
            (tout le menu dépend du MLM actif ; le profil, lui, est global → en bas) */}
        <div
          className="flex items-center gap-1 px-3 pb-2"
          style={{ paddingTop: 'max(14px, env(safe-area-inset-top))' }}
        >
          <button type="button" onClick={() => setBizOpen((o) => !o)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
            <span className="grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: current.color }}>
              {current.initials || current.name?.charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1 truncate text-lg font-bold text-foreground">{current.name}</span>
            <ChevronDown className={cn('size-5 shrink-0 text-muted-foreground transition-transform', bizOpen && 'rotate-180')} />
          </button>
          {/* Cloche en HAUT à droite : les notifications sont du contexte, pas de l'identité */}
          <button
            type="button"
            onClick={() => go('/notifications')}
            aria-label="Notifications"
            className="relative flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground active:bg-muted transition-colors"
          >
            <Bell className="size-5 stroke-[1.5]" />
            {unread > 0 && (
              <span className="absolute right-0.5 top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white ring-2 ring-background">{unread > 9 ? '9+' : unread}</span>
            )}
          </button>
        </div>
        {bizOpen && (
          <div className="border-b border-border px-1 pb-2">
            {all.map((b) => {
              const active = current.id === b.id
              return (
                <div key={b.id} className="flex items-center gap-2 rounded-xl px-2 py-1.5">
                  <button type="button" onClick={() => selectBiz(b)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <span
                      className={cn('grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white', active && 'ring-2 ring-offset-2 ring-offset-background')}
                      style={{ backgroundColor: b.color, ...(active ? { ['--tw-ring-color']: b.color } : {}) } as React.CSSProperties}
                    >
                      {b.initials || b.name?.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-base font-medium text-foreground">{b.name}</span>
                    {active && <Check className="size-4 shrink-0 text-foreground" />}
                  </button>
                  {!b.isAtline && (
                    <button type="button" onClick={() => gerer(b)} className="shrink-0 rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground active:bg-muted">
                      Gérer
                    </button>
                  )}
                </div>
              )
            })}
            <button type="button" onClick={() => go('/activities/new')} className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left active:bg-muted">
              <span className="grid size-9 shrink-0 place-items-center rounded-full border-2 border-dashed border-border text-muted-foreground">
                <Plus className="size-5" />
              </span>
              <span className="text-base font-medium text-muted-foreground">Ajouter une activité</span>
            </button>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto no-scrollbar px-2 py-1">
          {DRAWER_SECTIONS.map((item) => {
            const Icon = item.icon
            const act = isActive(item.href)
            return (
              <button
                key={item.href}
                type="button"
                onClick={() => go(item.href)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-lg',
                  act ? 'bg-muted font-semibold text-foreground' : 'text-foreground active:bg-muted',
                )}
              >
                <Icon className={cn('size-5 shrink-0', act ? 'text-foreground' : 'text-muted-foreground')} />
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* Zone du bas — UNE rangée alignée par le bas : avatar (identité) à gauche, pile
            d'agents à droite. Calée sur la ligne du composeur de la page derrière :
            même bas (max(20px, safe-area) + 3.5px) → centres avatar/Atlas/envoyer alignés. */}
        <div
          className="flex items-end justify-between px-3 pt-1"
          style={{ paddingBottom: 'max(23.5px, calc(env(safe-area-inset-bottom) + 3.5px))' }}
        >
          <button
            type="button"
            onClick={() => go('/settings')}
            aria-label="Mon compte"
            className="mb-1 size-9 shrink-0 overflow-hidden rounded-full ring-2 ring-primary/60 active:opacity-90 transition-opacity"
          >
            {account.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={account.photoUrl} alt="" className="size-full object-cover" />
            ) : (
              <span className="grid size-full place-items-center bg-[#3B82F6] text-sm font-medium text-white">{account.initials || 'A'}</span>
            )}
          </button>

          {/* Les 3 agents — rectangles icône + nom, zone du pouce, de bas en haut : Atlas, Aria, Nova */}
          <div className="flex flex-col items-end gap-2">
            {[...AGENTS].reverse().map((a) => {
              const Icon = a.icon
              return (
                <button
                  key={a.href}
                  type="button"
                  onClick={() => go(a.href)}
                  className="flex min-w-[132px] items-center gap-2.5 rounded-xl px-4 py-2.5 transition-all active:translate-y-px active:brightness-95"
                  style={{
                    // Mat et plein, façon bouton primaire Linear : couleur franche, reflet discret, ombre neutre serrée
                    background: `linear-gradient(180deg, rgba(255,255,255,.14), rgba(255,255,255,0) 55%), ${a.color}`,
                    boxShadow: '0 1px 2px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.22)',
                  }}
                >
                  <Icon className="size-5 shrink-0 text-white" />
                  <span className="text-base font-semibold text-white">{a.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
