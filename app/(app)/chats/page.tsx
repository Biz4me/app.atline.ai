'use client'

import { MessageSquare } from 'lucide-react'
import { ChatsHome } from '@/components/chats-home'

// ═══ NAV MESSAGERIE — /chats ═══
// Mobile : la liste plein écran. Desktop (T10b) : la liste vit dans la COLONNE du
// layout (façon Telegram Web) — ici, la zone de droite invite à choisir un fil.
export default function ChatsPage() {
  return (
    <>
      <div className="lg:hidden">
        <ChatsHome />
      </div>
      <div className="hidden h-dvh lg:grid place-items-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-surface text-muted-foreground">
            <MessageSquare className="size-6 stroke-[1.5]" />
          </span>
          <p className="text-sm text-muted-foreground">Choisis une conversation</p>
        </div>
      </div>
    </>
  )
}
