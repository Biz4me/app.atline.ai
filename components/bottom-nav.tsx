'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, type CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import { Home, Users, MessageSquare, BookOpen, Sparkles, Mic, SquarePen } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const TABS: { href: string; label: string; icon: LucideIcon; match: string[] }[] = [
  { href: '/home',      label: 'Accueil',   icon: Home,          match: ['/home', '/rapport'] },
  { href: '/contacts',  label: 'Terrain',   icon: Users,         match: ['/contacts'] },
  { href: '/messages',  label: 'Échanges',  icon: MessageSquare, match: ['/messages', '/communaute'] },
  { href: '/formation', label: 'Formation', icon: BookOpen,      match: ['/formation', '/communaute'] },
]

const AGENTS: { href: string; label: string; sub: string; icon: LucideIcon; color: string }[] = [
  { href: '/atlas', label: 'Atlas', sub: "Coach IA",           icon: Sparkles,  color: '#F97316' },
  { href: '/aria',  label: 'Aria',  sub: "Simulateur terrain", icon: Mic,       color: '#14B8A6' },
  { href: '/nova',  label: 'Nova',  sub: "Réseaux sociaux",    icon: SquarePen, color: '#8B5CF6' },
]

const AGENT_PATHS = AGENTS.map(a => a.href)

export function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [agentsOpen, setAgentsOpen] = useState(false)

  const isTabActive = (match: string[]) =>
    match.some(m => pathname === m || pathname.startsWith(m + '/'))

  const isAgentsActive = AGENT_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))

  const renderTab = (tab: typeof TABS[number]) => {
    const Icon = tab.icon
    const active = isTabActive(tab.match)
    return (
      <Link
        key={tab.href}
        href={tab.href}
        onClick={() => setAgentsOpen(false)}
        className={cn(
          'flex flex-1 items-center justify-center p-2 transition-colors',
          active ? 'text-primary' : 'text-muted-foreground'
        )}
      >
        <Icon className={cn('size-6 stroke-[1.5]', active && 'stroke-2')} />
      </Link>
    )
  }

  return (
    <>
      {/* ── Agents sheet backdrop ── (s'arrête au-dessus de la nav pour la garder visible) */}
      {agentsOpen && (
        <div
          className="lg:hidden fixed inset-x-0 top-0 z-[44] bg-black/40 transition-opacity duration-300"
          style={{ bottom: '60px' }}
          onClick={() => setAgentsOpen(false)}
        />
      )}

      {/* ── Agents — bande horizontale ── (z sous la nav : slide au-dessus des 60px, nav reste visible) */}
      <div
        className={cn(
          'lg:hidden fixed inset-x-0 z-[45] mx-auto max-w-[480px] rounded-t-[24px] bg-surface shadow-[0_-12px_40px_rgba(0,0,0,0.18)] transition-transform duration-300 ease-out',
          agentsOpen ? 'translate-y-0' : 'translate-y-full'
        )}
        style={{ bottom: '60px' }}
      >
        {/* Rangée horizontale — même vocabulaire que le switcher MLM */}
        <div className="flex items-start justify-around px-4 pt-6 pb-7">
          {AGENTS.map((agent) => {
            const Icon = agent.icon
            const active = pathname === agent.href || pathname.startsWith(agent.href + '/')
            return (
              <button
                key={agent.href}
                type="button"
                onClick={() => { setAgentsOpen(false); router.push(agent.href) }}
                className="flex flex-col items-center gap-2"
              >
                <span
                  className={cn(
                    'flex size-14 items-center justify-center rounded-full transition-all',
                    active && 'ring-2 ring-offset-2 ring-offset-surface'
                  )}
                  style={{
                    backgroundColor: agent.color + '18',
                    ...(active ? { '--tw-ring-color': agent.color } as CSSProperties : {}),
                  }}
                >
                  <Icon className="size-6 stroke-[1.5]" style={{ color: agent.color }} />
                </span>
                <span className="text-xs font-semibold text-foreground">{agent.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Nav bar ── */}
      <nav className="lg:hidden fixed inset-x-0 bottom-0 z-[47] mx-auto max-w-[480px] bg-surface/95 backdrop-blur-md border-t border-border">
        <div className="flex h-[60px] items-center justify-around px-1">
          {/* 2 onglets à gauche */}
          {TABS.slice(0, 2).map(renderTab)}

          {/* Agents — héros central (lanceur, pas un onglet) */}
          <button
            type="button"
            onClick={() => setAgentsOpen(v => !v)}
            aria-label="Agents IA"
            className="flex flex-1 items-center justify-center"
          >
            <span
              className={cn(
                'flex size-11 items-center justify-center rounded-full transition-colors',
                isAgentsActive || agentsOpen
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/30'
                  : 'bg-primary/10 text-primary'
              )}
            >
              <Sparkles className="size-6 stroke-[1.5]" />
            </span>
          </button>

          {/* 2 onglets à droite */}
          {TABS.slice(2).map(renderTab)}
        </div>
      </nav>
    </>
  )
}
