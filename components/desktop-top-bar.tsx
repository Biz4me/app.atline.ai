'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Route, ContactRound, SquarePen, BookOpen, MessageSquare, CalendarDays, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BusinessSwitcher } from '@/components/business-switcher'

const NAV_TABS = [
  { href: '/home',      icon: Route,        label: 'Parcours'  },
  { href: '/contacts',  icon: ContactRound, label: 'CRM'       },
  { href: '/nova',      icon: SquarePen,    label: 'Contenu'   },
  { href: '/formation', icon: BookOpen,     label: 'Formation' },
]

export function DesktopTopBar() {
  const pathname = usePathname()

  return (
    <header className="hidden lg:flex fixed top-0 left-0 right-0 h-14 z-50 items-center border-b border-border bg-background/95 backdrop-blur px-4">
      {/* Left — company switcher aligned with left sidebar width */}
      <div className="w-60 flex-shrink-0">
        <BusinessSwitcher />
      </div>

      {/* Center — section tabs */}
      <div className="flex flex-1 h-full items-stretch justify-center">
        {NAV_TABS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={cn(
                'relative flex items-center justify-center px-5 transition-colors',
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('size-5', active ? 'stroke-[2]' : 'stroke-[1.5]')} />
              {active && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-primary" />
              )}
            </Link>
          )
        })}
      </div>

      {/* Right — utilities */}
      <div className="w-60 flex-shrink-0 flex items-center justify-end gap-1">
        <Link
          href="/messages"
          className="flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors"
        >
          <MessageSquare className="size-5 stroke-[1.5]" />
        </Link>
        <Link
          href="/agenda"
          className="flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors"
        >
          <CalendarDays className="size-5 stroke-[1.5]" />
        </Link>
        <Link
          href="/atlas"
          className={cn(
            'flex size-9 items-center justify-center rounded-full transition-colors',
            pathname.startsWith('/atlas')
              ? 'bg-primary text-primary-foreground'
              : 'text-primary hover:bg-accent'
          )}
        >
          <Sparkles className="size-5 stroke-[1.5]" />
        </Link>
      </div>
    </header>
  )
}
