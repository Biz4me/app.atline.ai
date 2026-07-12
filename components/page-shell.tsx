import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

// L'en-tête UNIQUE de toutes les pages desktop (titre centré discret, façon Vercel).
// Réutilisé par PageShell ET par les pages à layout propre (agents, contacts…) → un seul
// endroit à changer. `actions` = boutons optionnels ancrés à droite (ex. historique Atlas).
export function PageHeader({ title, actions, className }: { title: string; actions?: ReactNode; className?: string }) {
  return (
    <header className={cn('relative flex h-[68px] items-center justify-center', className)}>
      <h1 className="text-base font-semibold text-foreground">{title}</h1>
      {actions && <div className="absolute right-0 flex items-center gap-1">{actions}</div>}
    </header>
  )
}

// LE gabarit desktop unique (maquette validée 12 juil, en-tête « à la Vercel » — option 1) :
// cadre + gouttière constants, en-tête 68px identique partout (titre SEUL, centré, discret),
// 2 largeurs de contenu.
// - Cadre : max-w-6xl centré + px-10 → gouttière gauche/droite identique sur toutes les pages.
// - En-tête : titre centré, sobre (pas de pastille colorée).
// - Contenu : `wide` remplit le cadre (données) · défaut = colonne lecture (max-w-2xl) centrée.
// DESKTOP ONLY — le bloc mobile de chaque page reste à part (lg:hidden).
export function PageShell({
  title, wide = false, actions, children,
}: {
  title: string
  wide?: boolean
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="hidden lg:block">
      <div className="mx-auto w-full max-w-6xl px-10">
        <PageHeader title={title} actions={actions} />
        <div className={cn('pb-10', wide ? 'w-full' : 'mx-auto max-w-2xl')}>
          {children}
        </div>
      </div>
    </div>
  )
}
