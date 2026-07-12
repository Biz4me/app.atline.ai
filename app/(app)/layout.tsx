import type { ReactNode } from 'react'
import { cookies } from 'next/headers'
import { BusinessProvider } from '@/components/business-provider'
import { OverlayProvider } from '@/components/overlay-provider'
import { AppShell } from '@/components/app-shell'

export default async function AppLayout({ children, sheet }: { children: ReactNode; sheet?: ReactNode }) {
  const cookieStore = await cookies()
  const sidebarCollapsed = cookieStore.get('sidebar-collapsed')?.value === '1'
  const atlasCollapsed = cookieStore.get('atlas-sidebar-collapsed')?.value === '1'

  return (
    <BusinessProvider>
      <OverlayProvider>
        <AppShell initialCollapsed={sidebarCollapsed} initialAtlasCollapsed={atlasCollapsed}>
          {children}
        </AppShell>
        {/* Feuilles (routes interceptées) : la fiche/le compte glissent PAR-DESSUS la page courante */}
        {sheet}
      </OverlayProvider>
    </BusinessProvider>
  )
}
