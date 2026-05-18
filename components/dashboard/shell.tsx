"use client"

import { useState } from "react"
import { MobileHeader, DesktopHeader } from "./header"
import { MobileBottomNav, DesktopSidebar } from "./navigation"
import { cn } from "@/lib/utils"

type LayoutVariant = "standard" | "with-sidebar"

interface DashboardShellProps {
  children: React.ReactNode
  breadcrumbs?: { label: string; href?: string }[]
  layout?: LayoutVariant
}

export function DashboardShell({ children, breadcrumbs, layout = "standard" }: DashboardShellProps) {
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
        <main className="flex-1 px-4 pb-20 pt-[72px] lg:px-8 lg:pb-8 lg:pt-8">
          <div
            className={cn(
              "mx-auto",
              layout === "standard" && "max-w-[960px]",
              layout === "with-sidebar" && "max-w-[1000px]"
            )}
          >
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileBottomNav />
    </div>
  )
}
