'use client'

import { usePathname } from 'next/navigation'
import { SheetPanel } from '@/components/sheet-panel'
import FormationPage from '@/app/(app)/formation/page'

// FEUILLE Formation (liste des modules). Ouvrir un module (/formation/[id]) navigue en pleine page
// au centre (contenu de cours immersif) — la feuille se referme d'elle-même via la garde ci-dessous.
export default function FormationSheet() {
  const pathname = usePathname()
  if (pathname !== '/formation') return null
  return (
    <SheetPanel widthClass="lg:w-[900px]">
      <FormationPage />
    </SheetPanel>
  )
}
