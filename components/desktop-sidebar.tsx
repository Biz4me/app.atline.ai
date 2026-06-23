'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home, Mic, Calendar,
  BookOpen, Library, PenLine, Inbox, BarChart2, GitFork,
  ChevronLeft, ChevronRight,
  Settings, User, TrendingUp, Wrench, Link2, Bot, FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'
import { contacts } from '@/lib/data'
import { usePageVisibility } from '@/components/page-visibility-context'

interface SidebarItem {
  href: string
  label: string
  icon: LucideIcon
  color?: string
  visKey?: string
}

interface SidebarSection {
  title: string
  items: SidebarItem[]
  bottom?: SidebarItem[]
}

const PIPELINE_STAGES = [
  { id: 'invitation',   label: 'Invitation',   color: '#3b82f6' },
  { id: 'présentation', label: 'Présentation', color: '#f59e0b' },
  { id: 'suivi',        label: 'Suivi',        color: '#dc2626' },
  { id: 'closing',      label: 'Closing',      color: '#22c55e' },
  { id: 'démarré',      label: "Démarré",      color: '#14B8A6' },
] as const

function CrmSidebarContent({ collapsed }: { collapsed: boolean }) {
  const stageCounts = PIPELINE_STAGES.map((s) => ({
    ...s,
    count: contacts.filter((c) => c.stade === s.id).length,
  }))
  const total = contacts.length

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-3 pt-4">
        {stageCounts.map((s) => (
          <div key={s.id} className="relative flex size-6 items-center justify-center">
            <div className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
            {s.count > 0 && (
              <span className="absolute -right-1 -top-1 flex size-3.5 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-foreground">
                {s.count}
              </span>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col pt-2 px-2">
      <p className="px-3 pb-1.5 pt-1 text-[10px] font-bold tracking-widest uppercase text-muted-foreground/60">
        Pipeline
      </p>
      {stageCounts.map((s) => (
        <div key={s.id} className="flex items-center gap-3 rounded-xl px-3 py-2">
          <div className="size-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
          <span className="flex-1 text-sm font-medium text-muted-foreground">{s.label}</span>
          <span
            className="text-xs font-bold tabular-nums"
            style={{ color: s.count > 0 ? s.color : 'var(--muted-foreground)' }}
          >
            {s.count}
          </span>
        </div>
      ))}
      <div className="mx-1 my-2 h-px bg-border" />
      <div className="flex items-center gap-3 rounded-xl px-3 py-2">
        <div className="size-2 shrink-0 rounded-full bg-border" />
        <span className="flex-1 text-sm font-medium text-muted-foreground">Total</span>
        <span className="text-xs font-bold tabular-nums text-muted-foreground">{total}</span>
      </div>
    </div>
  )
}

function getSidebarSection(pathname: string): SidebarSection | null {
  if (pathname.startsWith('/home') || pathname === '/') {
    return {
      title: 'Mon parcours',
      items: [
        { href: '/home',    label: 'Accueil',    icon: Home,       visKey: 'home'    },
        { href: '/aria',    label: 'Simulateur', icon: Mic,        color: '#14B8A6', visKey: 'aria'   },
        { href: '/agenda',  label: 'Agenda',     icon: Calendar,                     visKey: 'agenda' },
        { href: '/rapport', label: 'Rapport',    icon: TrendingUp                                     },
      ],
    }
  }
  if (pathname.startsWith('/contacts')) {
    return { title: 'Mon CRM', items: [] }
  }
  if (pathname.startsWith('/formation')) {
    return {
      title: 'Formation',
      items: [
        { href: '/formation',         label: 'Mes modules',  icon: BookOpen, visKey: 'formation' },
        { href: '/formation/library', label: 'Bibliothèque', icon: Library,  visKey: 'formation' },
      ],
    }
  }
  if (pathname.startsWith('/nova')) {
    return {
      title: 'Nova — Contenu',
      items: [
        { href: '/nova',        label: 'Accueil', icon: BarChart2, color: '#8B5CF6', visKey: 'nova' },
        { href: '/nova/create', label: 'Créer',   icon: PenLine,   color: '#8B5CF6', visKey: 'nova' },
        { href: '/nova/inbox',  label: 'Inbox',   icon: Inbox,     color: '#8B5CF6', visKey: 'nova' },
      ],
    }
  }
  if (pathname.startsWith('/network')) {
    return {
      title: 'Réseau Atline',
      items: [
        { href: '/network', label: 'Mon réseau', icon: GitFork, visKey: 'network' },
      ],
    }
  }
  if (pathname.startsWith('/toolbox')) {
    return {
      title: 'Boîte à outils',
      items: [
        { href: '/toolbox', label: 'Liens rapides',     icon: Link2,     visKey: 'toolbox' },
        { href: '/toolbox', label: 'Supports de vente', icon: FileText,  visKey: 'toolbox' },
        { href: '/toolbox', label: 'Bots prospection',  icon: Bot,       visKey: 'toolbox' },
      ],
    }
  }
  return null
}

interface Props {
  collapsed: boolean
  onToggle: () => void
}

export function DesktopSidebar({ collapsed, onToggle }: Props) {
  const pathname = usePathname()
  const vis = usePageVisibility()
  const section = getSidebarSection(pathname)

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  if (!section) return null

  const visibleItems = section.items.filter(item => !item.visKey || vis[item.visKey] !== false)

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col fixed left-0 top-14 h-[calc(100dvh-3.5rem)] z-40',
        'bg-background border-r border-border overflow-hidden',
        'transition-[width] duration-200 ease-out',
        collapsed ? 'w-14' : 'w-56',
      )}
    >
      {/* Section title + collapse toggle */}
      <div className={cn(
        'flex items-center shrink-0 h-12 px-4',
        collapsed && 'justify-center px-0',
      )}>
        {!collapsed && (
          <span className="flex-1 text-sm font-bold text-foreground truncate">
            {section.title}
          </span>
        )}
        <button
          type="button"
          onClick={onToggle}
          title={collapsed ? 'Développer' : 'Réduire'}
          className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
        </button>
      </div>

      <div className="mx-3 h-px bg-border shrink-0" />

      {/* Contextual nav */}
      {pathname.startsWith('/contacts') ? (
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <CrmSidebarContent collapsed={collapsed} />
        </div>
      ) : (
        <nav className="flex flex-col gap-0.5 px-4 pt-3 flex-1 overflow-y-auto overflow-x-hidden">
          {visibleItems.map((item) => (
            <NavItem key={item.href + item.label} {...item} active={isActive(item.href)} collapsed={collapsed} />
          ))}
        </nav>
      )}

      {/* Bottom — settings + profil conditionnels */}
      <div className="shrink-0 flex flex-col gap-0.5 px-4 pb-3 pt-1">
        <div className="mx-1 mb-1 h-px bg-border" />
        {vis['settings'] !== false && (
          <NavItem href="/settings" label="Paramètres" icon={Settings} active={isActive('/settings')} collapsed={collapsed} />
        )}
        {vis['profile'] !== false && (
          <NavItem href="/profile" label="Mon profil" icon={User} active={isActive('/profile')} collapsed={collapsed} />
        )}
      </div>
    </aside>
  )
}

function NavItem({
  href, label, icon: Icon, active, collapsed, color,
}: {
  href: string
  label: string
  icon: LucideIcon
  active: boolean
  collapsed: boolean
  color?: string
}) {
  const activeColor = active && color ? color : undefined
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={cn(
        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap',
        active
          ? 'font-bold'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        collapsed && 'justify-center px-0',
      )}
      style={active ? {
        color: activeColor ?? 'var(--primary)',
        backgroundColor: activeColor ? `${activeColor}1a` : 'var(--primary-soft, color-mix(in srgb, var(--primary) 10%, transparent))',
      } : undefined}
    >
      <Icon className="size-[18px] shrink-0" />
      {!collapsed && <span>{label}</span>}
    </Link>
  )
}
