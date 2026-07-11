'use client'

import { useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowUpRight, X } from 'lucide-react'
import { AppComposer } from '@/components/mobile/app-composer'
import { AtlasNavCard, OPEN_MARK_RE, cleanOpenRoute } from '@/components/atlas-nav-card'
import { AtlasActionCard, type AtlasAction } from '@/components/atlas-action-card'

// Composeur du shell (toutes pages SAUF /atlas et /nova).
// Modèle « Atlas omniprésent » : la réponse s'ouvre en PANNEAU par-dessus la page
// courante — on ne navigue plus, l'état de la page (filtres, scroll) est préservé.
// « Ouvrir dans Atlas » bascule dans le fil complet SUR LA MÊME conversation.

type PanelMsg = { from: 'user' | 'atlas'; text: string; navCard?: { route: string; label: string }; actionCard?: AtlasAction }

// Pendant le stream, ne jamais révéler un marqueur [[OPEN]] (même partiel en fin de flux).
const visible = (t: string) => t.replace(/\s*\[\[[\s\S]*$/, '')

export function ShellComposer() {
  const pathname = usePathname()
  const router = useRouter()
  const [value, setValue] = useState('')
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<PanelMsg[]>([])
  const [streaming, setStreaming] = useState(false)
  const convIdRef = useRef<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // La page Atlas rend son propre composeur (câblé au chat)
  if (pathname === '/atlas' || pathname.startsWith('/atlas/')) return null
  // Nova = environnement agent (cockpit campagnes + wizard), pas de composeur Atlas ici
  if (pathname === '/nova' || pathname.startsWith('/nova/')) return null

  const scrollDown = () => setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 60)

  const send = async (q: string) => {
    setMsgs((prev) => [...prev, { from: 'user', text: q }, { from: 'atlas', text: '' }])
    setOpen(true)
    setStreaming(true)
    scrollDown()
    let full = ''
    const actions: AtlasAction[] = []
    const setLast = (text: string) => setMsgs((prev) => prev.map((m, i) => (i === prev.length - 1 && m.from === 'atlas' ? { ...m, text } : m)))
    try {
      const resp = await fetch('/api/atlas/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, conversationId: convIdRef.current ?? undefined, mlm_actif: 'Atline' }),
      })
      if (!resp.ok || !resp.body) throw new Error('no stream')
      const cid = resp.headers.get('X-Conversation-Id')
      if (cid) convIdRef.current = cid

      const reader = resp.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value: chunk } = await reader.read()
        if (done) break
        buffer += decoder.decode(chunk, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6)
          if (payload === '[DONE]') continue
          try {
            const data = JSON.parse(payload)
            if (data.text) { full += data.text; setLast(visible(full)); scrollDown() }
            else if (data.action_proposal?.kind) actions.push(data.action_proposal as AtlasAction)
          } catch { /* ligne SSE incomplète */ }
        }
      }
      if (!full) full = "Je n'ai pas de réponse pour l'instant. Reformule ta question ?"
      // Concierge : [[OPEN]] route | libellé → carte deep-link, marqueur jamais affiché.
      const om = full.match(OPEN_MARK_RE)
      const route = om ? cleanOpenRoute(om[1]) : null
      setLast(visible(full).trim())
      setMsgs((prev) => [
        ...prev,
        ...(route ? [{ from: 'atlas' as const, text: '', navCard: { route, label: om![2].trim() } }] : []),
        ...actions.map((a) => ({ from: 'atlas' as const, text: '', actionCard: a })),
      ])
      scrollDown()
    } catch {
      setLast("Désolé, je n'ai pas pu répondre à l'instant. Réessaie dans un moment.")
    } finally {
      setStreaming(false)
    }
  }

  const submit = () => {
    const q = value.trim()
    if (!q || streaming) return
    setValue('')
    send(q)
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
              {msgs.map((m, i) =>
                m.navCard ? (
                  <AtlasNavCard key={i} route={m.navCard.route} label={m.navCard.label} />
                ) : m.actionCard ? (
                  <AtlasActionCard key={i} action={m.actionCard} />
                ) : m.from === 'user' ? (
                  <p key={i} className="ml-auto w-fit max-w-[85%] rounded-2xl bg-primary/10 px-4 py-2.5 text-sm text-foreground">{m.text}</p>
                ) : (
                  <p key={i} className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                    {m.text || <span className="text-muted-foreground">…</span>}
                  </p>
                ),
              )}
            </div>
          </div>
        </>
      )}
      <AppComposer value={value} onChange={setValue} onSubmit={submit} agentLabel="Atlas" />
    </>
  )
}
