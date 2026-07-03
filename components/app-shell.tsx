'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DesktopSidebar } from '@/components/desktop-sidebar'
import { AtlasSidebar } from '@/components/atlas-sidebar'
import { DesktopTopBar } from '@/components/desktop-top-bar'
import { DesktopSectionRail } from '@/components/desktop-section-rail'
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
  const railCollapsedOnly = ['/atlas', '/aria', '/nova', '/messages'].some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  )
  // Pages agent : sidebar 2 = historique, élargie à 256px (bord à 64+256 = 320)
  const isAgentPage = ['/atlas', '/aria', '/nova'].some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  )
  const sidebarEdge = isAgentPage ? 320 : 256

  // Pages atteintes via le menu « ⋯ » → plein écran, sans bottom bar (mobile)
  // La fiche contact /contacts/[id] est plein écran (charte profil), mais PAS la liste /contacts.
  const navHidden = ['/profile/edit', '/settings', '/abonnement', '/mon-abonnement', '/activities', '/notifications'].some(
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
      <DesktopTopBar />
      <DesktopSectionRail hidden={collapsed} />
      <DesktopSidebar hidden={collapsed} />
      <AtlasSidebar collapsed={atlasCollapsed} onToggle={toggleAtlas} />

      {/* Toggle nav (focus) — masque/affiche rail + sidebar 2, hauteur fixe */}
      <button
        type="button"
        onClick={toggle}
        title={collapsed ? 'Afficher la navigation' : 'Masquer la navigation'}
        style={{ left: collapsed ? 32 : sidebarEdge }}
        className="hidden lg:flex fixed top-[78px] z-[45] -translate-x-1/2 size-6 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-all duration-200 hover:text-foreground hover:bg-muted"
      >
        {collapsed ? <ChevronRight className="size-3.5" /> : <ChevronLeft className="size-3.5" />}
      </button>

      <div
        className={cn(
          'app-shell lg:pb-0 lg:max-w-none lg:mx-0 lg:pt-14',
          navHidden || isAtlasChat ? '' : 'pb-[76px]',
          // Atlas mobile : hauteur figée = zéro scroll du document (le résidu est clippé, le composeur est fixed)
          isAtlasChat ? 'max-lg:h-[100dvh] max-lg:overflow-hidden' : '',
          'transition-[padding-left,padding-right] duration-200 ease-out',
          collapsed ? (railCollapsedOnly ? 'lg:pl-14' : 'lg:pl-0') : (isAgentPage ? 'lg:pl-[320px]' : 'lg:pl-[256px]'),
          railCollapsedOnly ? 'lg:pr-16' : atlasCollapsed ? 'lg:pr-16' : 'lg:pr-[360px]',
        )}
      >
        {/* Chrome mobile global : barre du haut (hamburger → tiroir) + barre Atlas en bas */}
        {!navHidden && <TopBar />}
        {/* Pages du menu « Plus » (plein écran) : entrée par la droite sur mobile — règle commune */}
        {navHidden ? (
          <div className="overflow-x-clip">
            <div key={pathname} className="animate-slide-in-right lg:animate-none">{children}</div>
          </div>
        ) : (
          children
        )}
        {!navHidden && <ShellComposer />}
      </div>
      <MobileDrawer />
    </PageVisibilityProvider>
  )
}
