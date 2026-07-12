'use client'

import { usePathname, useRouter } from 'next/navigation'
import ContactDetailPage from '@/app/(app)/contacts/[id]/page'

// FEUILLE fiche contact (route interceptée) : en navigation interne, la fiche glisse
// PAR-DESSUS la page courante — plein écran sur mobile (comme avant), panneau droit
// sur desktop, la page derrière reste montée. URL directe/refresh = la vraie page.
export default function ContactSheet({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const pathname = usePathname()
  // Slot parallèle : Next garde l'état du slot en navigation douce → si on navigue AILLEURS
  // depuis la feuille (Aria, conversions…), elle resterait affichée par-dessus. On la coupe.
  if (!pathname.startsWith('/contacts/')) return null
  return (
    <div className="fixed inset-0 z-[60]">
      <div className="hidden lg:block absolute inset-0 bg-black/40" onClick={() => router.back()} />
      {/* transform = containing block : les éléments `fixed` de la page (composeur de fiche,
          boutons flottants) se calent sur LE PANNEAU, plus sur l'écran entier */}
      <div style={{ transform: 'translateZ(0)' }} className="absolute inset-0 overflow-y-auto bg-background lg:left-auto lg:w-[720px] lg:border-l lg:border-border lg:shadow-2xl lg:animate-slide-in-right">
        <ContactDetailPage params={params} />
      </div>
    </div>
  )
}
