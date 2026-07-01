'use client'

import { usePathname } from 'next/navigation'
import { History, Plus, Menu, ChevronLeft } from 'lucide-react'
import { useOverlay } from '@/components/overlay-provider'
import { titleForPath, isAgentPath } from '@/components/mobile/nav-config'
import { AgentSwitcher } from '@/components/mobile/agent-switcher'

export function TopBar() {
  const pathname = usePathname()
  const { setOpenId } = useOverlay()

  const iconCls = (active: boolean) =>
    `flex size-10 items-center justify-center rounded-full transition-colors active:bg-muted ${active ? 'text-primary' : 'text-muted-foreground'}`

  return (
    <header
      className="lg:hidden sticky top-0 z-30 flex items-center gap-2 bg-background/90 px-2 py-3 backdrop-blur"
      style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
    >
      <div className="flex flex-1 items-center gap-1">
        {isAgentPath(pathname) ? (
          // Atlas/agents (= maison) : hamburger → ouvre le menu
          <button type="button" aria-label="Menu" onClick={() => setOpenId('drawer')} className={`relative ${iconCls(false)}`}>
            <Menu className="size-6 stroke-[1.5]" />
            <span className="absolute right-1.5 top-1.5 size-2.5 rounded-full bg-destructive ring-2 ring-background" />
          </button>
        ) : (
          // Pages atteintes via le menu : flèche retour → rouvre le tiroir
          <button type="button" aria-label="Retour au menu" onClick={() => setOpenId('drawer')} className={`relative ${iconCls(false)}`}>
            <ChevronLeft className="size-6 stroke-[1.5]" />
            <span className="absolute right-1.5 top-1.5 size-2.5 rounded-full bg-destructive ring-2 ring-background" />
          </button>
        )}
      </div>

      {isAgentPath(pathname) ? (
        <AgentSwitcher />
      ) : (
        <span className="max-w-[62%] truncate text-center text-lg font-semibold text-foreground">{titleForPath(pathname)}</span>
      )}

      <div className="flex flex-1 items-center justify-end gap-1">
        {isAgentPath(pathname) && (
          <>
            <button type="button" aria-label="Historique" onClick={() => window.dispatchEvent(new Event('agent:history'))} className={iconCls(false)}>
              <History className="size-5 stroke-[1.5]" />
            </button>
            <button type="button" aria-label="Nouvelle conversation" onClick={() => window.dispatchEvent(new Event('agent:new'))} className={iconCls(false)}>
              <Plus className="size-5 stroke-[1.5]" />
            </button>
          </>
        )}
      </div>
    </header>
  )
}
