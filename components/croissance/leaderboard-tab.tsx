"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const periods = ["Hebdo", "Mensuel", "All-time"]

interface LeaderboardEntry {
  rank: number
  name: string
  initials: string
  xp: number
  society?: string
  isCurrentUser?: boolean
}

const leaderboardData: LeaderboardEntry[] = [
  { rank: 1, name: "Sarah M.", initials: "SM", xp: 4820 },
  { rank: 2, name: "Lucas T.", initials: "LT", xp: 3640 },
  { rank: 3, name: "Emma R.", initials: "ER", xp: 2980 },
  { rank: 4, name: "Thomas D.", initials: "TD", xp: 2720, society: "Forever" },
  { rank: 5, name: "Julie P.", initials: "JP", xp: 2540, society: "Herbalife" },
  { rank: 6, name: "Marc L.", initials: "ML", xp: 2380, society: "Amway" },
  { rank: 7, name: "Patrice H.", initials: "PH", xp: 2240, society: "Herbalife", isCurrentUser: true },
  { rank: 8, name: "Clara B.", initials: "CB", xp: 2100, society: "Forever" },
  { rank: 9, name: "Noah K.", initials: "NK", xp: 1920, society: "Herbalife" },
  { rank: 10, name: "Anna F.", initials: "AF", xp: 1780, society: "Amway" },
]

const medalEmojis = ["🥇", "🥈", "🥉"]

export function LeaderboardTab() {
  const [activePeriod, setActivePeriod] = useState("Hebdo")

  const top3 = leaderboardData.slice(0, 3)
  const rest = leaderboardData.slice(3)

  return (
    <div className="mt-4 space-y-4">
      {/* Period toggle */}
      <div className="flex gap-2">
        {periods.map((period) => (
          <button
            key={period}
            onClick={() => setActivePeriod(period)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              activePeriod === period
                ? "bg-primary text-white"
                : "bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            {period}
          </button>
        ))}
      </div>

      {/* Top 3 podium */}
      <div className="flex items-end justify-center gap-2">
        {/* 2nd place */}
        <div className="flex w-24 flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-card text-sm font-medium">
            {top3[1].initials}
          </div>
          <span className="mt-2 text-xl">{medalEmojis[1]}</span>
          <span className="text-sm font-medium">{top3[1].name}</span>
          <span className="font-mono text-xs text-muted-foreground">{top3[1].xp.toLocaleString()} XP</span>
        </div>

        {/* 1st place */}
        <div className="flex w-28 flex-col items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-lg font-bold text-white">
            {top3[0].initials}
          </div>
          <span className="mt-2 text-2xl">{medalEmojis[0]}</span>
          <span className="text-sm font-semibold">{top3[0].name}</span>
          <span className="font-mono text-sm font-bold text-primary">{top3[0].xp.toLocaleString()} XP</span>
        </div>

        {/* 3rd place */}
        <div className="flex w-24 flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-card text-sm font-medium">
            {top3[2].initials}
          </div>
          <span className="mt-2 text-xl">{medalEmojis[2]}</span>
          <span className="text-sm font-medium">{top3[2].name}</span>
          <span className="font-mono text-xs text-muted-foreground">{top3[2].xp.toLocaleString()} XP</span>
        </div>
      </div>

      {/* Rest of leaderboard */}
      <div className="space-y-2">
        {rest.map((entry) => (
          <Card
            key={entry.rank}
            className={cn(
              "flex items-center gap-3 p-3",
              entry.isCurrentUser && "border-primary/30 bg-primary/5"
            )}
          >
            <span className="w-6 text-center font-mono text-sm text-muted-foreground">
              {entry.rank}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-card text-xs font-medium">
              {entry.initials}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-sm font-medium">{entry.name}</span>
              {entry.society && (
                <span className="ml-2 text-xs text-muted-foreground">{entry.society}</span>
              )}
            </div>
            <span className="font-mono text-sm font-medium">{entry.xp.toLocaleString()} XP</span>
          </Card>
        ))}
      </div>
    </div>
  )
}
