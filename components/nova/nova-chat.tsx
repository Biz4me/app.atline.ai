'use client'

import { useEffect, useRef, useState } from 'react'
import { SendHorizontal } from 'lucide-react'

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
// `seed` = la consigne de Nova (envoyée en 1er tour, jamais affichée).
// `onCapture` = appelé avec la valeur quand Nova pose le marqueur [[OK: …]].
export function NovaChat({
  seed,
  onCapture,
  placeholder = 'Écris à Nova…',
}: {
  seed: string
  onCapture?: (value: string) => void
  placeholder?: string
}) {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const historyRef = useRef<Msg[]>([]) // ce que voit le service (seed inclus en 1er)
  const scrollRef = useRef<HTMLDivElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    void send(seed, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, busy])

  useEffect(() => {
    const el = taRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [input])

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
    if (cap && onCapture) onCapture(cap)
    setBusy(false)
    taRef.current?.focus()
  }

  function submit() {
    const t = input.trim()
    if (!t || busy) return
    setInput('')
    void send(t)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar px-4 py-4">
        <div className="mx-auto flex max-w-md flex-col gap-3">
          {messages.map((m, i) =>
            m.role === 'user' ? (
              <div key={i} className="self-end rounded-2xl rounded-br-md bg-muted px-4 py-2.5 text-sm text-foreground">
                {m.content}
              </div>
            ) : (
              <div key={i} className="flex gap-2.5">
                <span
                  className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ background: NOVA }}
                >
                  N
                </span>
                <div className="flex-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {m.content || (busy && i === messages.length - 1 ? <TypingDots /> : null)}
                </div>
              </div>
            ),
          )}
        </div>
      </div>

      <div className="px-4 pb-3">
        <div className="mx-auto flex max-w-md items-end gap-2 rounded-[26px] border border-border bg-surface px-3 py-1.5 shadow-sm">
          <textarea
            ref={taRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submit()
              }
            }}
            placeholder={placeholder}
            className="flex-1 resize-none overflow-y-auto no-scrollbar bg-transparent text-base leading-[1.4] text-foreground outline-none placeholder:text-muted-foreground lg:text-sm"
            style={{ maxHeight: 120, paddingTop: 7, paddingBottom: 7 }}
          />
          <button
            type="button"
            onClick={submit}
            disabled={busy || !input.trim()}
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-white shadow-sm transition-opacity active:opacity-90 disabled:opacity-40"
            style={{ background: NOVA }}
            aria-label="Envoyer"
          >
            <SendHorizontal className="size-[17px] stroke-[1.5]" />
          </button>
        </div>
      </div>
    </div>
  )
}

function TypingDots() {
  return (
    <span className="inline-flex gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 animate-bounce rounded-full bg-muted-foreground"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  )
}
