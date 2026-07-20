'use client'

import { type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ChatsHome } from '@/components/chats-home'
import { TopBar } from '@/components/top-bar'
import { MobileDrawer } from '@/components/mobile/mobile-drawer'
import { PageVisibilityProvider } from '@/components/page-visibility-context'

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  // /chats et /atlas fournissent DÉJÀ la colonne Conversations (leur layout ChatsShell).
  const isChats = pathname === '/chats' || pathname.startsWith('/chats/')
  const isChatFil = pathname.startsWith('/chats/') // fil contact : pleine hauteur, composeur fixed
  const isAtlasChat = pathname === '/atlas' || pathname.startsWith('/atlas/')
  const ownColumn = isChats || isAtlasChat

  // Pages atteintes via le menu « ⋯ » → plein écran, sans bottom bar (mobile).
  // La fiche contact /contacts/[id] est plein écran (charte profil), mais PAS la liste /contacts.
  const navHidden = ['/profile/edit', '/settings', '/abonnement', '/mon-abonnement', '/activities', '/notifications', '/nova/campagne'].some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  ) || pathname.startsWith('/contacts/')

  return (
    <PageVisibilityProvider>
      {/* LA nav unique de l'app = la colonne Conversations (desktop), épinglée à gauche PARTOUT.
          Remplace l'ancien DesktopNav (supprimé). Sur /chats et /atlas, le ChatsShell la fournit
          déjà → on ne la double pas ici. Mobile : masquée (le chrome mobile gère). */}
      {!ownColumn && (
        <aside className="hidden lg:block fixed left-0 top-0 z-40 h-dvh w-[340px] overflow-y-auto border-r border-border bg-background">
          <ChatsHome />
        </aside>
      )}

      <div
        className={cn(
          'app-shell md:pb-0 md:max-w-none md:mx-0',
          // Atlas/fil mobile : hauteur figée = zéro scroll du document (composeur fixed)
          isAtlasChat || isChatFil ? 'max-lg:h-[100dvh] max-lg:overflow-hidden' : '',
          'transition-[padding-left] duration-200 ease-out',
          ownColumn ? 'lg:pl-0' : 'lg:pl-[340px]',
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
