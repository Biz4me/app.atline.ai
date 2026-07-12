'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Sparkles, ArrowUpRight, SendHorizontal } from 'lucide-react'
import { useAtlasMiniChat, MiniMsgs } from '@/components/use-atlas-mini-chat'

// Rail droit desktop = le COMPOSEUR CONTEXTUEL PERMANENT (équivalent du composeur mobile) :
// tu écris à droite, la réponse arrive à droite, ta page ne bouge pas. Remplace les
// anciennes cartes décoratives (scénarios DISC, brise-glace… supprimés).

// Sur les pages agent et messages, l'agent occupe déjà le centre → pas de rail.
const HIDDEN_ON = ['/atlas', '/aria', '/nova', '/messages']

export function AtlasSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const [value, setValue] = useState('')
  const { msgs, streaming, send, convIdRef } = useAtlasMiniChat()
  const scrollRef = useRef<HTMLDivElement>(null)

  if (HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(p + '/'))) return null

  const isOpen = !collapsed
  const scrollDown = () => setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 60)
  const submit = () => {
    const q = value.trim()
    if (!q || streaming) return
    setValue('')
    send(q, scrollDown)
  }

  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        title={isOpen ? 'Réduire' : 'Développer'}
        style={{ right: isOpen ? '348px' : '52px' }}
        className="hidden lg:flex fixed top-6 z-50 size-6 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-[right] duration-200 ease-out hover:bg-muted hover:text-foreground"
      >
        {isOpen ? <ChevronRight className="size-3.5" /> : <ChevronLeft className="size-3.5" />}
      </button>

      <aside
        className={cn(
          'hidden lg:flex flex-col fixed right-0 top-0 z-40 h-dvh overflow-hidden border-l border-border bg-background',
          'transition-[width] duration-200 ease-out',
          isOpen ? 'w-[360px]' : 'w-16',
        )}
      >
        {isOpen ? (
          <>
            <div className="flex shrink-0 items-center justify-between px-4 pb-2 pt-4">
              <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <span className="grid size-6 place-items-center rounded-full bg-primary text-white"><Sparkles className="size-3.5" /></span>
                Atlas
              </span>
              {msgs.length > 0 && (
                <button
                  type="button"
                  onClick={() => router.push(convIdRef.current ? `/atlas?c=${convIdRef.current}` : '/atlas')}
                  className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-muted"
                >
                  Ouvrir dans Atlas <ArrowUpRight className="size-3.5" />
                </button>
              )}
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
              {msgs.length === 0 ? (
                <p className="mt-8 text-sm leading-relaxed text-muted-foreground">
                  Pose ta question ici : la réponse arrive sans quitter ta page.
                </p>
              ) : (
                <MiniMsgs msgs={msgs} />
              )}
            </div>

            <div className="shrink-0 px-3 pb-4 pt-1">
              <div className="flex items-end gap-2 rounded-[22px] border border-border bg-surface px-3 py-1.5">
                <textarea
                  rows={1}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
                  placeholder="Écris à Atlas…"
                  className="flex-1 resize-none bg-transparent py-1.5 text-sm leading-[1.4] text-foreground outline-none placeholder:text-muted-foreground"
                  style={{ maxHeight: 120 }}
                />
                <button
                  type="button"
                  onClick={submit}
                  disabled={!value.trim() || streaming}
                  className="mb-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  <SendHorizontal className="size-4 stroke-[1.5]" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={onToggle}
            title="Écrire à Atlas"
            className="mx-auto mt-4 grid size-10 place-items-center rounded-full bg-primary text-white shadow-sm transition-opacity hover:opacity-90"
          >
            <Sparkles className="size-5 stroke-[1.5]" />
          </button>
        )}
      </aside>
    </>
  )
}
