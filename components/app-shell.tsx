'use client'

import { useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DesktopNav } from '@/components/desktop-nav'
import { TopBar } from '@/components/top-bar'
import { MobileDrawer } from '@/components/mobile/mobile-drawer'
import { PageVisibilityProvider } from '@/components/page-visibility-context'

interface Props {
  children: ReactNode
  initialCollapsed: boolean
}

export function AppShell({ children, initialCollapsed }: Props) {
  const pathname = usePathname()
  // Nav messagerie : /chats gère son propre chrome (rangée unique, composeur du fil)
  const isChats = pathname === '/chats' || pathname.startsWith('/chats/')
  const isChatFil = pathname.startsWith('/chats/') // fil contact : pleine hauteur, composeur fixed (comme Atlas)

  // Pages atteintes via le menu « ⋯ » → plein écran, sans bottom bar (mobile)
  // La fiche contact /contacts/[id] est plein écran (charte profil), mais PAS la liste /contacts.
  const navHidden = ['/profile/edit', '/settings', '/abonnement', '/mon-abonnement', '/activities', '/notifications', '/nova/campagne'].some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  ) || pathname.startsWith('/contacts/')
  // Atlas : layout pleine hauteur qui gère son propre composeur → pas de pb du shell (sinon scroll)
  const isAtlasChat = pathname === '/atlas' || pathname.startsWith('/atlas/')

  const [collapsed, setCollapsed] = useState(initialCollapsed)

  const toggle = () => {
    setCollapsed((v) => {
      const next = !v
      localStorage.setItem('sidebar-collapsed', next ? '1' : '0')
      document.cookie = `sidebar-collapsed=${next ? '1' : '0'};path=/;max-age=31536000;samesite=lax`
      return next
    })
  }

  return (
    <PageVisibilityProvider>
      {/* T10b : sur les surfaces messagerie, la colonne Conversations REMPLACE l'ancienne nav desktop.
          Plus de rail droit (AtlasSidebar) : Atlas est une CONVERSATION, pas un composeur permanent. */}
      <DesktopNav hidden={collapsed || isChats || isAtlasChat} onToggle={toggle} />

      {/* Rouvrir la nav — visible SEULEMENT quand elle est repliée (le repli vit DANS la sidebar) */}
      {collapsed && !isChats && !isAtlasChat && (
        <button
          type="button"
          onClick={toggle}
          title="Afficher la navigation"
          className="hidden lg:flex fixed left-3 top-5 z-[45] size-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronRight className="size-4" />
        </button>
      )}

      <div
        className={cn(
          'app-shell lg:pb-0 lg:max-w-none lg:mx-0',
          // Atlas/fil mobile : hauteur figée = zéro scroll du document (composeur fixed)
          isAtlasChat || isChatFil ? 'max-lg:h-[100dvh] max-lg:overflow-hidden' : '',
          'transition-[padding-left] duration-200 ease-out',
          collapsed || isChats || isAtlasChat ? 'lg:pl-0' : 'lg:pl-[260px]',
        )}
      >
        {/* Chrome mobile global : barre du haut (hamburger → tiroir) */}
        {!navHidden && !isChats && !isAtlasChat && <TopBar />}
        {/* Pages du menu « Plus » (plein écran) : entrée par la droite sur mobile — règle commune */}
        {navHidden ? (
          <div className="overflow-x-clip">
            <div key={pathname} className="animate-slide-in-right lg:animate-none">{children}</div>
          </div>
        ) : (
          children
        )}
      </div>
      <MobileDrawer />
    </PageVisibilityProvider>
  )
}
