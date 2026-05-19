"use client"

import { cn } from "@/lib/utils"

interface TabsNavProps {
  tabs: string[]
  activeTab: string
  onTabChange: (tab: string) => void
}

export function TabsNav({ tabs, activeTab, onTabChange }: TabsNavProps) {
  return (
    <div className="w-full overflow-hidden border-b border-border">
      <div
        className="flex w-full max-w-full gap-0 overflow-x-auto scrollbar-none"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {tabs.map((tab) => {
          const isActive = tab === activeTab
          return (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={cn(
                "relative shrink-0 px-4 py-3 text-sm font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
