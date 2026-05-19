"use client"

import { Card } from "@/components/ui/card"

interface Challenge {
  icon: string
  title: string
  description: string
  current: number
  target: number
  xpReward: number
}

const challenges: Challenge[] = [
  { icon: "🏃", title: "Terrain", description: "Contacter 5 prospects", current: 3, target: 5, xpReward: 200 },
  { icon: "📚", title: "Formation", description: "Terminer 2 leçons", current: 1, target: 2, xpReward: 100 },
  { icon: "🎭", title: "Simulation", description: "Faire 3 simulations", current: 2, target: 3, xpReward: 150 },
  { icon: "🎙️", title: "Présentation", description: "Analyser 1 présentation", current: 0, target: 1, xpReward: 100 },
  { icon: "📥", title: "Upload", description: "Enrichir la base d'1 doc", current: 0, target: 1, xpReward: 75 },
]

export function DefisTab() {
  return (
    <div className="mt-4 space-y-4">
      {/* Reset timer */}
      <p className="text-sm text-muted-foreground">Reset dans 4j 12h</p>

      {/* Challenges list */}
      <div className="space-y-3">
        {challenges.map((challenge, index) => {
          const progress = (challenge.current / challenge.target) * 100
          const isComplete = challenge.current >= challenge.target

          return (
            <Card key={index} className="p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{challenge.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{challenge.title}</span>
                    <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
                      +{challenge.xpReward} XP
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{challenge.description}</p>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className={isComplete ? "text-success" : "text-muted-foreground"}>
                        {challenge.current}/{challenge.target}
                      </span>
                      {isComplete && <span className="text-success">Terminé ✓</span>}
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-card">
                      <div
                        className={`h-full rounded-full transition-all ${isComplete ? "bg-success" : "bg-primary"}`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
