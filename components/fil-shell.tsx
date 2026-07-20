'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

// ═══ Coquille UNIQUE des fils (messagerie façon Telegram) ═══
// Le responsive 3→2→1 vit ICI et NULLE PART AILLEURS. Piloté par un seul booléen `open`.
// La colonne Conversations (S1) est fournie par le layout (ChatsShell) ; cette coquille gère
// le centre (le fil) + le rail (S2 : fiche contact ou panneau agent).
//   < md (768)    : 1 panneau  — centre ; rail en overlay plein écran
//   md → xl       : 2 panneaux — S1 + le rail REMPLACE le centre (centre masqué)
//   ≥ xl (1280)   : 3 panneaux — S1 + centre + rail 400px
// `transform-gpu` = containing block : les feuilles `fixed` de la fiche restent scopées au rail.
export const RAIL_CLS =
  'fixed inset-0 z-[55] flex flex-col overflow-y-auto bg-background transform-gpu ' +
  'md:static md:inset-auto md:z-auto md:flex-1 md:border-l md:border-border ' +
  'xl:w-[400px] xl:flex-none xl:shrink-0'
// Centre masqué quand le rail est ouvert, UNIQUEMENT en 2 panneaux (md→xl). En overlay (<md) et en
// 3 panneaux (≥xl) il reste monté.
export const CENTER_HIDDEN_WHEN_OPEN = 'md:max-xl:hidden'

export function FilShell({ open, rail, children }: { open: boolean; rail: ReactNode; children: ReactNode }) {
  return (
    <div className="flex h-dvh w-full">
      <div className={cn('mx-auto flex h-dvh min-w-0 max-w-2xl flex-1 flex-col bg-background', open && CENTER_HIDDEN_WHEN_OPEN)}>
        {children}
      </div>
      {open && <aside className={RAIL_CLS}>{rail}</aside>}
    </div>
  )
}
