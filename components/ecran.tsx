import type { ReactNode } from 'react'
import { PageHeader } from '@/components/page-shell'
import { cn } from '@/lib/utils'

/**
 * ÉCRAN — le gabarit qui manquait, celui qui sert mobile ET desktop.
 *
 * ⚠️ Le piège qui m'a eu le 31 juillet 2026 : `PageShell` est enveloppé dans
 * `hidden lg:block`. C'est le gabarit DESKTOP de l'app, et les pages
 * historiques ont chacune leur propre markup mobile à côté. Une page neuve qui
 * n'utilise que PageShell est donc parfaitement vide sur un téléphone — ce que
 * Patrice a constaté immédiatement sur « Convertir ».
 *
 * Ici les enfants sont rendus UNE SEULE FOIS, dans un conteneur responsive.
 * Seuls les en-têtes diffèrent. On évite ainsi le double arbre React, qui
 * dédoublerait l'état des champs de saisie et les appels réseau des enfants.
 *
 * La règle maison « deux blocs séparés mobile/desktop » reste valable pour les
 * pages EXISTANTES, dont il ne faut pas toucher le markup mobile. Elle ne
 * s'applique pas à une page neuve, qui n'a rien à préserver.
 */
export function Ecran({
  titre, large = false, action, children,
}: {
  titre: string
  large?: boolean
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="min-h-dvh bg-background">
      {/* En-tête mobile : titre à gauche, même bord que le contenu. */}
      <header
        className="lg:hidden sticky top-0 z-10 flex items-center gap-2 bg-background/90 px-4 py-3 backdrop-blur"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <h1 className="min-w-0 flex-1 truncate text-lg font-bold text-foreground">{titre}</h1>
        {action && <div className="shrink-0">{action}</div>}
      </header>

      <div className={cn('mx-auto w-full px-4 lg:px-8', large ? 'lg:max-w-6xl' : 'lg:max-w-3xl')}>
        <div className="hidden lg:block">
          <PageHeader title={titre} actions={action} />
        </div>
        {/* La marge basse dégage la barre d'onglets mobile. */}
        <div className="pb-28 lg:pb-10">{children}</div>
      </div>
    </div>
  )
}
