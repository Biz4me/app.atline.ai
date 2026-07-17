'use client'

import { ChatsShell } from '@/components/chats-shell'

// Le fil Atlas vit dans la même coquille que les autres fils : colonne Conversations
// à gauche en desktop (T10b), plein écran sur mobile.
export default function AtlasLayout({ children }: { children: React.ReactNode }) {
  return <ChatsShell>{children}</ChatsShell>
}
