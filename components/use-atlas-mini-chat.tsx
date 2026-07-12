'use client'

import { useRef, useState } from 'react'
import { AtlasNavCard, OPEN_MARK_RE, cleanOpenRoute } from '@/components/atlas-nav-card'
import { AtlasActionCard, type AtlasAction } from '@/components/atlas-action-card'

// Mini-chat Atlas contextuel — LA logique partagée du « composeur qui ne navigue plus » :
// panneau mobile (ShellComposer) ET rail droit desktop (AtlasSidebar) consomment ce hook.
// Même API que la page Atlas (/api/atlas/chat), même conversation reprise via ?c=.

export type PanelMsg = { from: 'user' | 'atlas'; text: string; navCard?: { route: string; label: string }; actionCard?: AtlasAction }

// Pendant le stream, ne jamais révéler un marqueur [[OPEN]] (même partiel en fin de flux).
const visible = (t: string) => t.replace(/\s*\[\[[\s\S]*$/, '')

// `endpoint` : /api/atlas/chat par défaut. Un autre agent (Aria coach, Nova) passe son endpoint SSE
// { query, history } → même fil, même rendu. Atlas garde son body à conversationId.
export function useAtlasMiniChat(endpoint = '/api/atlas/chat') {
  const isAtlas = endpoint === '/api/atlas/chat'
  const [msgs, setMsgs] = useState<PanelMsg[]>([])
  const [streaming, setStreaming] = useState(false)
  const convIdRef = useRef<string | null>(null)

  const send = async (q: string, onUpdate?: () => void) => {
    if (!q.trim() || streaming) return
    const history = msgs.filter((m) => m.text).map((m) => ({ role: m.from === 'user' ? 'user' : 'assistant', content: m.text }))
    setMsgs((prev) => [...prev, { from: 'user', text: q }, { from: 'atlas', text: '' }])
    setStreaming(true)
    onUpdate?.()
    let full = ''
    const actions: AtlasAction[] = []
    const setLast = (text: string) => setMsgs((prev) => prev.map((m, i) => (i === prev.length - 1 && m.from === 'atlas' ? { ...m, text } : m)))
    try {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isAtlas
          ? { query: q, conversationId: convIdRef.current ?? undefined, mlm_actif: 'Atline' }
          : { query: q, history }),
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
            if (data.text) { full += data.text; setLast(visible(full)); onUpdate?.() }
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
      onUpdate?.()
    } catch {
      setLast("Désolé, je n'ai pas pu répondre à l'instant. Réessaie dans un moment.")
    } finally {
      setStreaming(false)
    }
  }

  return { msgs, streaming, send, convIdRef }
}

// Rendu du fil du mini-chat — identique panneau mobile / rail desktop
export function MiniMsgs({ msgs }: { msgs: PanelMsg[] }) {
  return (
    <>
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
    </>
  )
}
