'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FilShell } from '@/components/fil-shell'
import { AppComposer } from '@/components/mobile/app-composer'

// ═══ Fil Orion — l'agent de prospection (Phase 1 : chat conseil + rédaction de messages) ═══
// Vrai chat streaming (persona du service /api/orion/chat). Le moteur LinkedIn (recherche +
// campagnes) arrivera plus tard ; ici Orion conseille et rédige tes messages d'approche.

const ORION = '#F97316' // orange (= --primary), pas de couleur de marque propre

type Msg = { from: 'user' | 'orion'; text: string }

const suggestions = [
  'Écris-moi un message de prise de contact pour un dirigeant',
  'Comment relancer un prospect sans être lourd ?',
  'Donne-moi un angle pour aborder quelqu’un que je connais peu',
]

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-1">
      {[0, 150, 300].map((d) => (
        <span key={d} className="size-1.5 rounded-full bg-muted-foreground/50 animate-pulse" style={{ animationDelay: `${d}ms` }} />
      ))}
    </span>
  )
}

export default function OrionThreadPage() {
  const router = useRouter()
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const atBottomRef = useRef(true)
  const [showScrollBtn, setShowScrollBtn] = useState(false)

  const scrollToBottom = () => setTimeout(() => scrollRef.current?.scrollTo({ top: 999_999, behavior: 'smooth' }), 40)
  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 48
    atBottomRef.current = atBottom
    setShowScrollBtn(!atBottom)
  }

  const send = async (text: string) => {
    const q = text.trim()
    if (!q || streaming) return
    const history = msgs.filter((m) => m.text).map((m) => ({ role: m.from === 'user' ? 'user' : 'assistant', content: m.text }))
    setMsgs((p) => [...p, { from: 'user', text: q }, { from: 'orion', text: '' }])
    setInput('')
    setStreaming(true)
    atBottomRef.current = true
    scrollToBottom()

    const setLast = (t: string) => setMsgs((p) => { const n = [...p]; n[n.length - 1] = { from: 'orion', text: t }; return n })
    let full = ''
    let shown = 0
    let done = false
    const tick = () => {
      if (shown < full.length) { shown++; setLast(full.slice(0, shown)); if (atBottomRef.current) scrollToBottom(); setTimeout(tick, 16) }
      else if (!done) setTimeout(tick, 40)
      else setStreaming(false)
    }

    try {
      const resp = await fetch('/api/orion/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, history }),
      })
      if (!resp.ok || !resp.body) throw new Error('no stream')
      const reader = resp.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      setTimeout(tick, 80)
      for (;;) {
        const { done: d, value } = await reader.read()
        if (d) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6)
          if (payload === '[DONE]') continue
          try { const dd = JSON.parse(payload); if (dd.text) full += dd.text } catch { /* ligne SSE partielle */ }
        }
      }
      if (!full) full = 'Je n’ai pas de réponse là tout de suite. Reformule ta demande ?'
      done = true
    } catch {
      setLast('Désolé, je n’ai pas pu répondre à l’instant. Réessaie dans un moment.')
      setStreaming(false)
    }
  }

  return (
    <FilShell open={false} rail={<span />}>
      {/* En-tête Orion */}
      <div className="flex shrink-0 items-center gap-2.5 border-b border-border bg-background/90 px-3 py-2 backdrop-blur" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}>
        <button type="button" aria-label="Retour" onClick={() => router.push('/chats')} className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground active:bg-muted md:hidden">
          <ChevronLeft className="size-5 stroke-[1.5]" />
        </button>
        <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full text-sm font-bold text-white" style={{ backgroundColor: ORION }}>
          <img src="/avatars/orion.png" alt="" className="size-full rounded-full object-cover" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-foreground">Orion</span>
          <span className="block text-xs text-muted-foreground">ton agent de prospection · trouve et approche</span>
        </span>
      </div>

      {/* Le fil */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 pb-28 pt-3 md:pb-3">
        {msgs.length === 0 && (
          <div className="mx-auto max-w-2xl">
            <div className="rounded-2xl bg-surface px-4 py-3 text-sm leading-relaxed text-foreground">
              Salut ✦ Je suis Orion. Je t’aide à trouver de nouveaux prospects et à écrire tes messages d’approche — personnalisés, jamais du spam. Dis-moi qui tu veux toucher, ou demande-moi un message.
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {suggestions.map((s) => (
                <button key={s} type="button" onClick={() => send(s)} className="rounded-xl border border-border bg-surface px-3.5 py-2.5 text-left text-sm text-foreground active:bg-muted">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="mx-auto flex max-w-2xl flex-col gap-2.5">
          {msgs.map((m, i) => (
            <div
              key={i}
              className={cn(
                'max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-lg leading-relaxed lg:text-sm',
                m.from === 'user'
                  ? 'self-end rounded-br-md bg-primary text-primary-foreground'
                  : 'self-start rounded-bl-md border border-border bg-surface text-foreground',
              )}
            >
              {m.text || (streaming && i === msgs.length - 1 ? <TypingDots /> : '')}
            </div>
          ))}
        </div>
      </div>

      <AppComposer
        value={input}
        onChange={setInput}
        onSubmit={() => send(input)}
        onScrollBottom={() => { atBottomRef.current = true; scrollToBottom() }}
        showScrollBtn={showScrollBtn}
        desktop
        bigText
        agentLabel="Orion"
        placeholder="Écris à Orion…"
      />
    </FilShell>
  )
}
