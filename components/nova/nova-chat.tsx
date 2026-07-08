'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AppComposer } from '@/components/mobile/app-composer'

const NOVA = '#8B5CF6'

type Msg = { role: 'user' | 'assistant'; content: string }

// Marqueur de capture : Nova le pose quand la valeur de l'étape est verrouillée.
// Ex. [[OK: coaching sportif en ligne]] — on le retire de l'affichage et on remonte la valeur.
const strip = (t: string) => t.replace(/\[\[OK:[\s\S]*?\]\]/g, '').trim()
const capture = (t: string) => {
  const m = t.match(/\[\[OK:\s*([\s\S]*?)\]\]/)
  return m ? m[1].trim() : null
}

// Une conversation avec Nova pour UNE étape du flow (AI-first, réutilisable).
// Même rendu que le chat Atlas (typo + composeur flottant AppComposer), teinté Nova.
export function NovaChat({
  seed,
  onCapture,
  chipLabel,
  onChip,
}: {
  seed: string
  onCapture?: (value: string) => void
  chipLabel?: string
  onChip?: () => void
}) {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [chip, setChip] = useState(false)
  const historyRef = useRef<Msg[]>([]) // ce que voit le service (seed inclus en 1er)
  const scrollRef = useRef<HTMLDivElement>(null)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    void send(seed, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, busy, chip])

  async function send(text: string, hidden = false) {
    setBusy(true)
    const priorHistory = historyRef.current.slice()
    if (!hidden) setMessages((m) => [...m, { role: 'user', content: text }])
    setMessages((m) => [...m, { role: 'assistant', content: '' }])

    let acc = ''
    try {
      const res = await fetch('/api/nova/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text, history: priorHistory }),
      })
      if (!res.ok || !res.body) throw new Error()
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = ''
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const parts = buf.split('\n\n')
        buf = parts.pop() ?? ''
        for (const part of parts) {
          for (const line of part.split('\n')) {
            if (!line.startsWith('data: ')) continue
            const p = line.slice(6).trim()
            if (!p || p === '[DONE]') continue
            try {
              const d = JSON.parse(p)
              if (d.text) {
                acc += d.text
                const shown = strip(acc)
                setMessages((m) => {
                  const c = [...m]
                  c[c.length - 1] = { role: 'assistant', content: shown }
                  return c
                })
              }
            } catch {
              /* ligne SSE partielle */
            }
          }
        }
      }
    } catch {
      setMessages((m) => {
        const c = [...m]
        c[c.length - 1] = { role: 'assistant', content: "Oups, je n'ai pas pu répondre. Réessaie." }
        return c
      })
      setBusy(false)
      return
    }

    historyRef.current = [...priorHistory, { role: 'user', content: text }, { role: 'assistant', content: acc }]
    const cap = capture(acc)
    if (cap) {
      if (onCapture) onCapture(cap)
      setChip(true)
    }
    setBusy(false)
  }

  function submit() {
    const t = input.trim()
    if (!t || busy) return
    setInput('')
    void send(t)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar px-6 pt-4 pb-40">
        <div className="mx-auto flex max-w-md flex-col gap-4">
          {messages.map((m, i) => (
            <div key={i} className={cn('flex flex-col gap-2', m.role === 'user' ? 'items-end' : 'items-start')}>
              {m.role === 'user' ? (
                <div
                  className="max-w-[82%] whitespace-pre-line rounded-2xl rounded-br-md px-3.5 py-2.5 text-lg leading-[1.4] text-white lg:text-sm"
                  style={{ background: NOVA }}
                >
                  {m.content}
                </div>
              ) : m.content === '' ? (
                <TypingDots />
              ) : (
                <div className="flex w-full flex-col gap-2.5 text-lg leading-[1.65] text-foreground lg:text-sm">
                  {m.content.split(/\n{2,}/).map((para, j) => (
                    <p key={j} className="whitespace-pre-line">
                      {para}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Chip « étape suivante » posé dans le fil quand Nova a verrouillé la valeur */}
          {chip && chipLabel && onChip && (
            <button
              type="button"
              onClick={onChip}
              className="flex items-center gap-1.5 self-start rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform active:scale-[0.98]"
              style={{ background: NOVA }}
            >
              {chipLabel}
              <ArrowRight className="size-4" />
            </button>
          )}
        </div>
      </div>

      <AppComposer
        value={input}
        onChange={setInput}
        onSubmit={submit}
        onAttach={() => toast('Pièce jointe — bientôt')}
        agentLabel="Nova"
        accent={NOVA}
        disabled={busy}
      />
    </div>
  )
}

function TypingDots() {
  return (
    <span className="flex items-center gap-1 py-1">
      {[0, 0.2, 0.4].map((d) => (
        <span
          key={d}
          className="size-2 rounded-full bg-muted-foreground/50 animate-[atlas-typing_1.2s_ease-in-out_infinite]"
          style={{ animationDelay: `${d}s` }}
        />
      ))}
    </span>
  )
}
