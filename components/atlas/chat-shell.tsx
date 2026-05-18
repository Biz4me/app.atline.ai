"use client"

import { useState } from "react"
import { MobileStatsBar, MobileBottomNav, PlusDrawer, DesktopSidebar, DesktopTopBar } from "@/components/dashboard/navigation"
import { cn } from "@/lib/utils"

interface ChatShellProps {
  children: React.ReactNode
  breadcrumbs?: { label: string; href?: string }[]
}

export function ChatShell({ children, breadcrumbs }: ChatShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Mobile stats bar */}
      <MobileStatsBar />

      {/* Desktop sidebar */}
      <DesktopSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main content area */}
      <div
        className={cn(
          "flex flex-1 flex-col overflow-hidden transition-all duration-300",
          "pt-11 pb-14", // Mobile: stats bar (44px) + bottom nav (56px)
          "lg:pt-0 lg:pb-0",
          sidebarCollapsed ? "lg:pl-16" : "lg:pl-60"
        )}
      >
        {/* Desktop top bar */}
        <DesktopTopBar breadcrumbs={breadcrumbs} />

        {/* Chat content - centered at 720px on desktop */}
        <main className="flex flex-1 flex-col overflow-hidden">
          <div className="mx-auto flex h-full w-full max-w-[720px] flex-col">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileBottomNav onPlusClick={() => setDrawerOpen(true)} />

      {/* Plus drawer */}
      <PlusDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  )
}
