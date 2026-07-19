'use client'

import { usePathname, useRouter } from 'next/navigation'
import { SheetPanel } from '@/components/sheet-panel'
import { AgendaView } from '@/app/(app)/agenda/page'

// FEUILLE Agenda. Le mode `embedded` masque le header de la page → on donne un titre à la feuille.
export default function AgendaSheet() {
  const router = useRouter()
  const pathname = usePathname()
  if (!pathname.startsWith('/agenda')) return null
  return (
    <SheetPanel title="Agenda" widthClass="lg:w-[820px]">
      <AgendaView embedded onClose={() => router.back()} />
    </SheetPanel>
  )
}
