'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, LayoutGrid, UsersRound, Calendar, User, Check, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBusiness } from '@/components/business-provider'
import type { Business } from '@/lib/types'

// ═══ NAV PRIMAIRE — LE composant unique (refonte nav, tranche 1) ═══
// UNE seule source de destinations → rendue en RAIL vertical fin (desktop, ~76px, tout à gauche)
// ET en BOTTOM BAR (mobile). Mêmes données, même composant : zéro logique dupliquée.
// « Mon compte » = pied du rail (desktop) ; sur mobile il vit sous l'avatar (hors de cette barre).
// Règle : la barre s'efface dans un fil (géré par le shell, pas ici).

type NavItem = { key: string; label: string; href: string; icon: LucideIcon; match: string[] }

// Config déclarative — l'ordre ici = l'ordre à l'écran (rail de haut en bas / bar de gauche à droite).
const NAV: NavItem[] = [
  { key: 'accueil', label: 'Accueil', href: '/home', icon: Home, match: ['/home', '/atlas'] },
  { key: 'espaces', label: 'Espaces', href: '/chats', icon: LayoutGrid, match: ['/chats', '/contacts'] },
  { key: 'communaute', label: 'Communauté', href: '/communaute', icon: UsersRound, match: ['/communaute'] },
  { key: 'agenda', label: 'Agenda', href: '/agenda', icon: Calendar, match: ['/agenda'] },
]

// « Mon compte » regroupe tout le méta (profil, activité, abonnement, réglages).
const ACCOUNT_MATCH = ['/compte', '/profile', '/settings', '/abonnement', '/mon-abonnement', '/activities']

// `immersive` : dans un fil ou une page plein écran, la bottom bar mobile s'efface
// (le composeur + le retour règnent). Le rail desktop, lui, reste toujours visible.
export function PrimaryNav({ immersive = false }: { immersive?: boolean }) {
  const pathname = usePathname()
  const hits = (m: string[]) => m.some((p) => pathname === p || pathname.startsWith(p + '/'))
  const accountActive = hits(ACCOUNT_MATCH)

  return (
    <>
      {/* DESKTOP — rail fin vertical, épinglé à gauche, présent partout */}
      <aside className="hidden lg:flex fixed left-0 top-0 z-40 h-dvh w-[76px] flex-col items-center border-r border-border bg-background py-3">
        <RailSwitcher />
        <nav className="flex w-full flex-1 flex-col items-center gap-0.5 pt-1">
          {NAV.map((it) => (
            <RailItem key={it.key} item={it} active={hits(it.match)} />
          ))}
        </nav>
        <Link
          href="/compte"
          aria-label="Mon compte"
          className="flex w-full flex-col items-center gap-1 pt-1 text-2xs"
        >
          <span
            className={cn(
              'grid size-8 place-items-center rounded-full border transition-colors',
              accountActive ? 'border-primary text-primary' : 'border-border text-muted-foreground',
            )}
          >
            <User className="size-4 stroke-[1.75]" />
          </span>
          <span className={cn('leading-none', accountActive ? 'font-semibold text-primary' : 'text-muted-foreground')}>
            Compte
          </span>
        </Link>
      </aside>

      {/* MOBILE — bottom bar (mêmes destinations). Le compte est sous l'avatar, pas ici.
          Masquée sur un fil / page immersive. */}
      {!immersive && (
        <nav
          className="lg:hidden fixed inset-x-0 bottom-0 z-[47] flex border-t border-border bg-surface/95 backdrop-blur-md"
          style={{ height: 'calc(62px + env(safe-area-inset-bottom))', paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {NAV.map((it) => (
            <BarItem key={it.key} item={it} active={hits(it.match)} />
          ))}
        </nav>
      )}
    </>
  )
}

// Item du rail desktop : pastille arrondie teintée quand actif (charte du composeur), label micro dessous.
function RailItem({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon
  return (
    <Link href={item.href} aria-label={item.label} className="flex w-full flex-col items-center gap-1 py-1.5 text-2xs">
      <span
        className={cn(
          'flex h-8 w-12 items-center justify-center rounded-[11px] transition-colors',
          active ? 'bg-primary/10 text-primary' : 'text-muted-foreground',
        )}
      >
        <Icon className="size-[22px] stroke-[1.75]" />
      </span>
      <span className={cn('leading-none', active ? 'font-semibold text-primary' : 'text-muted-foreground')}>
        {item.label}
      </span>
    </Link>
  )
}

// Item de la bottom bar mobile : icône + label, actif en orange.
function BarItem({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      aria-label={item.label}
      className="flex flex-1 flex-col items-center justify-center gap-1 text-2xs"
    >
      <Icon className={cn('size-[23px] stroke-[1.75]', active ? 'text-primary' : 'text-muted-foreground')} />
      <span className={cn('leading-none', active ? 'font-semibold text-primary' : 'text-muted-foreground')}>
        {item.label}
      </span>
    </Link>
  )
}

// Switcher MLM au sommet du rail (desktop) : avatar de l'activité active + popover pour changer.
// Sur mobile, le switcher vit dans /compte (sous l'avatar), pas ici.
function RailSwitcher() {
  const { current, all, setCurrent } = useBusiness()
  const [open, setOpen] = useState(false)
  const switchTo = (b: Business) => {
    setCurrent(b)
    if (b.id && !b.isAtline) {
      fetch('/api/businesses/active', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: b.id }) }).catch(() => {})
    }
    setOpen(false)
  }
  return (
    <div className="relative mb-2 shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Changer d'activité"
        title={current.name}
        className="grid size-9 place-items-center rounded-[11px] text-sm font-bold text-white transition-transform active:scale-95"
        style={{ background: current.color }}
      >
        {current.initials || current.name[0]}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[55]" onClick={() => setOpen(false)} />
          <div className="absolute left-full top-0 z-[56] ml-2 w-56 overflow-hidden rounded-2xl border border-border bg-surface py-1 shadow-[0_16px_40px_rgba(0,0,0,.18)]">
            <p className="px-3 pb-1 pt-2 text-2xs font-bold uppercase tracking-widest text-muted-foreground">Mon activité</p>
            {all.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => switchTo(b)}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-muted active:bg-muted"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-lg text-2xs font-bold text-white" style={{ background: b.color }}>{b.initials || b.name[0]}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{b.name}</span>
                {current.id === b.id && <Check className="size-4 shrink-0 text-primary" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
