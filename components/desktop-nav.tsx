'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  ChevronDown, ChevronLeft, ChevronRight, Check, Plus, Bell, X,
  User, CreditCard, Moon, Sun, Settings, KeyRound, Link2, Lock, Briefcase, Users, HelpCircle, MessageSquare, LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { signOut } from 'next-auth/react'
import { useTheme } from 'next-themes'
import { useBusiness } from '@/components/business-provider'
import type { Business } from '@/lib/types'
import { DRAWER_SECTIONS, AGENTS } from '@/components/mobile/nav-config'

// Menu compte — s'ouvre SUR la sidebar, à sa largeur (décision Patrice, façon ChatGPT).
const ACCT_ITEMS: { icon: typeof User; label: string; href: string }[][] = [
  [
    { icon: User, label: 'Mon profil', href: '/profile/edit' },
    { icon: CreditCard, label: 'Mon abonnement', href: '/mon-abonnement' },
  ],
  [
    { icon: Settings, label: 'Préférences', href: '/settings/preferences' },
    { icon: Bell, label: 'Notifications', href: '/settings/notifications' },
    { icon: KeyRound, label: 'Connexion & sécurité', href: '/settings/securite' },
    { icon: Link2, label: 'Comptes liés', href: '/settings/comptes-lies' },
    { icon: Lock, label: 'Confidentialité', href: '/settings/confidentialite' },
  ],
  [
    { icon: Briefcase, label: 'Mes activités MLM', href: '/activities' },
    { icon: Users, label: 'Parrainage', href: '/settings/parrainage' },
  ],
  [
    { icon: HelpCircle, label: "Centre d'aide", href: '/settings/centre-aide' },
    { icon: MessageSquare, label: 'Contact et remarques', href: '/settings/contact' },
  ],
]

// LA sidebar desktop = le tiroir mobile ÉPINGLÉ (même contenu, même ordre, même source
// nav-config) : contexte en haut (activité + cloche), pages, agents zone basse, avatar.
// Remplace l'ancien trio top bar + rail + sidebar 2 (navigation à 2 étages supprimée).

export function DesktopNav({ hidden = false, onToggle }: { hidden?: boolean; onToggle?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const { current, all, setCurrent } = useBusiness()
  const [bizOpen, setBizOpen] = useState(false)
  const [acctOpen, setAcctOpen] = useState(false)
  const { theme, setTheme } = useTheme()

  const [account, setAccount] = useState<{ photoUrl: string; initials: string; name: string }>({ photoUrl: '', initials: '', name: '' })
  useEffect(() => {
    fetch('/api/me').then((r) => (r.ok ? r.json() : null)).then((u) => {
      if (u) setAccount({
        photoUrl: u.photoUrl || '',
        initials: `${(u.firstName || '')[0] ?? ''}${(u.lastName || '')[0] ?? ''}`.toUpperCase(),
        name: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim(),
      })
    }).catch(() => {})
  }, [])

  // Le menu compte RESTE ouvert pendant qu'on navigue dans les sous-pages du profil
  // (fermeture seulement via la croix ou un clic dans le contenu).

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

      {/* Les 3 agents — rectangles mats ALIGNÉS À GAUCHE comme la nav (la « zone du pouce »
          est un concept mobile : à la souris, on suit la colonne). Bas → haut : Atlas, Aria, Nova. */}
      <div className="flex flex-col gap-2 px-3 pb-3">
        {[...AGENTS].reverse().map((a) => {
          const Icon = a.icon
          return (
            <button
              key={a.href}
              type="button"
              onClick={() => router.push(a.href)}
              className="flex w-full items-center gap-2.5 rounded-xl px-4 py-2 transition-all active:translate-y-px hover:brightness-105"
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

      {/* Identité — l'avatar (→ Mon compte) + repli de la sidebar (plus de chevron flottant) */}
      <div className="flex items-center px-3 pb-4 pt-1">
        <button
          type="button"
          onClick={() => setAcctOpen((o) => !o)}
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
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            title="Masquer la navigation"
            className="ml-auto flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
          >
            <ChevronLeft className="size-4" />
          </button>
        )}
      </div>

      {/* Menu compte — panneau qui MONTE depuis le bas (ne masque pas le haut de la sidebar),
          reste ouvert pendant la navigation ; ferme via croix ou clic dans le contenu (backdrop). */}
      {acctOpen && (
        <>
          <div className="fixed inset-0 left-[260px] z-[35]" onClick={() => setAcctOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 z-40 flex max-h-[calc(100%-96px)] flex-col rounded-t-2xl border-t border-border bg-background shadow-[0_-8px_24px_rgba(0,0,0,.12)]">
          <div className="flex items-center gap-3 border-b border-border px-3 py-3">
            <span className="size-9 shrink-0 overflow-hidden rounded-full">
              {account.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={account.photoUrl} alt="" className="size-full object-cover" />
              ) : (
                <span className="grid size-full place-items-center bg-[#3B82F6] text-sm font-medium text-white">{account.initials || 'A'}</span>
              )}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">{account.name || 'Mon compte'}</span>
            <button type="button" onClick={() => setAcctOpen(false)} aria-label="Fermer" className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
              <X className="size-4" />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto no-scrollbar px-2 py-2">
            {ACCT_ITEMS.map((group, gi) => (
              <div key={gi} className={cn(gi > 0 && 'mt-2 border-t border-border pt-2')}>
                {group.map(({ icon: Icon, label, href }) => (
                  <button
                    key={href}
                    type="button"
                    onClick={() => router.push(href)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                  >
                    <Icon className="size-[18px] shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate">{label}</span>
                    <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                  </button>
                ))}
              </div>
            ))}
            <div className="mt-2 border-t border-border pt-2">
              <button
                type="button"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
              >
                {theme === 'dark' ? <Sun className="size-[18px] shrink-0 text-muted-foreground" /> : <Moon className="size-[18px] shrink-0 text-muted-foreground" />}
                <span className="flex-1">{theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}</span>
              </button>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: '/auth' })}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-destructive hover:bg-muted"
              >
                <LogOut className="size-[18px] shrink-0" />
                Déconnexion
              </button>
            </div>
          </nav>
          </div>
        </>
      )}
    </aside>
  )
}
