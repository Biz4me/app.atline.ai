'use client'

import { useState, useRef, useEffect } from 'react'
import { Sparkles, ArrowUp, X, Loader2 } from 'lucide-react'

// Composeur scopé contact (fiche) : on demande des choses sur CE contact, Atlas répond
// avec tout son contexte (buildContactSnapshot côté proxy via contactId). Fil éphémère —
// la mémoire vraie vit dans atlasMemory + Mem0, pas dans ce fil.
type Msg = { from: 'user' | 'atlas'; text: string }
const stripMarkers = (s: string) => s.replace(/\s*\[\[[A-Z]+\]\][\s\S]*$/, '')

export function ContactComposer({ contactId, contactName, loadConversationId, onLoaded, onConversationsChanged }: {
  contactId: string
  contactName: string
  loadConversationId?: string | null
  onLoaded?: () => void
  onConversationsChanged?: () => void
}) {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [open, setOpen] = useState(false)
  const convRef = useRef<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const prenom = contactName.trim().split(/\s+/)[0] || 'ce contact'

  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, open])

  // Rouvrir une conversation passée (tap sur « Échanges avec Atlas » de la fiche).
  useEffect(() => {
    if (!loadConversationId) return
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch(`/api/atlas/conversations/${loadConversationId}`)
        if (!r.ok || cancelled) return
        const d = await r.json()
        if (cancelled) return
        convRef.current = loadConversationId
        setMessages((d.messages ?? []).map((m: { role: string; content: string }) => ({ from: m.role === 'USER' ? 'user' : 'atlas', text: stripMarkers(m.content).trim() })))
        setOpen(true)
      } finally {
        if (!cancelled) onLoaded?.()
      }
    })()
    return () => { cancelled = true }
  }, [loadConversationId, onLoaded])

  const send = async () => {
    const q = input.trim()
    if (!q || streaming) return
    setInput('')
    setOpen(true)
    setMessages((m) => [...m, { from: 'user', text: q }, { from: 'atlas', text: '' }])
    setStreaming(true)
    try {
      const resp = await fetch('/api/atlas/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, contactId, conversationId: convRef.current ?? undefined }),
      })
      if (!resp.ok || !resp.body) throw new Error('no stream')
      const cid = resp.headers.get('X-Conversation-Id')
      if (cid) convRef.current = cid
      const reader = resp.body.getReader()
      const dec = new TextDecoder()
      let buf = ''
      let full = ''
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const parts = buf.split('\n')
        buf = parts.pop() ?? ''
        for (const line of parts) {
          if (!line.startsWith('data: ')) continue
          const p = line.slice(6)
          if (p === '[DONE]') continue
          try {
            const d = JSON.parse(p)
            if (d.text) {
              full += d.text
              const shown = stripMarkers(full)
              setMessages((m) => { const c = [...m]; c[c.length - 1] = { from: 'atlas', text: shown }; return c })
            }
          } catch { /* ligne SSE partielle */ }
        }
      }
      if (!full.trim()) setMessages((m) => { const c = [...m]; c[c.length - 1] = { from: 'atlas', text: "Je n'ai pas de réponse là — reformule ?" }; return c })
    } catch {
      setMessages((m) => { const c = [...m]; c[c.length - 1] = { from: 'atlas', text: 'Souci de connexion, réessaie dans un moment.' }; return c })
    } finally {
      setStreaming(false)
      onConversationsChanged?.()   // la fiche rafraîchit la liste « Échanges avec Atlas »
    }
  }

  const clear = () => { setMessages([]); convRef.current = null; setOpen(false) }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[47]">
      <div className="mx-auto max-w-2xl px-3" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
        {/* Fil de conversation (au-dessus du composeur) */}
        {open && messages.length > 0 && (
          <div className="mb-2 overflow-hidden rounded-2xl border border-border bg-background shadow-[0_-8px_40px_rgba(0,0,0,.12)]">
            <div className="flex items-center justify-between border-b border-border px-4 py-2">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground"><Sparkles className="size-3.5 text-primary" />Atlas · {prenom}</span>
              <button type="button" onClick={clear} aria-label="Fermer" className="flex size-7 items-center justify-center rounded-full text-muted-foreground active:bg-muted"><X className="size-4" /></button>
            </div>
            <div ref={scrollRef} className="flex max-h-[46vh] flex-col gap-3 overflow-y-auto px-4 py-3 no-scrollbar">
              {messages.map((m, i) => (
                <div key={i} className={m.from === 'user' ? 'self-end max-w-[85%]' : 'self-start w-full'}>
                  {m.from === 'user' ? (
                    <div className="rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-sm text-primary-foreground">{m.text}</div>
                  ) : m.text === '' ? (
                    <div className="flex items-center gap-1 py-1 text-muted-foreground"><Loader2 className="size-4 animate-spin" /></div>
                  ) : (
                    <div className="whitespace-pre-line text-sm leading-relaxed text-foreground">{m.text}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Barre composeur */}
        <div className="flex items-center gap-2 rounded-full border border-border bg-surface py-1.5 pl-4 pr-1.5 shadow-sm">
          <Sparkles className="size-4 shrink-0 text-primary" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') send() }}
            placeholder={`Demander à Atlas sur ${prenom}…`}
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <button
            type="button"
            onClick={send}
            disabled={!input.trim() || streaming}
            aria-label="Envoyer"
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
          >
            {streaming ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4 stroke-[2.5]" />}
          </button>
        </div>
      </div>
    </div>
  )
}
