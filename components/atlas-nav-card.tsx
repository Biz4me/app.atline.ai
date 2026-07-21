'use client'

import { useState } from 'react'
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
  if (!OPEN_ROUTES.some((base) => path === base || path.startsWith(base + '/'))) return null
  // Modèle Telegram : la fiche d'un contact vit désormais dans SON fil (/chats/[id] + rail),
  // plus l'ancienne page pleine /contacts/[id]. On réécrit /contacts/<id> → /chats/<id>?info=1.
  const m = path.match(/^\/contacts\/([^/]+)$/)
  if (m) return `/chats/${m[1]}?info=1`
  return r
}
export const stripOpenMarker = (content: string): string => content.replace(/\s*\[\[OPEN\]\][\s\S]*$/, '')

// Icône selon la destination (préfixe de route).
const ICONS: { prefix: string; icon: LucideIcon }[] = [
  { prefix: '/chats', icon: ContactRound }, // fiche d'un contact réécrite en fil /chats/[id]
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
  const [busy, setBusy] = useState(false)
  // Ouvrir un contact « par son nom » (Atlas ne connaît pas toujours l'id → route /contacts?q=<nom>) :
  // on résout le nom → id et on ouvre SON fil /chats/[id] (+ fiche en rail), plus l'ancienne liste filtrée.
  const go = async () => {
    if (busy) return
    const [base, qs] = route.split('?')
    const q = base === '/contacts' && qs ? new URLSearchParams(qs).get('q') : null
    if (q) {
      setBusy(true)
      try {
        const r = await fetch(`/api/contacts?q=${encodeURIComponent(q)}`)
        const list = r.ok ? await r.json() : null
        const first = Array.isArray(list) && list.length ? list[0] : null
        if (first?.id) { router.push(`/chats/${first.id}?info=1`); return }
      } catch { /* repli sur la route d'origine */ }
      finally { setBusy(false) }
    }
    router.push(route)
  }
  // Plus une carte : un LIEN inline (couleur primaire + flèche) collé sous la phrase d'Atlas.
  // Une carte est réservée à un OBJET (brouillon, plan, confirmation) ; « ouvrir X » = juste un lien.
  return (
    <button
      type="button"
      onClick={go}
      disabled={busy}
      className="inline-flex items-center gap-1 text-sm font-semibold text-foreground transition-opacity active:opacity-60 disabled:opacity-50"
    >
      {label}
      <ArrowUpRight className="size-4 shrink-0 stroke-[1.75]" />
    </button>
  )
}
