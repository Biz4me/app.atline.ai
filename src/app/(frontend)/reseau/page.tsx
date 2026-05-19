"use client"

import { useState } from "react"
import { DashboardShell } from "@/components/dashboard/shell"
import { TabsNav } from "@/components/reseau/tabs-nav"
import { PipelineTab } from "@/components/reseau/pipeline-tab"
import { ListeNomsTab } from "@/components/reseau/liste-noms-tab"
import { EquipeTab } from "@/components/reseau/equipe-tab"
import { CarteDigitaleTab } from "@/components/reseau/carte-digitale-tab"

const tabs = ["Pipeline", "Liste de noms", "Équipe", "Carte digitale"]

export default function ReseauPage() {
  const [activeTab, setActiveTab] = useState("Pipeline")

  return (
    <DashboardShell>
      <div className="space-y-4">
        {/* Page header */}
        <h1 className="font-heading text-xl font-semibold">Réseau</h1>

        {/* Tabs navigation */}
        <TabsNav tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab content */}
        {activeTab === "Pipeline" && <PipelineTab />}
        {activeTab === "Liste de noms" && <ListeNomsTab />}
        {activeTab === "Équipe" && <EquipeTab />}
        {activeTab === "Carte digitale" && <CarteDigitaleTab />}
      </div>
    </DashboardShell>
  )
}
