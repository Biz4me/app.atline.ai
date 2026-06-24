'use client'

import { useState, useRef, useEffect } from 'react'
import { Sparkles, SendHorizontal, Mic, History, Plus, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Msg = { from: 'user' | 'atlas'; text: string; streaming?: boolean }
type Conv = { id: string; title: string; updatedAt: string }

const suggestions = [
  'Préparer mon prochain appel',
  'Voir mon plan du jour',
  'Comment relancer un prospect ?',
  'Analyser mon réseau',
]

export default function AtlasPage() {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [histOpen, setHistOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [convId, setConvId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<Conv[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/atlas/conversations')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setConversations(data) })
      .catch(() => {})
  }, [])

  const scrollToBottom = () =>
    setTimeout(() => scrollRef.current?.scrollTo({ top: 999999, behavior: 'smooth' }), 50)

  const sendMsg = async (text: string) => {
    if (!text.trim() || loading) return
    setInput('')
    setLoading(true)

    const history = msgs.map(m => ({
      role: m.from === 'user' ? 'user' : 'assistant',
      content: m.text,
    }))

    setMsgs(prev => [...prev, { from: 'user', text: text.trim() }, { from: 'atlas', text: '', streaming: true }])
    scrollToBottom()

    try {
      const res = await fetch('/api/atlas/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text.trim(), conversationHistory: history, conversationId: convId }),
      })

      if (!res.ok || !res.body) {
        setMsgs(prev => {
          const next = [...prev]
          next[next.length - 1] = { from: 'atlas', text: "Je suis temporairement indisponible. Réessaie dans un instant." }
          return next
        })
        setLoading(false)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') break
          try {
            const parsed = JSON.parse(data)
            if (parsed.convId && !convId) setConvId(parsed.convId)
            if (parsed.text) {
              fullText += parsed.text
              setMsgs(prev => {
                const next = [...prev]
                next[next.length - 1] = { from: 'atlas', text: fullText, streaming: true }
                return next
              })
              scrollToBottom()
            }
          } catch {}
        }
      }

      setMsgs(prev => {
        const next = [...prev]
        next[next.length - 1] = { from: 'atlas', text: fullText }
        return next
      })

      // Refresh conversation list
      fetch('/api/atlas/conversations').then(r => r.json()).then(data => {
        if (Array.isArray(data)) setConversations(data)
      }).catch(() => {})

    } catch {
      setMsgs(prev => {
        const next = [...prev]
        next[next.length - 1] = { from: 'atlas', text: "Erreur de connexion. Vérifie ta connexion internet." }
        return next
      })
    } finally {
      setLoading(false)
    }
  }

  const loadConversation = async (id: string) => {
    setHistOpen(false)
    const res = await fetch(`/api/atlas/conversations/${id}`)
    const data = await res.json()
    if (!data.messages) return
    setConvId(id)
    setMsgs(data.messages.map((m: { role: string; content: string }) => ({
      from: m.role === 'USER' ? 'user' : 'atlas',
      text: m.content,
    })))
    scrollToBottom()
  }

  const newSession = () => {
    setMsgs([])
    setConvId(null)
    setHistOpen(false)
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

  return (
    <div className="flex h-dvh overflow-hidden">

      {/* Rail gauche historique (desktop) */}
      <aside className="hidden lg:flex w-64 flex-col shrink-0 border-r border-border bg-surface">
        <div className="flex items-center justify-between px-4 py-4 shrink-0">
          <span className="text-sm font-semibold text-muted-foreground">Conversations</span>
          <button type="button" onClick={newSession}
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <Plus className="size-4" />
          </button>
        </div>
        <div className="flex flex-col gap-0.5 px-2 overflow-y-auto flex-1 pb-4">
          {conversations.map((c) => (
            <button key={c.id} type="button" onClick={() => loadConversation(c.id)}
              className={cn(
                "flex flex-col items-start gap-0.5 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-muted",
                convId === c.id && "bg-muted"
              )}>
              <span className="line-clamp-2 text-sm font-medium text-foreground leading-snug">{c.title}</span>
              <span className="text-xs text-muted-foreground">{formatDate(c.updatedAt)}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* Zone chat */}
      <div className="flex flex-1 flex-col min-h-0">

        {/* Header */}
        <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-[11px] bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="size-[18px] stroke-[1.5]" />
          </div>
          <div className="flex-1">
            <p className="font-display text-lg font-bold text-foreground leading-tight">Atlas</p>
            <div className="flex items-center gap-1.5">
              <span className="size-[6px] rounded-full bg-green-500" />
              <span className="text-xs font-semibold text-green-600">En ligne</span>
            </div>
          </div>
          <button type="button" onClick={() => setHistOpen(v => !v)}
            className="lg:hidden flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors">
            {histOpen ? <X className="size-[18px]" /> : <History className="size-[18px]" />}
          </button>
          <button type="button" onClick={newSession}
            className="lg:hidden flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors">
            <Plus className="size-[18px]" />
          </button>
        </div>

        {/* Mobile : historique */}
        {histOpen && (
          <div className="lg:hidden flex flex-col gap-1 overflow-y-auto px-3 py-3 bg-surface border-b border-border max-h-64">
            {conversations.length === 0 && (
              <p className="text-sm text-muted-foreground px-3 py-2">Aucune conversation</p>
            )}
            {conversations.map((c) => (
              <button key={c.id} type="button" onClick={() => loadConversation(c.id)}
                className="flex items-center gap-3 rounded-xl border border-border bg-background p-3 text-left">
                <span className="w-12 shrink-0 text-xs font-semibold text-muted-foreground">{formatDate(c.updatedAt)}</span>
                <span className="flex-1 truncate text-sm text-foreground">{c.title}</span>
              </button>
            ))}
          </div>
        )}

        {/* Empty state */}
        {msgs.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <Sparkles className="size-7 stroke-[1.5]" />
            </div>
            <p className="mt-5 font-display text-xl font-extrabold text-foreground">On avance ensemble ?</p>
            <p className="mt-1 text-sm text-muted-foreground">Apprends. Agis. Duplique.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-md">
              {suggestions.map(s => (
                <button key={s} type="button" onClick={() => sendMsg(s)}
                  className="rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-foreground shadow-card hover:bg-muted transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div ref={scrollRef} className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4 lg:px-6">
            {msgs.map((m, i) => (
              <div key={i} className={cn('flex flex-col gap-2', m.from === 'user' ? 'items-end' : 'items-start')}>
                {m.from === 'atlas' && (
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Sparkles className="size-3.5 stroke-[1.5]" />
                  </div>
                )}
                <div className={cn(
                  'max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-[1.55] whitespace-pre-line',
                  m.from === 'user'
                    ? 'rounded-br-md bg-primary text-primary-foreground'
                    : 'rounded-bl-md bg-muted text-foreground',
                )}>
                  {m.text || (m.streaming && <Loader2 className="size-4 animate-spin text-muted-foreground" />)}
                  {m.streaming && m.text && <span className="ml-0.5 inline-block w-0.5 h-3.5 bg-foreground/50 animate-pulse align-middle" />}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="shrink-0 border-t border-border px-4 py-3 lg:px-6">
          <div className="flex items-end gap-2 rounded-2xl border border-border bg-surface px-4 py-2">
            <textarea rows={1} value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(input) } }}
              placeholder="Écris à Atlas…"
              className="flex-1 resize-none bg-transparent text-sm leading-[1.4] text-foreground outline-none placeholder:text-muted-foreground"
              style={{ maxHeight: 120, paddingTop: 7, paddingBottom: 7 }}
            />
            <button type="button" className="mb-[7px] text-muted-foreground">
              <Mic className="size-5 stroke-[1.5]" />
            </button>
            <button type="button" onClick={() => sendMsg(input)} disabled={loading || !input.trim()}
              className="mb-[5px] flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm hover:opacity-90 transition-opacity disabled:opacity-40">
              {loading ? <Loader2 className="size-4 animate-spin" /> : <SendHorizontal className="size-[17px] stroke-[1.5]" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
