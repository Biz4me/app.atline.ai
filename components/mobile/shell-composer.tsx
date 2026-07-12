'use client'

import { useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowUpRight, X } from 'lucide-react'
import { AppComposer } from '@/components/mobile/app-composer'
import { useAtlasMiniChat, MiniMsgs } from '@/components/use-atlas-mini-chat'

// Composeur du shell (toutes pages SAUF /atlas, /aria, /nova, /messages).
// Modèle « Atlas omniprésent » : la réponse s'ouvre en PANNEAU par-dessus la page
// courante — on ne navigue plus, l'état de la page (filtres, scroll) est préservé.
// « Ouvrir dans Atlas » bascule dans le fil complet SUR LA MÊME conversation.

export function ShellComposer() {
  const pathname = usePathname()
  const router = useRouter()
  const [value, setValue] = useState('')
  const [open, setOpen] = useState(false)
  const { msgs, streaming, send, convIdRef } = useAtlasMiniChat()
  const scrollRef = useRef<HTMLDivElement>(null)

  // La page Atlas rend son propre composeur (câblé au chat)
  if (pathname === '/atlas' || pathname.startsWith('/atlas/')) return null
  // Aria/Nova = expériences lancées (simulateur, cockpit campagnes) : « Écris à Atlas » y est un intrus
  if (pathname === '/nova' || pathname.startsWith('/nova/')) return null
  if (pathname === '/aria' || pathname.startsWith('/aria/')) return null
  // Messages : la page a son propre composeur (fil du contact) — pas de barre Atlas par-dessus
  if (pathname === '/messages' || pathname.startsWith('/messages/')) return null

  const scrollDown = () => setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 60)

  const submit = () => {
    const q = value.trim()
    if (!q || streaming) return
    setValue('')
    setOpen(true)
    send(q, scrollDown)
  }

  return (
    <>
      {open && (
        <>
          {/* Backdrop : tap = fermer, la page en dessous n'a pas bougé */}
          <div className="lg:hidden fixed inset-0 z-[45] bg-black/40" onClick={() => setOpen(false)} />
          <div className="lg:hidden fixed inset-x-0 bottom-0 z-[46] mx-auto flex max-h-[72dvh] max-w-[640px] flex-col rounded-t-3xl border border-b-0 border-border bg-background pb-[86px]">
            <div className="flex items-center justify-between px-4 pb-1 pt-3">
              <span className="text-sm font-semibold text-foreground">Atlas</span>
              <span className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => router.push(convIdRef.current ? `/atlas?c=${convIdRef.current}` : '/atlas')}
                  className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-primary active:bg-muted"
                >
                  Ouvrir dans Atlas <ArrowUpRight className="size-3.5" />
                </button>
                <button type="button" onClick={() => setOpen(false)} aria-label="Fermer" className="grid size-8 place-items-center rounded-full text-muted-foreground active:bg-muted">
                  <X className="size-4" />
                </button>
              </span>
            </div>
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
              <MiniMsgs msgs={msgs} />
            </div>
          </div>
        </>
      )}
      {/* Sur desktop, le rail droit porte le composeur permanent — celui-ci est mobile-only (AppComposer est lg:hidden) */}
      <AppComposer value={value} onChange={setValue} onSubmit={submit} agentLabel="Atlas" />
    </>
  )
}
