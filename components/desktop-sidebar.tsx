'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Compass, Sparkles, Users, Users2, GitFork, Zap,
  BookOpen, CalendarDays, MessageSquare, Wrench,
  Settings, User, PanelLeftClose, PanelLeftOpen, Mic,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { BusinessSwitcher } from '@/components/business-switcher'

// Ordre = flux naturel de l'utilisateur (action directe)
const NAV_PRIMARY = [
  { href: '/home',      label: 'Parcours',    icon: Compass },
  { href: '/atlas',     label: 'Atlas',       icon: Sparkles },
  { href: '/contacts',  label: 'Contacts',    icon: Users },
  { href: '/aria',      label: 'Simulation',  icon: Mic },
  { href: '/agenda',    label: 'Agenda',      icon: CalendarDays },
  { href: '/messages',  label: 'Messages',    icon: MessageSquare },
  { href: '/nova',      label: 'Nova',        icon: Zap },
  { href: '/network',   label: 'Réseau',      icon: GitFork },
]

// Support (développement + paramétrage)
const NAV_SECONDARY = [
  { href: '/formation',  label: 'Formation',   icon: BookOpen },
  { href: '/communaute', label: 'Communauté',  icon: Users2 },
  { href: '/toolbox',    label: 'Outils',      icon: Wrench },
]

interface Props {
  collapsed: boolean
  onToggle: () => void
}

export function DesktopSidebar({ collapsed, onToggle }: Props) {
  const pathname = usePathname()
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col fixed left-0 top-0 h-dvh z-40',
        'bg-surface border-r border-border overflow-hidden',
        'transition-[width] duration-200 ease-out',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* BusinessSwitcher + toggle collapse */}
      <div className={cn(
        'flex items-center gap-2 px-3 py-3 shrink-0',
        collapsed ? 'flex-col justify-center px-2' : '',
      )}>
        <BusinessSwitcher collapsed={collapsed} />
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            'flex items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
            collapsed ? 'size-8 mt-1' : 'ml-auto size-8',
          )}
        >
          {collapsed
            ? <PanelLeftOpen className="size-4" />
            : <PanelLeftClose className="size-4" />
          }
        </button>
      </div>

      <div className="mx-3 h-px bg-border shrink-0" />

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 px-2 pt-3 flex-1 overflow-y-auto overflow-x-hidden">
        {NAV_PRIMARY.map((item) => (
          <NavItem key={item.href} {...item} active={isActive(item.href)} collapsed={collapsed} />
        ))}

        <div className="mx-1 my-2 h-px bg-border" />

        {NAV_SECONDARY.map((item) => (
          <NavItem key={item.href} {...item} active={isActive(item.href)} collapsed={collapsed} />
        ))}
      </nav>

      {/* Bottom */}
      <div className="shrink-0 flex flex-col gap-0.5 px-2 pb-3 pt-1">
        <div className="mx-1 mb-1 h-px bg-border" />

        <NavItem href="/settings" label="Paramètres" icon={Settings} active={isActive('/settings')} collapsed={collapsed} />
        <NavItem href="/profile"  label="Mon profil" icon={User}     active={isActive('/profile')}  collapsed={collapsed} />
      </div>
    </aside>
  )
}

function NavItem({
  href, label, icon: Icon, active, collapsed,
}: {
  href: string
  label: string
  icon: typeof Compass
  active: boolean
  collapsed: boolean
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={cn(
        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap',
        active
          ? 'bg-primary/10 text-primary font-semibold'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        collapsed && 'justify-center px-0',
      )}
    >
      <Icon className={cn('size-[18px] shrink-0', active && 'text-primary')} />
      {!collapsed && <span>{label}</span>}
    </Link>
  )
}
