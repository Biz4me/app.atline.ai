'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { DesktopSidebar } from '@/components/desktop-sidebar'
import { AtlasSidebar } from '@/components/atlas-sidebar'
import { DesktopTopBar } from '@/components/desktop-top-bar'
import { BottomNav } from '@/components/bottom-nav'
import { PageVisibilityProvider } from '@/components/page-visibility-context'

interface Props {
  children: ReactNode
  initialCollapsed: boolean
  initialAtlasCollapsed: boolean
}

export function AppShell({ children, initialCollapsed, initialAtlasCollapsed }: Props) {
  const pathname = usePathname()
  const atlasHidden = pathname === '/atlas' || pathname.startsWith('/atlas/')

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
      <DesktopSidebar collapsed={collapsed} onToggle={toggle} />
      <AtlasSidebar collapsed={atlasCollapsed} onToggle={toggleAtlas} />
      <div
        className={cn(
          'app-shell pb-[110px] lg:pb-0 lg:max-w-none lg:mx-0 lg:pt-14',
          'transition-[padding-left,padding-right] duration-200 ease-out',
          collapsed ? 'lg:pl-14' : 'lg:pl-56',
          atlasHidden ? 'lg:pr-0' : atlasCollapsed ? 'lg:pr-14' : 'lg:pr-[360px]',
        )}
      >
        {children}
        <BottomNav />
      </div>
    </PageVisibilityProvider>
  )
}
