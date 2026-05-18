"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  IconFlame,
  IconCalendar,
  IconPhone,
  IconUsers,
  IconSchool,
  IconSparkles,
  IconGridDots,
  IconUser,
  IconTrophy,
  IconBroadcast,
  IconChartBar,
  IconUpload,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconBell,
  IconX,
} from "@tabler/icons-react"
import { AtlineLogo } from "./logo"

// ═══════════════════════════════════════════════════════════════
// MOBILE STATS BAR (replaces header)
// ═══════════════════════════════════════════════════════════════

const statsBarItems = [
  { href: "/croissance", icon: IconFlame, value: "12", color: "#F59E0B" },
  { href: "/agenda", icon: IconCalendar, value: "3", color: "#06B6D4" },
  { href: "/simulations", icon: IconPhone, value: "8", color: "#7C6FE8" },
  { href: "/reseau", icon: IconUsers, value: "24", color: "#10B981" },
]

export function MobileStatsBar() {
  return (
    <header className="fixed left-0 right-0 top-0 z-50 flex h-11 items-center border-b border-white/[0.08] bg-background px-4 lg:hidden">
      <div className="flex w-full items-center justify-between">
        {statsBarItems.map((item, index) => {
          const Icon = item.icon
          return (
            <div key={item.href} className="flex items-center">
              <Link
                href={item.href}
                className="flex items-center gap-1.5 px-2 py-1"
              >
                <Icon className="h-4 w-4" style={{ color: item.color }} />
                <span className="font-mono text-[13px] font-bold text-white">
                  {item.value}
                </span>
              </Link>
              {index < statsBarItems.length - 1 && (
                <div className="ml-2 h-4 w-px bg-white/[0.08]" />
              )}
            </div>
          )
        })}
      </div>
    </header>
  )
}

// ═══════════════════════════════════════════════════════════════
// MOBILE BOTTOM NAV (5 tabs)
// ═══════════════════════════════════════════════════════════════

const bottomNavItems = [
  { href: "/formation", icon: IconSchool, label: "Formation" },
  { href: "/atlas", icon: IconSparkles, label: "Atlas" },
  { href: "/simulations", icon: IconPhone, label: "Simulations" },
  { href: "/reseau", icon: IconUsers, label: "Réseau" },
]

interface MobileBottomNavProps {
  onPlusClick: () => void
}

export function MobileBottomNav({ onPlusClick }: MobileBottomNavProps) {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 h-14 border-t border-white/[0.08] bg-[#18181B] lg:hidden">
      <div className="flex h-full items-center justify-around px-1">
        {bottomNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-h-[44px] flex-col items-center justify-center px-2"
            >
              <Icon
                className="h-5 w-5"
                style={{ color: isActive ? "#7C6FE8" : "#71717A" }}
              />
              {isActive && (
                <span className="mt-0.5 text-[10px] font-medium text-primary">
                  {item.label}
                </span>
              )}
            </Link>
          )
        })}
        {/* Plus button */}
        <button
          onClick={onPlusClick}
          className="flex min-h-[44px] flex-col items-center justify-center px-2"
        >
          <IconGridDots className="h-5 w-5 text-[#71717A]" />
        </button>
      </div>
    </nav>
  )
}

// ═══════════════════════════════════════════════════════════════
// PLUS DRAWER (bottom sheet)
// ═══════════════════════════════════════════════════════════════

interface PlusDrawerProps {
  isOpen: boolean
  onClose: () => void
}

const drawerSections = [
  {
    label: "IDENTITÉ",
    items: [
      {
        type: "logo" as const,
        label: "Atline",
        subtitle: "Plan Pro · Actif",
        bgColor: "rgba(124,111,232,0.15)",
      },
      {
        type: "link" as const,
        href: "/profil",
        icon: IconUser,
        label: "Profil",
        bgColor: "rgba(113,113,122,0.12)",
        iconColor: "#71717A",
      },
    ],
  },
  {
    label: "PROGRESSION",
    items: [
      {
        type: "link" as const,
        href: "/croissance",
        icon: IconTrophy,
        label: "Croissance",
        bgColor: "rgba(234,179,8,0.12)",
        iconColor: "#EAB308",
      },
    ],
  },
  {
    label: "ORGANISATION",
    items: [
      {
        type: "link" as const,
        href: "/agenda",
        icon: IconCalendar,
        label: "Agenda",
        bgColor: "rgba(6,182,212,0.12)",
        iconColor: "#06B6D4",
      },
    ],
  },
  {
    label: "OUTILS PRO",
    items: [
      {
        type: "link" as const,
        href: "/markline",
        icon: IconBroadcast,
        label: "Markline",
        badge: "Pro",
        bgColor: "rgba(6,182,212,0.12)",
        iconColor: "#06B6D4",
      },
      {
        type: "link" as const,
        href: "/proline",
        icon: IconChartBar,
        label: "Proline",
        badge: "Pro",
        bgColor: "rgba(16,185,129,0.12)",
        iconColor: "#10B981",
      },
    ],
  },
  {
    label: "ENRICHISSEMENT",
    items: [
      {
        type: "link" as const,
        href: "/enrichir-atlas",
        icon: IconUpload,
        label: "Enrichir Atlas",
        badge: "Pro",
        bgColor: "rgba(124,111,232,0.12)",
        iconColor: "#7C6FE8",
      },
    ],
  },
]

export function PlusDrawer({ isOpen, onClose }: PlusDrawerProps) {
  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/60 lg:hidden"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed bottom-0 left-0 right-0 z-[70] rounded-t-[20px] bg-background lg:hidden">
        {/* Handle */}
        <div className="flex justify-center py-3">
          <div className="h-[3px] w-8 rounded-full bg-white/20" />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-3 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-card"
        >
          <IconX className="h-5 w-5" />
        </button>

        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto pb-8">
          {drawerSections.map((section) => (
            <div key={section.label}>
              {/* Section label */}
              <div className="px-4 py-2">
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {section.label}
                </span>
              </div>

              {/* Items */}
              {section.items.map((item, index) => (
                <div
                  key={index}
                  className="flex h-[52px] items-center border-b border-white/[0.05] px-4"
                >
                  {item.type === "logo" ? (
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-lg"
                        style={{ backgroundColor: item.bgColor }}
                      >
                        <AtlineLogo showText={false} size="sm" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-white">
                          {item.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {item.subtitle}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className="flex w-full items-center gap-3"
                    >
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-lg"
                        style={{ backgroundColor: item.bgColor }}
                      >
                        <item.icon
                          className="h-4 w-4"
                          style={{ color: item.iconColor }}
                        />
                      </div>
                      <span className="flex-1 text-sm text-white">
                        {item.label}
                      </span>
                      {item.badge && (
                        <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-medium text-white">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════
// DESKTOP SIDEBAR (240px, collapsible to 64px)
// ═══════════════════════════════════════════════════════════════

interface NavItemWithSub {
  href: string
  icon: typeof IconSchool
  label: string
  subItems?: { href: string; label: string }[]
}

const sidebarSections = {
  principal: [
    {
      href: "/formation",
      icon: IconSchool,
      label: "Formation",
      subItems: [
        { href: "/formation/modules", label: "Modules" },
        { href: "/formation/bibliotheque", label: "Bibliothèque" },
        { href: "/formation/notes", label: "Mes notes" },
      ],
    },
    {
      href: "/atlas",
      icon: IconSparkles,
      label: "Atlas",
      subItems: [
        { href: "/atlas", label: "Chat" },
        { href: "/atlas/historique", label: "Historique" },
        { href: "/atlas/scripts", label: "Scripts WhatsApp" },
      ],
    },
    {
      href: "/simulations",
      icon: IconPhone,
      label: "Simulations",
      subItems: [
        { href: "/simulations", label: "Scénarios" },
        { href: "/simulations/historique", label: "Historique scores" },
        { href: "/simulations/analyse", label: "Analyse présentation" },
      ],
    },
    {
      href: "/reseau",
      icon: IconUsers,
      label: "Réseau",
      subItems: [
        { href: "/reseau/pipeline", label: "Pipeline" },
        { href: "/reseau/noms", label: "Liste de noms" },
        { href: "/reseau/equipe", label: "Équipe" },
        { href: "/reseau/carte", label: "Carte digitale" },
      ],
    },
  ] as NavItemWithSub[],
  outils: [
    { href: "/markline", icon: IconBroadcast, label: "Markline" },
    { href: "/agenda", icon: IconCalendar, label: "Agenda" },
    { href: "/proline", icon: IconChartBar, label: "Proline" },
    { href: "/enrichir-atlas", icon: IconUpload, label: "Enrichir Atlas" },
  ],
  compte: [
    { href: "/croissance", icon: IconTrophy, label: "Croissance" },
    { href: "/profil", icon: IconUser, label: "Profil" },
  ],
}

interface DesktopSidebarProps {
  collapsed?: boolean
  onToggle?: () => void
}

export function DesktopSidebar({ collapsed = false, onToggle }: DesktopSidebarProps) {
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  const toggleExpanded = (href: string) => {
    setExpandedItems((prev) =>
      prev.includes(href)
        ? prev.filter((h) => h !== href)
        : [...prev, href]
    )
  }

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/")

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-border bg-card transition-all duration-300 lg:flex",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-border px-4">
        <AtlineLogo showText={!collapsed} size="md" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3">
        {/* PRINCIPAL section */}
        {!collapsed && (
          <div className="mb-2 px-3">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Principal
            </span>
          </div>
        )}
        <div className="space-y-0.5">
          {sidebarSections.principal.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            const expanded = expandedItems.includes(item.href)
            const hasSubItems = item.subItems && item.subItems.length > 0

            return (
              <div key={item.href}>
                <button
                  onClick={() => hasSubItems && !collapsed && toggleExpanded(item.href)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      {hasSubItems && (
                        <IconChevronDown
                          className={cn(
                            "h-4 w-4 transition-transform",
                            expanded && "rotate-180"
                          )}
                        />
                      )}
                    </>
                  )}
                </button>
                {/* Sub items */}
                {!collapsed && expanded && hasSubItems && (
                  <div className="ml-8 mt-0.5 space-y-0.5">
                    {item.subItems?.map((sub) => (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        className={cn(
                          "block rounded-md px-3 py-1.5 text-sm transition-colors",
                          pathname === sub.href
                            ? "text-primary"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {sub.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* OUTILS section */}
        {!collapsed && (
          <div className="mb-2 mt-6 px-3">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Outils
            </span>
          </div>
        )}
        {collapsed && <div className="mt-4" />}
        <div className="space-y-0.5">
          {sidebarSections.outils.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </div>

        {/* COMPTE section */}
        {!collapsed && (
          <div className="mb-2 mt-6 px-3">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Compte
            </span>
          </div>
        )}
        {collapsed && <div className="mt-4" />}
        <div className="space-y-0.5">
          {sidebarSections.compte.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="flex h-10 items-center justify-center border-t border-border text-muted-foreground transition-colors hover:text-foreground"
      >
        {collapsed ? (
          <IconChevronRight className="h-5 w-5" />
        ) : (
          <IconChevronLeft className="h-5 w-5" />
        )}
      </button>

      {/* User section */}
      <div className="border-t border-border p-3">
        <div
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2",
            collapsed && "justify-center px-0"
          )}
        >
          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-primary">
            <div className="flex h-full w-full items-center justify-center text-sm font-medium text-white">
              PH
            </div>
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-medium text-white">Patrice Haure-Pallesi</span>
              <span className="inline-flex w-fit items-center rounded-[4px] bg-primary px-1.5 py-0.5 text-[10px] font-medium text-white">
                Plan Pro
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}

// ═══════════════════════════════════════════════════════════════
// DESKTOP TOP BAR
// ═══════════════════════════════════════════════════════════════

interface DesktopTopBarProps {
  breadcrumbs?: { label: string; href?: string }[]
}

export function DesktopTopBar({ breadcrumbs }: DesktopTopBarProps) {
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

      {/* Right side: stats + bell + avatar */}
      <div className="flex items-center gap-4">
        {/* Stats */}
        <div className="flex items-center gap-3">
          {statsBarItems.map((item, index) => {
            const Icon = item.icon
            return (
              <div key={item.href} className="flex items-center">
                <Link
                  href={item.href}
                  className="flex items-center gap-1.5 px-1"
                >
                  <Icon className="h-4 w-4" style={{ color: item.color }} />
                  <span className="font-mono text-xs font-bold text-white">
                    {item.value}
                  </span>
                </Link>
                {index < statsBarItems.length - 1 && (
                  <div className="ml-2 h-4 w-px bg-white/[0.08]" />
                )}
              </div>
            )
          })}
        </div>

        {/* Bell */}
        <button className="relative flex h-9 w-9 items-center justify-center rounded-md transition-colors hover:bg-card">
          <IconBell className="h-5 w-5 text-muted-foreground" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
        </button>

        {/* Avatar */}
        <div className="h-8 w-8 overflow-hidden rounded-full bg-primary">
          <div className="flex h-full w-full items-center justify-center text-xs font-medium text-white">
            PH
          </div>
        </div>
      </div>
    </header>
  )
}
