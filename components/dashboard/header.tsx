"use client"

import { Bell } from "lucide-react"
import { AtlineLogo } from "./logo"

export function MobileHeader() {
  return (
    <header className="fixed left-0 right-0 top-0 z-50 flex h-14 items-center justify-between border-b border-border bg-background px-4 lg:hidden">
      {/* Logo */}
      <AtlineLogo size="md" />

      {/* Right side */}
      <div className="flex items-center gap-3">
        <button className="relative flex h-9 w-9 items-center justify-center rounded-md transition-colors hover:bg-card">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
        </button>
        <div className="h-8 w-8 overflow-hidden rounded-full bg-gradient-to-br from-primary to-accent">
          <div className="flex h-full w-full items-center justify-center text-xs font-medium text-white">
            PH
          </div>
        </div>
      </div>
    </header>
  )
}

interface DesktopHeaderProps {
  breadcrumbs?: { label: string; href?: string }[]
}

export function DesktopHeader({ breadcrumbs }: DesktopHeaderProps) {
  return (
    <header className="sticky top-0 z-30 hidden h-14 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-sm lg:flex">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm">
        {breadcrumbs?.map((crumb, index) => (
          <span key={index} className="flex items-center gap-2">
            {index > 0 && <span className="text-muted-foreground">/</span>}
            {crumb.href ? (
              <a
                href={crumb.href}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {crumb.label}
              </a>
            ) : (
              <span className="text-foreground">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>

      {/* Right side */}
      <div className="flex items-center gap-3">
        <button className="relative flex h-9 w-9 items-center justify-center rounded-md transition-colors hover:bg-card">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
        </button>
      </div>
    </header>
  )
}
