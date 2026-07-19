'use client'

import { usePathname } from 'next/navigation'
import { SheetPanel } from '@/components/sheet-panel'
import ContactsPage from '@/app/(app)/contacts/page'

// FEUILLE liste Contacts. La page a déjà son en-tête « Contacts » → pas de titre de feuille.
// (La fiche /contacts/[id] a sa propre feuille : @sheet/(.)contacts/[id].)
export default function ContactsListSheet() {
  const pathname = usePathname()
  if (pathname !== '/contacts') return null
  return (
    <SheetPanel widthClass="lg:w-[900px]">
      <ContactsPage />
    </SheetPanel>
  )
}
