"use client"

import { Card } from "@/components/ui/card"

interface TeamMember {
  id: string
  name: string
  initials: string
  level: string
  xp: number
  lastActivity: string
  isActive: boolean
}

const teamMembers: TeamMember[] = [
  { id: "1", name: "Lucas M.", initials: "LM", level: "Prospecteur", xp: 1240, lastActivity: "Actif aujourd'hui", isActive: true },
  { id: "2", name: "Emma R.", initials: "ER", level: "Apprenti", xp: 680, lastActivity: "Actif hier", isActive: true },
  { id: "3", name: "Noah B.", initials: "NB", level: "Recrue", xp: 120, lastActivity: "Inactif 5j", isActive: false },
]

const stats = [
  { label: "Filleuls actifs", value: "3" },
  { label: "Taux conversion", value: "24%" },
  { label: "Revenus équipe", value: "~$840" },
]

export function EquipeTab() {
  return (
    <div className="mt-4 space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-3 text-center">
            <p className="font-mono text-lg font-bold text-white">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
          </Card>
        ))}
      </div>

      {/* Team list */}
      <div className="space-y-2">
        {teamMembers.map((member) => (
          <Card key={member.id} className="p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-sm font-medium text-primary">
                {member.initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{member.name}</span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-primary">{member.level}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="font-mono text-xs text-accent">{member.xp} XP</span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className={`text-xs ${member.isActive ? "text-success" : "text-muted-foreground"}`}>
                    {member.lastActivity}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Alert card */}
      <Card className="border-accent/30 bg-accent/5 p-4">
        <p className="text-sm">
          Lucas vient de recruter son premier filleul ! 🎉
        </p>
      </Card>
    </div>
  )
}
