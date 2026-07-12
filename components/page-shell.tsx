import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

// LE gabarit desktop unique (maquette validée 12 juil) : cadre + gouttière constants,
// en-tête 68px identique partout (pastille + titre), 2 largeurs de contenu.
// - Cadre : max-w-6xl centré + px-10 → gouttière gauche/droite identique sur toutes les pages.
// - En-tête : pastille couleur agent/section + titre Display, même hauteur partout.
// - Contenu : `wide` remplit le cadre (données) · défaut = colonne lecture (max-w-2xl) centrée.
// DESKTOP ONLY — le bloc mobile de chaque page reste à part (lg:hidden).
export function PageShell({
  title, icon: Icon, accent = 'var(--primary)', wide = false, actions, children,
}: {
  title: string
  icon: LucideIcon
  accent?: string
  wide?: boolean
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="hidden lg:block">
      <div className="mx-auto w-full max-w-6xl px-10">
        <header className="flex h-[68px] items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[11px] text-white shadow-sm" style={{ backgroundColor: accent }}>
            <Icon className="size-[18px] stroke-[1.5]" />
          </span>
          <h1 className="flex-1 font-display text-2xl font-bold text-foreground">{title}</h1>
          {actions}
        </header>
        <div className={cn('pb-10', wide ? 'w-full' : 'mx-auto max-w-2xl')}>
          {children}
        </div>
      </div>
    </div>
  )
}
