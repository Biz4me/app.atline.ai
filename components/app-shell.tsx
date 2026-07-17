'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DesktopNav } from '@/components/desktop-nav'
import { AtlasSidebar } from '@/components/atlas-sidebar'
import { TopBar } from '@/components/top-bar'
import { MobileDrawer } from '@/components/mobile/mobile-drawer'
import { ShellComposer } from '@/components/mobile/shell-composer'
import { PageVisibilityProvider } from '@/components/page-visibility-context'

interface Props {
  children: ReactNode
  initialCollapsed: boolean
  initialAtlasCollapsed: boolean
}

export function AppShell({ children, initialCollapsed, initialAtlasCollapsed }: Props) {
  const pathname = usePathname()
  // Pages où le rail droit reste mais réduit aux agents (jamais déplié)
  const railCollapsedOnly = ['/atlas', '/aria', '/nova', '/messages', '/chats'].some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  )
  // Nav messagerie (chantier parallèle) : /chats gère son propre chrome (rangée unique, composeur du fil)
  const isChats = pathname === '/chats' || pathname.startsWith('/chats/')
  const isChatFil = pathname.startsWith('/chats/') // fil contact : pleine hauteur, composeur fixed (comme Atlas)
  // UNE sidebar desktop (le tiroir mobile épinglé) — plus de rail + sidebar 2 à 2 étages
  const sidebarEdge = 260

  // Pages atteintes via le menu « ⋯ » → plein écran, sans bottom bar (mobile)
  // La fiche contact /contacts/[id] est plein écran (charte profil), mais PAS la liste /contacts.
  const navHidden = ['/profile/edit', '/settings', '/abonnement', '/mon-abonnement', '/activities', '/notifications', '/nova/campagne'].some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  ) || pathname.startsWith('/contacts/')
  // Atlas : layout pleine hauteur qui gère son propre composeur → pas de pb du shell (sinon scroll)
  const isAtlasChat = pathname === '/atlas' || pathname.startsWith('/atlas/')

  const [collapsed, setCollapsed] = useState(initialCollapsed)
  const [atlasCollapsed, setAtlasCollapsed] = useState(initialAtlasCollapsed)

  useEffect(() => {
    if (pathname.startsWith('/contacts')) {
      setAtlasCollapsed(false)
    }
  }, [pathname])

  const toggle = () => {
    setCollapsed((v) => {
      const next = !v
      localStorage.setItem('sidebar-collapsed', next ? '1' : '0')
      document.cookie = `sidebar-collapsed=${next ? '1' : '0'};path=/;max-age=31536000;samesite=lax`
      return next
    })
  }

  const toggleAtlas = () => {
    setAtlasCollapsed((v) => {
      const next = !v
      localStorage.setItem('atlas-sidebar-collapsed', next ? '1' : '0')
      document.cookie = `atlas-sidebar-collapsed=${next ? '1' : '0'};path=/;max-age=31536000;samesite=lax`
      return next
    })
  }

  return (
    <PageVisibilityProvider>
      <DesktopNav hidden={collapsed} onToggle={toggle} />
      <AtlasSidebar collapsed={atlasCollapsed} onToggle={toggleAtlas} />

      {/* Rouvrir la nav — visible SEULEMENT quand elle est repliée (le repli vit DANS la sidebar) */}
      {collapsed && (
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
          navHidden || isAtlasChat || isChats ? '' : 'pb-[76px]',
          // Atlas mobile : hauteur figée = zéro scroll du document (le résidu est clippé, le composeur est fixed)
          isAtlasChat || isChatFil ? 'max-lg:h-[100dvh] max-lg:overflow-hidden' : '',
          'transition-[padding-left,padding-right] duration-200 ease-out',
          collapsed ? 'lg:pl-0' : 'lg:pl-[260px]',
          railCollapsedOnly ? 'lg:pr-0' : atlasCollapsed ? 'lg:pr-16' : 'lg:pr-[360px]',
        )}
      >
        {/* Chrome mobile global : barre du haut (hamburger → tiroir) + barre Atlas en bas */}
        {!navHidden && !isChats && <TopBar />}
        {/* Pages du menu « Plus » (plein écran) : entrée par la droite sur mobile — règle commune */}
        {navHidden ? (
          <div className="overflow-x-clip">
            <div key={pathname} className="animate-slide-in-right lg:animate-none">{children}</div>
          </div>
        ) : (
          children
        )}
        {!navHidden && !isChats && <ShellComposer />}
      </div>
      <MobileDrawer />
    </PageVisibilityProvider>
  )
}
