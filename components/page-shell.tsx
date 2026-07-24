import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

// ═══ GABARIT DE PAGE UNIQUE (refonte cohérence) ═══
// Un seul patron d'en-tête : titre À GAUCHE + zone d'action à droite (fini les titres centrés
// « façon Linear » qui juraient avec l'Accueil). Titre et contenu partagent le MÊME bord gauche,
// largeur de colonne constante. Changer ici = changer PARTOUT (18 pages).

// En-tête des SOUS-PAGES (mobile + desktop) : retour (mobile) + titre à gauche + action à droite.
export function SubHeader({ title, onBack, action }: { title: string; onBack?: () => void; action?: ReactNode }) {
  return (
    <div
      className="sticky top-0 z-10 flex items-center gap-2 bg-background/90 px-4 py-3 backdrop-blur lg:h-[68px] lg:py-0"
      style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
    >
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label="Retour"
          className="lg:hidden -ml-2 flex size-9 shrink-0 items-center justify-center rounded-full text-foreground active:bg-muted"
        >
          <ChevronLeft className="size-5 stroke-[1.5]" />
        </button>
      )}
      <h1 className="min-w-0 flex-1 truncate text-lg font-bold text-foreground">{title}</h1>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

// En-tête desktop des pages : titre À GAUCHE + actions à droite (même hauteur partout).
export function PageHeader({ title, actions, className }: { title: string; actions?: ReactNode; className?: string }) {
  return (
    <header className={cn('flex h-[72px] items-center justify-between gap-3', className)}>
      <h1 className="truncate text-2xl font-bold text-foreground">{title}</h1>
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </header>
  )
}

// AGENTSHELL — cadre unique des pages agent (Aria, Nova) : colonne (= largeur du fil Atlas) + en-tête gauche.
export function AgentShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <div className="lg:mx-auto lg:w-full lg:max-w-3xl lg:px-1">
        <div className="hidden lg:block"><PageHeader title={title} /></div>
        {children}
      </div>
    </div>
  )
}

// LE gabarit desktop unique : colonne à largeur constante, titre à GAUCHE en tête, contenu dessous
// (titre et contenu = MÊME bord gauche). `wide` = colonne large (tableaux/données) ; défaut = lecture.
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
      <div className={cn('mx-auto w-full px-8', wide ? 'max-w-6xl' : 'max-w-3xl')}>
        <PageHeader title={title} actions={actions} />
        <div className="pb-10">{children}</div>
      </div>
    </div>
  )
}
