'use client'

import { useRouter, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

/**
 * Segment de sous-navigation d'une section (mobile). Navigue entre des pages
 * existantes et surligne l'active. Calqué sur la sidebar contextuelle desktop.
 */
export function SectionTabs({ items }: { items: { href: string; label: string }[] }) {
  const router = useRouter()
  const pathname = usePathname()
  // Actif = le href correspondant LE PLUS LONG (gère les chemins imbriqués, ex. /formation vs /formation/library)
  const activeHref = items
    .filter((it) => pathname === it.href || pathname.startsWith(it.href + '/'))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href

  return (
    <div className="grid gap-1 rounded-xl bg-muted p-1" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((it) => {
        const active = it.href === activeHref
        return (
          <button
            key={it.href}
            type="button"
            onClick={() => { if (!active) router.push(it.href) }}
            className={cn(
              'rounded-lg py-2 text-sm font-semibold transition-all',
              active ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground',
            )}
          >
            {it.label}
          </button>
        )
      })}
    </div>
  )
}

export const ECHANGES_TABS = [
  { href: '/messages', label: 'Messages' },
  { href: '/communaute', label: 'Communauté' },
]

export const FORMATION_TABS = [
  { href: '/formation', label: 'Modules' },
  { href: '/formation/library', label: 'Bibliothèque' },
]
