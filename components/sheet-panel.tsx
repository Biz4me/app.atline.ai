'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

// Coquille de FEUILLE partagée (routes interceptées @sheet) : l'écran outil glisse PAR-DESSUS le fil
// courant — panneau droit sur desktop, plein écran sur mobile, la conversation reste montée derrière.
// Fermer (‹) = retour au fil. `transform` = containing block → les éléments `fixed` de la page (composeur,
// FAB…) se calent sur LE PANNEAU, pas sur l'écran entier. `title` seulement si la page n'a pas déjà le sien.
export function SheetPanel({ title, widthClass = 'lg:w-[720px]', children }: { title?: string; widthClass?: string; children: React.ReactNode }) {
  const router = useRouter()
  return (
    <div className="fixed inset-0 z-[60]">
      <div className="hidden lg:block absolute inset-0 bg-black/40" onClick={() => router.back()} />
      <div
        style={{ transform: 'translateZ(0)' }}
        className={cn('absolute inset-0 flex flex-col overflow-hidden bg-background lg:left-auto lg:border-l lg:border-border lg:animate-slide-in-right', widthClass)}
      >
        <div className="flex shrink-0 items-center gap-1.5 border-b border-border px-2 py-2" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}>
          <button type="button" aria-label="Fermer" onClick={() => router.back()} className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground active:bg-muted">
            <ChevronLeft className="size-5 stroke-[1.5]" />
          </button>
          {title && <span className="text-lg font-semibold text-foreground">{title}</span>}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
