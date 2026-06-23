'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Route, ContactRound, SquarePen, BookOpen, MessageSquare, Calendar, Sparkles, Grid3X3, Moon, Sun, Wrench, X } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { BusinessSwitcher } from '@/components/business-switcher'
import { usePageVisibility } from '@/components/page-visibility-context'

const ALL_NAV_TABS = [
  { href: '/home',      icon: Route,        label: 'Parcours',  visKey: 'home'      },
  { href: '/contacts',  icon: ContactRound, label: 'CRM',       visKey: 'contacts'  },
  { href: '/nova',      icon: SquarePen,    label: 'Contenu',   visKey: 'nova'      },
  { href: '/formation', icon: BookOpen,     label: 'Formation', visKey: 'formation' },
]

const QUICK_MENU = [
  { href: '/toolbox', icon: Wrench, label: 'Boîte à outils', desc: 'Liens, supports, bots', visKey: 'toolbox' },
]

export function DesktopTopBar() {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const vis = usePageVisibility()

  const NAV_TABS = ALL_NAV_TABS.filter(t => vis[t.visKey] !== false)
  const visibleQuickMenu = QUICK_MENU.filter(t => vis[t.visKey] !== false)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  return (
    <header className="hidden lg:flex fixed top-0 left-0 right-0 h-14 z-50 items-center border-b border-border bg-background/95 backdrop-blur px-4">
      {/* Left */}
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

        {/* Apps menu */}
        {visibleQuickMenu.length > 0 && (
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className={cn(
                'flex size-10 items-center justify-center rounded-full transition-colors',
                menuOpen
                  ? 'bg-primary/10 text-primary ring-2 ring-primary/30'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              {menuOpen
                ? <X className="size-[20px] stroke-[1.5]" />
                : <Grid3X3 className="size-[26px] stroke-[1.5]" />
              }
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-12 w-56 rounded-2xl border border-border bg-background shadow-xl overflow-hidden z-50">
                <div className="px-3 py-2 border-b border-border">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Menu rapide</p>
                </div>
                {visibleQuickMenu.map((item) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.href}
                      type="button"
                      onClick={() => { setMenuOpen(false); router.push(item.href) }}
                      className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-muted transition-colors"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted">
                        <Icon className="size-4 stroke-[1.5] text-muted-foreground" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {vis['messages'] !== false && (
          <Link
            href="/messages"
            className="flex size-10 items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors"
          >
            <MessageSquare className="size-[26px] stroke-[1.5]" />
          </Link>
        )}
        {vis['agenda'] !== false && (
          <Link
            href="/agenda"
            className="flex size-10 items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors"
          >
            <Calendar className="size-[26px] stroke-[1.5]" />
          </Link>
        )}
        {vis['atlas'] !== false && (
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
        )}
      </div>
    </header>
  )
}
