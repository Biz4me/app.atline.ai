'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, LayoutGrid, UsersRound, Calendar, User, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

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
        <Link
          href="/home"
          aria-label="Accueil Atline"
          className="mb-2 grid size-9 shrink-0 place-items-center rounded-[11px] bg-primary text-sm font-bold text-primary-foreground"
        >
          A
        </Link>
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
