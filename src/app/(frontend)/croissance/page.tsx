"use client"

import { useState } from "react"
import { DashboardShell } from "@/components/dashboard/shell"
import { TabsNav } from "@/components/reseau/tabs-nav"
import { XpNiveauTab } from "@/components/croissance/xp-niveau-tab"
import { BadgesTab } from "@/components/croissance/badges-tab"
import { DefisTab } from "@/components/croissance/defis-tab"
import { LeaderboardTab } from "@/components/croissance/leaderboard-tab"
import { CommunauteTab } from "@/components/croissance/communaute-tab"

const tabs = ["XP & Niveau", "Badges", "Défis", "Leaderboard", "Communauté"]

export default function CroissancePage() {
  const [activeTab, setActiveTab] = useState("XP & Niveau")

  return (
    <DashboardShell>
      <div className="space-y-4">
        {/* Page header */}
        <h1 className="font-heading text-xl font-semibold">Croissance</h1>

        {/* Tabs navigation */}
        <TabsNav tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab content */}
        {activeTab === "XP & Niveau" && <XpNiveauTab />}
        {activeTab === "Badges" && <BadgesTab />}
        {activeTab === "Défis" && <DefisTab />}
        {activeTab === "Leaderboard" && <LeaderboardTab />}
        {activeTab === "Communauté" && <CommunauteTab />}
      </div>
    </DashboardShell>
  )
}
