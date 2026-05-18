"use client"

import { useState } from "react"
import { MobileHeader, DesktopHeader } from "@/components/dashboard/header"
import { MobileBottomNav, DesktopSidebar } from "@/components/dashboard/navigation"
import { cn } from "@/lib/utils"

interface ChatShellProps {
  children: React.ReactNode
  breadcrumbs?: { label: string; href?: string }[]
}

export function ChatShell({ children, breadcrumbs }: ChatShellProps) {
  const [sidebarCollapsed] = useState(false)

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Mobile header */}
      <MobileHeader />

      {/* Desktop sidebar */}
      <DesktopSidebar collapsed={sidebarCollapsed} />

      {/* Main content area */}
      <div
        className={cn(
          "flex flex-1 flex-col overflow-hidden transition-all duration-300",
          "pt-[56px] pb-[68px]", // Mobile: header + bottom nav
          "lg:pt-0 lg:pb-0",
          sidebarCollapsed ? "lg:pl-16" : "lg:pl-60"
        )}
      >
        {/* Desktop header */}
        <DesktopHeader breadcrumbs={breadcrumbs} />

        {/* Chat content - centered at 720px on desktop */}
        <main className="flex flex-1 flex-col overflow-hidden">
          <div className="mx-auto flex h-full w-full max-w-[720px] flex-col">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileBottomNav />
    </div>
  )
}
