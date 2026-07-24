'use client'

import { EspacesNav } from '@/components/espaces-nav'

// ═══ Coquille des fils (refonte nav) ═══
// Colonne « Espaces » (l'accordéon) épinglée à gauche (desktop) + le fil à droite.
// Partagée par les layouts /chats ET /atlas : partout où l'on « discute »,
// la nav reste sous les yeux. Mobile : plein écran, la colonne disparaît.
export function ChatsShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh w-full">
      <aside className="hidden md:block w-[340px] shrink-0 overflow-y-auto border-r border-border">
        <EspacesNav />
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  )
}
