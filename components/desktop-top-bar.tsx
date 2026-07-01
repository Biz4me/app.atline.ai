'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { MessageSquare, Calendar, Grid3X3, Moon, Sun, Wrench, X } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { BusinessSwitcher } from '@/components/business-switcher'
import { usePageVisibility } from '@/components/page-visibility-context'
import { getPageTitle } from '@/components/desktop-sidebar'

const QUICK_MENU: { href: string; icon: typeof Wrench; label: string; desc: string; visKey: string }[] = []

export function DesktopTopBar() {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const vis = usePageVisibility()

  const visibleQuickMenu = QUICK_MENU.filter(t => vis[t.visKey] !== false)
  const sectionTitle = getPageTitle(pathname)

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
    <header className="hidden lg:flex fixed top-0 left-0 right-0 h-14 z-50 items-center border-b border-border bg-background/95 backdrop-blur pr-4">
      {/* Left — avatar aligné avec le rail (zone 64px) */}
      <div className="w-[256px] flex-shrink-0">
        <BusinessSwitcher variant="popover" />
      </div>

      {/* Center — titre de section (orientation) */}
      <div className="flex flex-1 items-center justify-center">
        {sectionTitle && (
          <span className="text-sm font-medium text-foreground">{sectionTitle}</span>
        )}
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
      </div>
    </header>
  )
}
