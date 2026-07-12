'use client'

import { useRouter } from 'next/navigation'
import SettingsPage from '@/app/(app)/settings/page'

// FEUILLE Mon compte (route interceptée) : glisse par-dessus la page courante.
// Mobile = l'overlay plein écran de la page elle-même ; desktop = panneau droit.
export default function SettingsSheet() {
  const router = useRouter()
  return (
    <div className="fixed inset-0 z-[60]">
      <div className="hidden lg:block absolute inset-0 bg-black/40" onClick={() => router.back()} />
      {/* transform = containing block : les éléments `fixed` de la page se calent sur le panneau */}
      <div style={{ transform: 'translateZ(0)' }} className="absolute inset-0 overflow-y-auto bg-background lg:left-auto lg:w-[560px] lg:border-l lg:border-border lg:shadow-2xl lg:animate-slide-in-right">
        <SettingsPage />
      </div>
    </div>
  )
}
