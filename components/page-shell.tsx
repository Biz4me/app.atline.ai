import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

// En-tête UNIQUE des SOUS-PAGES (profil, activités, comptes…) : mobile = retour + titre centré ;
// desktop = titre centré discret (68px), retour masqué (la sidebar y est). `action` = bouton à droite.
// Un seul code → toutes les sous-pages ont exactement le même en-tête.
export function SubHeader({ title, onBack, action }: { title: string; onBack?: () => void; action?: ReactNode }) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-center bg-background/90 px-4 py-3 backdrop-blur lg:h-[68px] lg:py-0" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
      {onBack && (
        <button type="button" onClick={onBack} aria-label="Retour" className="lg:hidden absolute left-2 flex size-9 items-center justify-center rounded-full text-foreground active:bg-muted">
          <ChevronLeft className="size-5 stroke-[1.5]" />
        </button>
      )}
      <h1 className="text-lg font-semibold text-foreground lg:text-base">{title}</h1>
      {action && <div className="absolute right-2">{action}</div>}
    </div>
  )
}

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

// AGENTSHELL — LE cadre unique des pages agent (Aria, Nova) : wrapper max-w-3xl centré
// (= largeur du fil d'Atlas) + l'en-tête unique. Un seul composant → zéro duplication du cadre.
// Atlas garde sa structure propre (chat pleine hauteur) mais MÊME largeur + MÊME PageHeader.
export function AgentShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <div className="lg:mx-auto lg:w-full lg:max-w-3xl">
        <div className="hidden lg:block"><PageHeader title={title} /></div>
        {children}
      </div>
    </div>
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
