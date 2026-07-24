'use client'

import { type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { TopBar } from '@/components/top-bar'
import { PrimaryNav } from '@/components/primary-nav'
import { PageVisibilityProvider } from '@/components/page-visibility-context'

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  // /chats et /atlas fournissent DÉJÀ la colonne Conversations (leur layout ChatsShell).
  const isChats = pathname === '/chats' || pathname.startsWith('/chats/')
  const isChatFil = pathname.startsWith('/chats/') // fil contact : pleine hauteur, composeur fixed
  const isAtlasChat = pathname === '/atlas' || pathname.startsWith('/atlas/')

  // Pages atteintes via le menu « ⋯ » → plein écran, sans bottom bar (mobile).
  // La fiche contact /contacts/[id] est plein écran (charte profil), mais PAS la liste /contacts.
  const navHidden = ['/compte', '/profile/edit', '/settings', '/abonnement', '/mon-abonnement', '/activities', '/notifications', '/nova/campagne'].some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  ) || pathname.startsWith('/contacts/')

  // Immersif = fil ou page plein écran → la bottom bar mobile s'efface (le rail desktop, lui, reste).
  const immersive = navHidden || isChatFil || isAtlasChat

  return (
    <PageVisibilityProvider>
      {/* LA nav unique de l'app = PrimaryNav : rail fin (desktop, 76px, tout à gauche) ≡ bottom bar (mobile).
          Un seul composant, partout. Sur /chats et /atlas, ChatsShell fournit EN PLUS sa colonne 340
          (le futur contenu « Espaces »), à droite du rail. */}
      <PrimaryNav immersive={immersive} />

      <div
        className={cn(
          'app-shell md:max-w-none md:mx-0',
          // Atlas/fil mobile : hauteur figée = zéro scroll du document (composeur fixed)
          isAtlasChat || isChatFil ? 'max-lg:h-[100dvh] max-lg:overflow-hidden' : '',
          'transition-[padding-left] duration-200 ease-out lg:pl-[76px]',
          // Mobile : de la place pour la bottom bar (sauf en immersif, où elle est masquée)
          !immersive && 'max-lg:pb-[calc(62px+env(safe-area-inset-bottom))]',
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
    </PageVisibilityProvider>
  )
}
