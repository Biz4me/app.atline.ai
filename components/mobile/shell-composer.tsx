'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { AppComposer } from '@/components/mobile/app-composer'

// Composeur du shell (toutes pages SAUF /atlas, qui câble le sien au chat).
// Modèle « Atlas omniprésent » : quoi qu'on tape, on relaie à Atlas.
// Le jour où Aria/Nova ont un chat, on rendra ce composeur agent-aware ici.
export function ShellComposer() {
  const pathname = usePathname()
  const router = useRouter()
  const [value, setValue] = useState('')

  // La page Atlas rend son propre composeur (câblé au chat)
  if (pathname === '/atlas' || pathname.startsWith('/atlas/')) return null
  // Nova = environnement agent (cockpit campagnes + wizard), pas de composeur Atlas ici
  if (pathname === '/nova' || pathname.startsWith('/nova/')) return null

  const submit = () => {
    const q = value.trim()
    if (!q) return
    // Relais vers Atlas : la page Atlas récupère le message en attente et l'envoie
    sessionStorage.setItem('atlas_pending', q)
    setValue('')
    router.push('/atlas')
  }

  return (
    <AppComposer
      value={value}
      onChange={setValue}
      onSubmit={submit}
      agentLabel="Atlas"
    />
  )
}
