"use client"

import { Card } from "@/components/ui/card"

export function XpNiveauTab() {
  const currentXP = 2240
  const nextLevelXP = 5000
  const progress = (currentXP / nextLevelXP) * 100

  const recentGains = [
    { xp: 50, action: "Simulation complétée", time: "il y a 2h" },
    { xp: 30, action: "Suivi effectué", time: "hier" },
    { xp: 150, action: "Module terminé", time: "il y a 3j" },
    { xp: 300, action: "Prospect converti", time: "il y a 5j" },
  ]

  return (
    <div className="mt-4 space-y-4">
      {/* Current level card */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-primary to-primary/60 p-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚡</span>
            <span className="font-heading text-lg font-semibold text-white">Prospecteur</span>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-2xl font-bold text-white">{currentXP.toLocaleString()}</span>
              <span className="text-sm text-white/70">/ {nextLevelXP.toLocaleString()} XP</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-white/70">
              Prochain niveau: 🎯 Recruteur
            </p>
          </div>
        </div>
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3 text-center">
          <p className="text-lg">🔥</p>
          <p className="font-mono text-lg font-bold">12j</p>
          <p className="text-[10px] text-muted-foreground">Streak</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="font-mono text-lg font-bold">24</p>
          <p className="text-[10px] text-muted-foreground">Sessions</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="font-mono text-lg font-bold">8</p>
          <p className="text-[10px] text-muted-foreground">Simulations</p>
        </Card>
      </div>

      {/* Recent XP gains */}
      <div>
        <h3 className="mb-3 text-sm font-medium">Gains récents</h3>
        <div className="space-y-2">
          {recentGains.map((gain, index) => (
            <Card key={index} className="flex items-center justify-between p-3">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-bold text-success">+{gain.xp} XP</span>
                <span className="text-sm text-muted-foreground">{gain.action}</span>
              </div>
              <span className="text-xs text-muted-foreground">{gain.time}</span>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
