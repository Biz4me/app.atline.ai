'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { History, Plus, ChevronLeft } from 'lucide-react'
import { titleForPath, isAgentPath, AGENTS } from '@/components/mobile/nav-config'

export function TopBar() {
  const pathname = usePathname()
  const router = useRouter()
  // Atlas = fil UNIQUE et continu (façon WhatsApp) : pas de « nouveau chat » (on n'ouvre pas un 2e fil
  // avec le même interlocuteur). Le « + » reste pour les autres agents (Nova : nouvelle campagne).
  const isAtlas = pathname === '/atlas' || pathname.startsWith('/atlas/')

  // Pastille du hamburger = VRAIES notifications non lues (rafraîchie à chaque navigation,
  // donc s'éteint dès qu'on revient de la page notifications)
  const [unread, setUnread] = useState(0)
  useEffect(() => {
    fetch('/api/notifications').then((r) => (r.ok ? r.json() : null))
      .then((d) => setUnread((d?.notifications ?? []).filter((n: { unread: boolean }) => n.unread).length))
      .catch(() => {})
  }, [pathname])

  const iconCls = (active: boolean) =>
    `flex size-10 items-center justify-center rounded-full transition-colors active:bg-muted ${active ? 'text-primary' : 'text-muted-foreground'}`

  return (
    <header
      className="lg:hidden sticky top-0 z-30 flex items-center gap-2 bg-background/90 px-2 py-3 backdrop-blur"
      style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
    >
      <div className="flex flex-1 items-center gap-1">
        {/* Bascule nav messagerie : toute page revient à la LISTE (fil ← liste, geste Telegram) */}
        <button type="button" aria-label="Retour aux messages" onClick={() => router.push('/chats')} className={`relative ${iconCls(false)}`}>
          <ChevronLeft className="size-6 stroke-[1.5]" />
          {unread > 0 && <span className="absolute right-1.5 top-1.5 size-2.5 rounded-full bg-destructive ring-2 ring-background" />}
        </button>
      </div>

      {isAgentPath(pathname) ? (
        // Plus de switcher : le titre porte l'agent, teinté à sa couleur (le repérage, c'est la couleur)
        (() => {
          const agent = AGENTS.find((a) => pathname === a.href || pathname.startsWith(a.href + '/'))
          return (
            <span className="flex items-center gap-2 text-lg font-semibold" style={{ color: agent?.color }}>
              <span className="size-2 rounded-full" style={{ background: agent?.color }} />
              {agent?.label}
            </span>
          )
        })()
      ) : (
        <span className="max-w-[62%] truncate text-center text-lg font-semibold text-foreground">{titleForPath(pathname)}</span>
      )}

      <div className="flex flex-1 items-center justify-end gap-1">
        {isAgentPath(pathname) && (
          <>
            <button type="button" aria-label="Historique" onClick={() => window.dispatchEvent(new Event('agent:history'))} className={iconCls(false)}>
              <History className="size-5 stroke-[1.5]" />
            </button>
            {!isAtlas && (
              <button type="button" aria-label="Nouvelle conversation" onClick={() => window.dispatchEvent(new Event('agent:new'))} className={iconCls(false)}>
                <Plus className="size-5 stroke-[1.5]" />
              </button>
            )}
          </>
        )}
      </div>
    </header>
  )
}
