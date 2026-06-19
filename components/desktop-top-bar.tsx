'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Route, ContactRound, SquarePen, BookOpen, MessageSquare, CalendarDays, Sparkles, Grid3X3, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
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
  const { theme, setTheme } = useTheme()

  return (
    <header className="hidden lg:flex fixed top-0 left-0 right-0 h-14 z-50 items-center border-b border-border bg-background/95 backdrop-blur px-4">
      {/* Left — company switcher aligned with left sidebar width */}
      <div className="w-60 flex-shrink-0">
        <BusinessSwitcher variant="popover" />
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
              <Icon className={cn('size-[26px]', active ? 'stroke-[2]' : 'stroke-[1.5]')} />
              {active && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-[3px] bg-primary" />
              )}
            </Link>
          )
        })}
      </div>

      {/* Right — utilities */}
      <div className="w-60 flex-shrink-0 flex items-center justify-end gap-1">
        {/* Provisoire — remplacé par Settings */}
        <button
          type="button"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
          className="flex size-10 items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors outline-none"
        >
          {theme === 'dark'
            ? <Sun className="size-[18px] stroke-[1.5]" />
            : <Moon className="size-[18px] stroke-[1.5]" />
          }
        </button>
        <button
          type="button"
          className="flex size-10 items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors"
        >
          <Grid3X3 className="size-[26px] stroke-[1.5]" />
        </button>
        <Link
          href="/messages"
          className="flex size-10 items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors"
        >
          <MessageSquare className="size-[26px] stroke-[1.5]" />
        </Link>
        <Link
          href="/agenda"
          className="flex size-10 items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors"
        >
          <CalendarDays className="size-[26px] stroke-[1.5]" />
        </Link>
        <Link
          href="/atlas"
          className={cn(
            'flex size-10 items-center justify-center rounded-full transition-colors',
            pathname.startsWith('/atlas')
              ? 'bg-primary text-primary-foreground'
              : 'text-primary hover:bg-accent'
          )}
        >
          <Sparkles className="size-[26px] stroke-[1.5]" />
        </Link>
      </div>
    </header>
  )
}
