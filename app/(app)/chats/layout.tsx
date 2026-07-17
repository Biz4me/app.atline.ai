'use client'

import { ChatsShell } from '@/components/chats-shell'

// ═══ NAV MESSAGERIE T10b — desktop façon Telegram Web ═══
// La colonne Conversations reste épinglée pendant qu'on navigue dans les fils.
export default function ChatsLayout({ children }: { children: React.ReactNode }) {
  return <ChatsShell>{children}</ChatsShell>
}
