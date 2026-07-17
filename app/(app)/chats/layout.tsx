'use client'

import { ChatsHome } from '@/components/chats-home'

// ═══ NAV MESSAGERIE T10b — desktop façon Telegram Web ═══
// La colonne Conversations reste épinglée à gauche pendant qu'on navigue dans les
// fils (elle ne se remonte pas entre les routes). Mobile : les pages sont plein écran.
export default function ChatsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh w-full">
      <aside className="hidden lg:block w-[340px] shrink-0 overflow-y-auto border-r border-border">
        <ChatsHome />
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  )
}
