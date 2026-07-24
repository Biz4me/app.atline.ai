'use client'

import { MessageSquare } from 'lucide-react'
import { EspacesNav } from '@/components/espaces-nav'

// ═══ ESPACES — /chats (refonte nav) ═══
// Mobile : l'accordéon plein écran. Desktop : l'accordéon vit dans la COLONNE du
// layout ; ici, la zone de droite invite à choisir une conversation.
export default function ChatsPage() {
  return (
    <>
      <div className="md:hidden">
        <EspacesNav />
      </div>
      <div className="hidden h-dvh md:grid place-items-center">
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
