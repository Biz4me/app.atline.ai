"use client"

import { IconLock } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

interface Badge {
  icon: string
  name: string
  unlocked: boolean
}

const badges: Badge[] = [
  { icon: "🎓", name: "Premier pas", unlocked: true },
  { icon: "🔥", name: "Assidu 7j", unlocked: true },
  { icon: "📞", name: "Orateur", unlocked: true },
  { icon: "⚡", name: "Prospecteur", unlocked: true },
  { icon: "💪", name: "Inviteur", unlocked: true },
  { icon: "📚", name: "Studieux", unlocked: true },
  { icon: "🏆", name: "Convertisseur", unlocked: false },
  { icon: "💎", name: "Manager", unlocked: false },
  { icon: "🌟", name: "Leader", unlocked: false },
  { icon: "🎯", name: "Expert objections", unlocked: false },
  { icon: "🏔️", name: "Diamant Atlas", unlocked: false },
  { icon: "👑", name: "Bâtisseur", unlocked: false },
]

export function BadgesTab() {
  const unlockedCount = badges.filter((b) => b.unlocked).length

  return (
    <div className="mt-4">
      <p className="mb-4 text-sm text-muted-foreground">
        {unlockedCount} / {badges.length} badges débloqués
      </p>

      <div className="grid grid-cols-3 gap-3 lg:grid-cols-4">
        {badges.map((badge, index) => (
          <div
            key={index}
            className={cn(
              "flex flex-col items-center rounded-lg border border-border bg-card p-4 text-center transition-opacity",
              !badge.unlocked && "opacity-40"
            )}
          >
            <div className="relative text-3xl">
              {badge.icon}
              {!badge.unlocked && (
                <IconLock className="absolute -bottom-1 -right-1 h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <span className="mt-2 text-xs font-medium">{badge.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
