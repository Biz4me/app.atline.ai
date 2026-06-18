'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { PanelRightClose, PanelRightOpen, CalendarDays, Send, Sparkles } from 'lucide-react'

const rdvs = [
  { time: '14:00', name: 'Sophie Laurent', stage: 'Closing', stageColor: 'bg-red-100 text-red-600' },
  { time: '16:30', name: 'Julie Moreau', stage: 'Découverte', stageColor: 'bg-blue-100 text-blue-600' },
]

type Msg = { id: string; from: 'atlas' | 'user'; text: string }

const INITIAL_MESSAGES: Msg[] = [
  { id: '1', from: 'atlas', text: 'Bonjour ! Sophie est en phase de closing — relance-la avec un chiffre concret : « En 3 mois j'ai ajouté 400€/mois. »' },
]

interface Props {
  collapsed: boolean
  onToggle: () => void
}

export function AtlasSidebar({ collapsed, onToggle }: Props) {
  const pathname = usePathname()
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Msg[]>(INITIAL_MESSAGES)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-hide on /atlas page (the page itself IS Atlas)
  const hiddenOnThisPage = pathname === '/atlas' || pathname.startsWith('/atlas/')

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = () => {
    if (!input.trim()) return
    const userMsg: Msg = { id: Date.now().toString(), from: 'user', text: input }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    // Simulated response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), from: 'atlas', text: 'Je prends en compte ta question. Pour l'instant je suis en mode démo — bientôt connecté à ton CRM.' },
      ])
    }, 800)
  }

  if (hiddenOnThisPage) return null

  const isOpen = !collapsed

  return (
    <>
      {/* Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col fixed right-0 top-0 h-dvh z-40',
          'bg-surface border-l border-border',
          'transition-[width,opacity] duration-200 ease-out overflow-hidden',
          isOpen ? 'w-[320px] opacity-100' : 'w-0 opacity-0 pointer-events-none',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground font-display text-xs font-bold">A</span>
            <span className="text-sm font-bold text-foreground">Atlas</span>
          </div>
          <button type="button" onClick={onToggle} title="Masquer Atlas"
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <PanelRightClose className="size-4" />
          </button>
        </div>

        {/* Suggestion contextuelle */}
        <div className="px-4 py-3 border-b border-border shrink-0">
          <div className="rounded-xl bg-primary/5 border border-primary/15 p-3">
            <div className="flex items-start gap-2">
              <Sparkles className="size-3.5 text-primary shrink-0 mt-0.5 stroke-[1.5]" />
              <p className="text-xs text-foreground leading-relaxed">
                Sophie est prête pour le closing — relance-la avec un chiffre concret.
              </p>
            </div>
          </div>
        </div>

        {/* Prochains RDV */}
        <div className="px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Prochains RDV</p>
            <CalendarDays className="size-3.5 text-muted-foreground" />
          </div>
          <div className="flex flex-col gap-2">
            {rdvs.map((r) => (
              <div key={r.time} className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground tabular-nums w-10 shrink-0">{r.time}</span>
                <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0', r.stageColor)}>{r.stage}</span>
                <span className="text-xs text-foreground truncate">{r.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Atlas */}
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
          {messages.map((msg) => (
            <div key={msg.id} className={cn('flex', msg.from === 'user' ? 'justify-end' : 'justify-start')}>
              {msg.from === 'atlas' && (
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-display text-[9px] font-bold mr-2 mt-0.5">A</span>
              )}
              <div className={cn(
                'max-w-[220px] rounded-2xl px-3 py-2 text-xs leading-relaxed',
                msg.from === 'atlas'
                  ? 'bg-muted text-foreground rounded-tl-sm'
                  : 'bg-primary text-primary-foreground rounded-tr-sm'
              )}>
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input chat */}
        <div className="px-4 py-3 border-t border-border shrink-0">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-muted px-3 py-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') send() }}
              placeholder="Demander à Atlas…"
              className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
            />
            <button type="button" onClick={send} disabled={!input.trim()}
              className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-30 transition-opacity">
              <Send className="size-3 stroke-2" />
            </button>
          </div>
        </div>
      </aside>

      {/* Tab flottante quand collapsed */}
      {!isOpen && !hiddenOnThisPage && (
        <button type="button" onClick={onToggle} title="Ouvrir Atlas"
          className="hidden lg:flex fixed right-0 top-1/2 -translate-y-1/2 z-40 flex-col items-center gap-1 rounded-l-xl border border-r-0 border-border bg-surface px-1.5 py-3 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shadow-sm">
          <PanelRightOpen className="size-3.5" />
          <span className="text-[9px] font-bold tracking-wider [writing-mode:vertical-lr] rotate-180">ATLAS</span>
        </button>
      )}
    </>
  )
}
