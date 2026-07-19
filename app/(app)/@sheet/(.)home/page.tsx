'use client'

import { usePathname } from 'next/navigation'
import { SheetPanel } from '@/components/sheet-panel'
import HomePage from '@/app/(app)/home/page'

// FEUILLE « Mon bilan » (/home = tableau de bord). La page a déjà son en-tête → pas de titre de feuille.
export default function HomeSheet() {
  const pathname = usePathname()
  if (pathname !== '/home') return null
  return (
    <SheetPanel widthClass="lg:w-[820px]">
      <HomePage />
    </SheetPanel>
  )
}
