'use client'

import { useRouter } from 'next/navigation'
import {
  ArrowUpRight, ContactRound, Briefcase, BookOpen, Calendar, MessageSquare,
  Users, Bell, CreditCard, User, LayoutDashboard, Link2, Mic, SquarePen, type LucideIcon,
} from 'lucide-react'

// Carte « concierge » — Atlas a compris une intention « montre/ouvre X » et propose
// d'y aller en 1 tap, au lieu de naviguer 3-5 clics dans les menus.
// Route + libellé viennent du marqueur invisible [[OPEN]] route | label émis par Atlas.

// Marqueur concierge [[OPEN]] route | libellé : helpers partagés (page Atlas + panneau du composeur).
export const OPEN_MARK = '[[OPEN]]'
export const OPEN_MARK_RE = /\[\[OPEN\]\]\s*([^\n|]+?)\s*\|\s*([^\n]+)/
// Ne jamais suivre une route arbitraire : on n'autorise que les destinations internes connues.
const OPEN_ROUTES = ['/home', '/contacts', '/activities', '/formation', '/agenda', '/messages', '/communaute', '/notifications', '/mon-abonnement', '/profile/edit', '/settings/parrainage', '/aria', '/nova']
export const cleanOpenRoute = (raw: string): string | null => {
  const r = raw.trim()
  if (!r.startsWith('/')) return null
  const path = r.split('?')[0]
  return OPEN_ROUTES.some((base) => path === base || path.startsWith(base + '/')) ? r : null
}
export const stripOpenMarker = (content: string): string => content.replace(/\s*\[\[OPEN\]\][\s\S]*$/, '')

// Icône selon la destination (préfixe de route).
const ICONS: { prefix: string; icon: LucideIcon }[] = [
  { prefix: '/contacts', icon: ContactRound },
  { prefix: '/activities', icon: Briefcase },
  { prefix: '/formation', icon: BookOpen },
  { prefix: '/agenda', icon: Calendar },
  { prefix: '/messages', icon: MessageSquare },
  { prefix: '/communaute', icon: Users },
  { prefix: '/notifications', icon: Bell },
  { prefix: '/mon-abonnement', icon: CreditCard },
  { prefix: '/profile', icon: User },
  { prefix: '/settings/parrainage', icon: Link2 },
  { prefix: '/home', icon: LayoutDashboard },
  { prefix: '/aria', icon: Mic },
  { prefix: '/nova', icon: SquarePen },
]
const iconFor = (route: string): LucideIcon =>
  ICONS.find((i) => route.startsWith(i.prefix))?.icon ?? ArrowUpRight

export function AtlasNavCard({ route, label }: { route: string; label: string }) {
  const router = useRouter()
  const Icon = iconFor(route)
  return (
    <button
      type="button"
      onClick={() => router.push(route)}
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-left transition-transform active:scale-[0.99]"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-5 stroke-[1.5]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-lg font-semibold text-foreground lg:text-sm">{label}</span>
        <span className="block text-xs text-muted-foreground">Ouvrir</span>
      </span>
      <ArrowUpRight className="size-5 shrink-0 text-muted-foreground" />
    </button>
  )
}
