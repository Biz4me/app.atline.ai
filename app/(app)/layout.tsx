import type { ReactNode } from 'react'
import { BusinessProvider } from '@/components/business-provider'
import { OverlayProvider } from '@/components/overlay-provider'
import { AppShell } from '@/components/app-shell'

// La colonne Conversations (ChatsHome) est montée sur TOUTES les pages et utilise useSearchParams :
// les pages authentifiées de (app) doivent donc être rendues à la demande (jamais prérendues en statique).
export const dynamic = 'force-dynamic'

export default function AppLayout({ children, sheet }: { children: ReactNode; sheet?: ReactNode }) {
  return (
    <BusinessProvider>
      <OverlayProvider>
        <AppShell>{children}</AppShell>
        {/* Feuilles (routes interceptées) : la fiche/le compte glissent PAR-DESSUS la page courante */}
        {sheet}
      </OverlayProvider>
    </BusinessProvider>
  )
}
