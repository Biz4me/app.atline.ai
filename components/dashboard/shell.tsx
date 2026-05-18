"use client"

import { useState } from "react"
import { MobileHeader, DesktopHeader } from "./header"
import { MobileBottomNav, DesktopSidebar } from "./navigation"
import { cn } from "@/lib/utils"

interface DashboardShellProps {
  children: React.ReactNode
  breadcrumbs?: { label: string; href?: string }[]
}

export function DashboardShell({ children, breadcrumbs }: DashboardShellProps) {
  const [sidebarCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <MobileHeader />

      {/* Desktop sidebar */}
      <DesktopSidebar collapsed={sidebarCollapsed} />

      {/* Main content area */}
      <div
        className={cn(
          "flex flex-col transition-all duration-300",
          sidebarCollapsed ? "lg:pl-16" : "lg:pl-60"
        )}
      >
        {/* Desktop header */}
        <DesktopHeader breadcrumbs={breadcrumbs} />

        {/* Page content */}
        <main className="flex-1 px-4 pb-20 pt-[72px] lg:px-6 lg:pb-6 lg:pt-6">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileBottomNav />
    </div>
  )
}
