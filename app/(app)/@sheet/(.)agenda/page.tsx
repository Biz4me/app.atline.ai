'use client'

import { usePathname, useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { AgendaView } from '@/app/(app)/agenda/page'

// FEUILLE Agenda (route interceptée) : en navigation interne, l'agenda glisse PAR-DESSUS le fil
// courant — panneau droit sur desktop, plein écran sur mobile, la conversation reste montée derrière.
// URL directe / refresh = la vraie page /agenda. Le mode `embedded` masque le header de la page,
// donc la feuille fournit son propre en-tête (fermer = retour au fil).
export default function AgendaSheet() {
  const router = useRouter()
  const pathname = usePathname()
  // Slot parallèle : si on navigue AILLEURS depuis la feuille, Next garde son état → on la coupe.
  if (!pathname.startsWith('/agenda')) return null
  return (
    <div className="fixed inset-0 z-[60]">
      <div className="hidden lg:block absolute inset-0 bg-black/40" onClick={() => router.back()} />
      {/* transform = containing block : les éléments `fixed` de la page se calent sur LE PANNEAU */}
      <div style={{ transform: 'translateZ(0)' }} className="absolute inset-0 flex flex-col overflow-hidden bg-background lg:left-auto lg:w-[820px] lg:border-l lg:border-border lg:shadow-2xl lg:animate-slide-in-right">
        <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2.5" style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top))' }}>
          <button type="button" aria-label="Fermer" onClick={() => router.back()} className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground active:bg-muted">
            <ChevronLeft className="size-5 stroke-[1.5]" />
          </button>
          <span className="text-lg font-semibold text-foreground">Agenda</span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <AgendaView embedded onClose={() => router.back()} />
        </div>
      </div>
    </div>
  )
}
