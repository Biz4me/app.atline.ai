"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface ProspectCard {
  id: string
  name: string
  initials: string
  score: number
  lastAction: string
  daysInStage: number
}

interface PipelineColumn {
  id: string
  name: string
  color: string
  bgColor: string
  prospects: ProspectCard[]
}

const pipelineData: PipelineColumn[] = [
  {
    id: "identified",
    name: "Identifié",
    color: "#71717A",
    bgColor: "rgba(113,113,122,0.1)",
    prospects: [
      { id: "1", name: "Marie T.", initials: "MT", score: 8, lastAction: "Ajouté via Instagram", daysInStage: 2 },
      { id: "2", name: "Jean P.", initials: "JP", score: 6, lastAction: "Référé par Lucas", daysInStage: 5 },
      { id: "3", name: "Sophie L.", initials: "SL", score: 5, lastAction: "Rencontré en événement", daysInStage: 3 },
    ],
  },
  {
    id: "invited",
    name: "Invité",
    color: "#3B82F6",
    bgColor: "rgba(59,130,246,0.1)",
    prospects: [
      { id: "4", name: "Thomas R.", initials: "TR", score: 7, lastAction: "Invitation envoyée", daysInStage: 1 },
      { id: "5", name: "Clara M.", initials: "CM", score: 4, lastAction: "Relancé 2x", daysInStage: 7 },
    ],
  },
  {
    id: "presented",
    name: "Présenté",
    color: "#7C6FE8",
    bgColor: "rgba(124,111,232,0.1)",
    prospects: [
      { id: "6", name: "Pierre D.", initials: "PD", score: 9, lastAction: "Présentation faite", daysInStage: 2 },
      { id: "7", name: "Anna K.", initials: "AK", score: 7, lastAction: "Questions en attente", daysInStage: 4 },
    ],
  },
  {
    id: "followup",
    name: "Suivi",
    color: "#F59E0B",
    bgColor: "rgba(245,158,11,0.1)",
    prospects: [
      { id: "8", name: "Marc B.", initials: "MB", score: 8, lastAction: "En réflexion", daysInStage: 3 },
    ],
  },
  {
    id: "converted",
    name: "Converti",
    color: "#10B981",
    bgColor: "rgba(16,185,129,0.1)",
    prospects: [
      { id: "9", name: "Julie F.", initials: "JF", score: 10, lastAction: "Inscription validée", daysInStage: 0 },
    ],
  },
]

function ProspectCardItem({ prospect, columnColor }: { prospect: ProspectCard; columnColor: string }) {
  const isConverted = prospect.score === 10

  return (
    <Card className={cn(
      "p-3",
      isConverted && "border-success/30 bg-success/5"
    )}>
      <div className="flex items-start gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-medium text-white"
          style={{ backgroundColor: columnColor }}
        >
          {prospect.initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-medium">{prospect.name}</span>
            <span className="shrink-0 rounded bg-accent/20 px-1.5 py-0.5 font-mono text-xs font-medium text-accent">
              {prospect.score}/10
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{prospect.lastAction}</p>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">
              {prospect.daysInStage === 0 ? "Aujourd'hui" : `${prospect.daysInStage}j dans cette étape`}
            </span>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
              Simuler
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}

import { cn } from "@/lib/utils"

export function PipelineTab() {
  return (
    <div className="mt-4">
      {/* Mobile: horizontal scroll */}
      <div className="-mx-4 overflow-hidden lg:mx-0">
        <div
          className="flex gap-4 overflow-x-auto px-4 pb-4 lg:grid lg:grid-cols-5 lg:gap-4 lg:overflow-visible lg:px-0"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {pipelineData.map((column) => (
            <div
              key={column.id}
              className="w-[280px] shrink-0 lg:w-auto"
            >
              {/* Column header */}
              <div className="mb-3 flex items-center gap-2">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: column.color }}
                />
                <span className="text-sm font-medium">{column.name}</span>
                <span className="rounded-full bg-card px-2 py-0.5 text-xs text-muted-foreground">
                  {column.prospects.length}
                </span>
              </div>

              {/* Cards */}
              <div className="space-y-2">
                {column.prospects.map((prospect) => (
                  <ProspectCardItem
                    key={prospect.id}
                    prospect={prospect}
                    columnColor={column.color}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
