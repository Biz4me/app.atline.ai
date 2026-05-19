"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { IconSearch, IconChevronRight, IconSparkles } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

interface Prospect {
  id: string
  name: string
  initials: string
  company: string
  score: number
  lastContact: string
  atlasSuggestion: string
}

const prospects: Prospect[] = [
  { id: "1", name: "Marie T.", initials: "MT", company: "Herbalife", score: 8, lastContact: "Hier", atlasSuggestion: "Appelle-la maintenant" },
  { id: "2", name: "Jean P.", initials: "JP", company: "Forever", score: 6, lastContact: "Il y a 3j", atlasSuggestion: "Relance dans 3 jours" },
  { id: "3", name: "Thomas R.", initials: "TR", company: "Amway", score: 7, lastContact: "Il y a 5j", atlasSuggestion: "Envoie le script WhatsApp" },
  { id: "4", name: "Sophie L.", initials: "SL", company: "Herbalife", score: 4, lastContact: "Il y a 2 sem", atlasSuggestion: "Prospect froid, attends un signal" },
  { id: "5", name: "Pierre D.", initials: "PD", company: "Forever", score: 9, lastContact: "Aujourd'hui", atlasSuggestion: "Ferme la vente!" },
]

const marklineLeads = [
  { id: "m1", name: "Sophie", action: "a liké 3 de tes posts", score: 7 },
  { id: "m2", name: "Marc", action: "a commenté 'intéressant'", score: 8 },
]

const filters = ["Tous", "Chaud", "Tiède", "Froid"]

function getScoreColor(score: number) {
  if (score >= 7) return "#10B981" // green
  if (score >= 4) return "#F59E0B" // amber
  return "#EF4444" // red
}

export function ListeNomsTab() {
  const [activeFilter, setActiveFilter] = useState("Tous")
  const [search, setSearch] = useState("")

  const filteredProspects = prospects.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    if (activeFilter === "Chaud") return p.score >= 7
    if (activeFilter === "Tiède") return p.score >= 4 && p.score < 7
    if (activeFilter === "Froid") return p.score < 4
    return true
  })

  return (
    <div className="mt-4 space-y-4">
      {/* Search bar */}
      <div className="relative">
        <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Rechercher un prospect..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 w-full rounded-lg border border-border bg-card pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Filter pills */}
      <div className="flex gap-2">
        {filters.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              activeFilter === filter
                ? "bg-primary text-white"
                : "bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Prospects list */}
      <div className="space-y-2">
        {filteredProspects.map((prospect) => (
          <Card key={prospect.id} className="p-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-card text-sm font-medium">
                  {prospect.initials}
                </div>
                <div
                  className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card"
                  style={{ backgroundColor: getScoreColor(prospect.score) }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{prospect.name}</span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">{prospect.company}</span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="font-mono text-xs text-accent">{prospect.score}/10</span>
                </div>
                <p className="mt-0.5 flex items-center gap-1 text-xs italic text-muted-foreground">
                  <IconSparkles className="h-3 w-3 text-primary" />
                  {prospect.atlasSuggestion}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-[10px] text-muted-foreground">{prospect.lastContact}</span>
                <IconChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Markline leads section */}
      <div className="mt-6">
        <div className="mb-3 flex items-center gap-2">
          <h3 className="text-sm font-medium">Leads Markline</h3>
          <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-medium text-primary">Pro</span>
        </div>
        <div className="space-y-2">
          {marklineLeads.map((lead) => (
            <Card key={lead.id} className="border-accent/20 bg-accent/5 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm">
                  <span className="font-medium">{lead.name}</span>{" "}
                  <span className="text-muted-foreground">{lead.action}</span>
                </p>
                <span className="rounded bg-accent/20 px-1.5 py-0.5 font-mono text-xs font-medium text-accent">
                  {lead.score}/10
                </span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
