import type { ReactNode } from 'react'
import { BusinessProvider } from '@/components/business-provider'
import { OverlayProvider } from '@/components/overlay-provider'
import { AppShell } from '@/components/app-shell'

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
