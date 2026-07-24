'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Plus, ChevronLeft } from 'lucide-react'
import { titleForPath, isAgentPath, AGENTS } from '@/components/mobile/nav-config'

export function TopBar() {
  const pathname = usePathname()
  const router = useRouter()
  // Atlas = fil UNIQUE et continu (façon WhatsApp) : pas de « nouveau chat » (on n'ouvre pas un 2e fil
  // avec le même interlocuteur). Le « + » reste pour les autres agents (Nova : nouvelle campagne).
  const isAtlas = pathname === '/atlas' || pathname.startsWith('/atlas/')

  // Destinations racines de la nav (refonte) : ce sont des onglets de la bottom bar, pas des fils —
  // donc PAS de flèche « retour vers /chats » (vestige de l'ancienne messagerie).
  const HUB_ROOTS = ['/home', '/communaute', '/agenda', '/formation']
  const hubRoot = HUB_ROOTS.includes(pathname)

  // Pastille du hamburger = VRAIES notifications non lues (rafraîchie à chaque navigation,
  // donc s'éteint dès qu'on revient de la page notifications)
  const [unread, setUnread] = useState(0)
  useEffect(() => {
    fetch('/api/notifications').then((r) => (r.ok ? r.json() : null))
      .then((d) => setUnread((d?.notifications ?? []).filter((n: { unread: boolean }) => n.unread).length))
      .catch(() => {})
  }, [pathname])

  // Mon compte sur mobile = l'avatar en haut à droite (le pied du rail le fait sur desktop).
  const [avatar, setAvatar] = useState<{ photoUrl: string; initials: string }>({ photoUrl: '', initials: '' })
  useEffect(() => {
    fetch('/api/me').then((r) => (r.ok ? r.json() : null)).then((u) => {
      if (u) setAvatar({ photoUrl: u.photoUrl || '', initials: `${(u.firstName || '')[0] ?? ''}${(u.lastName || '')[0] ?? ''}`.toUpperCase() })
    }).catch(() => {})
  }, [])

  const iconCls = (active: boolean) =>
    `flex size-10 items-center justify-center rounded-full transition-colors active:bg-muted ${active ? 'text-primary' : 'text-muted-foreground'}`

  return (
    <header
      className="lg:hidden sticky top-0 z-30 flex items-center gap-2 bg-background/90 px-2 py-3 backdrop-blur"
      style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
    >
      <div className="flex flex-1 items-center gap-1">
        {/* Retour vers Espaces — seulement hors des onglets racines (un hub n'a pas de « retour ») */}
        {!hubRoot && (
          <button type="button" aria-label="Retour aux messages" onClick={() => router.push('/chats')} className={`relative ${iconCls(false)}`}>
            <ChevronLeft className="size-6 stroke-[1.5]" />
            {unread > 0 && <span className="absolute right-1.5 top-1.5 size-2.5 rounded-full bg-destructive ring-2 ring-background" />}
          </button>
        )}
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
        {/* Atlas = fil unique : ni « nouveau chat » ni historique. Le « + » reste pour Nova (nouvelle campagne). */}
        {isAgentPath(pathname) && !isAtlas && (
          <button type="button" aria-label="Nouvelle conversation" onClick={() => window.dispatchEvent(new Event('agent:new'))} className={iconCls(false)}>
            <Plus className="size-5 stroke-[1.5]" />
          </button>
        )}
        {/* Mon compte — avatar (photo ou initiales) → hub /compte (profil, activité, abonnement, réglages, switcher MLM) */}
        <button
          type="button"
          onClick={() => router.push('/compte')}
          aria-label="Mon compte"
          className="relative size-9 shrink-0 overflow-hidden rounded-full ring-1 ring-border active:opacity-80 transition-opacity"
        >
          {avatar.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar.photoUrl} alt="" className="size-full object-cover" />
          ) : (
            <span className="grid size-full place-items-center bg-[#3B82F6] text-xs font-semibold text-white">{avatar.initials || 'A'}</span>
          )}
        </button>
      </div>
    </header>
  )
}
