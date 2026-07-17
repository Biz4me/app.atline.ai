'use client'

import { ChatsHome } from '@/components/chats-home'

// ═══ NAV MESSAGERIE T10b — la coquille Telegram Web ═══
// Colonne Conversations épinglée à gauche (desktop) + le fil à droite.
// Partagée par les layouts /chats ET /atlas : partout où l'on « discute »,
// la liste reste sous les yeux. Mobile : plein écran, la colonne disparaît.
export function ChatsShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh w-full">
      <aside className="hidden lg:block w-[340px] shrink-0 overflow-y-auto border-r border-border">
        <ChatsHome />
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  )
}
