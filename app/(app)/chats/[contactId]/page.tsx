'use client'

import { use, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Loader2, PhoneCall, PenLine, MoreVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AppComposer } from '@/components/mobile/app-composer'
import { AtlasDraftCard } from '@/components/atlas-plan-card'
import { useFilSearch, FilSearchRow } from '@/components/fil-search'

// ═══ NAV MESSAGERIE T5 — le fil contact ═══
// Ici on parle à ATLAS, À PROPOS du contact (jamais au contact : ses vrais messages
// partent via WhatsApp, uniquement par la carte brouillon). Mécanique 100% existante :
// /api/atlas/chat (contact-scopé, snapshot inclus), conversations persistées, AtlasDraftCard.

type Contact = {
  id: string; name: string; firstName: string | null; initials: string | null; accent: string | null
  kind: string; prospectStage: string | null; partnerStage: string | null; market: string | null
  exposures: number; phone: string | null; email: string | null
  lastDraft: string | null; lastDraftAt: string | null; lastContact: string | null
}
type Msg = { from: 'user' | 'atlas'; text: string; draft?: { channel: string; initial?: string } }

const STAGE_LABEL: Record<string, string> = {
  NOUVEAU: 'Nouveau', INVITATION: 'Invitation', PRESENTATION: 'Présentation', SUIVI: 'Suivi', CLOSING: 'Closing',
  DEMARRAGE: 'Démarrage', FORMATION: 'Formation', ACTIF: 'Actif', LEADER: 'Leader',
}
const MARKET_LABEL: Record<string, string> = { CHAUD: 'marché chaud', TIEDE: 'marché tiède', FROID: 'marché froid' }
const stripMarkers = (s: string) => s.replace(/\s*\[\[[A-Z]+\]\][\s\S]*$/, '')

export default function ContactThreadPage({ params }: { params: Promise<{ contactId: string }> }) {
  const { contactId } = use(params)
  const router = useRouter()
  const [c, setC] = useState<Contact | null>(null)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [loading, setLoading] = useState(true)
  const convRef = useRef<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  // Recherche DANS la conversation (⋮ de l'en-tête)
  const filSearch = useFilSearch(msgs.map((m) => m.text ?? ''))

  const prenom = c?.firstName || c?.name?.split(' ')[0] || 'ce contact'

  // Contact + reprise de la DERNIÈRE conversation à son sujet (continuité du fil).
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [rc, rl] = await Promise.all([
          fetch(`/api/contacts/${contactId}`),
          fetch(`/api/atlas/conversations?contactId=${contactId}`),
        ])
        if (cancelled) return
        const contact: Contact | null = rc.ok ? await rc.json() : null
        if (contact) setC(contact)
        const convs = rl.ok ? await rl.json() : []
        const last = Array.isArray(convs) && convs.length ? convs[0] : null
        let loaded: Msg[] = []
        if (last?.id) {
          const rm = await fetch(`/api/atlas/conversations/${last.id}`)
          if (!cancelled && rm.ok) {
            const d = await rm.json()
            convRef.current = last.id
            loaded = (d.messages ?? []).map((m: { role: string; content: string }) => ({
              from: m.role === 'USER' ? 'user' : 'atlas',
              text: stripMarkers(m.content).trim(),
            })).filter((m: Msg) => m.text)
          }
        }
        // Le brouillon en attente survit au refresh : la carte revient avec le TEXTE sauvé (lastDraft, T0).
        if (contact?.lastDraft && (!contact.lastContact || !contact.lastDraftAt || contact.lastDraftAt > contact.lastContact)) {
          loaded = [...loaded, { from: 'atlas', text: '', draft: { channel: contact.phone ? 'WHATSAPP' : 'EMAIL', initial: contact.lastDraft } }]
        }
        if (!cancelled && loaded.length) setMsgs(loaded)
      } catch { /* fil vide */ }
      finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [contactId])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [msgs, streaming])

  // Envoi → Atlas contact-scopé (même proxy que la fiche : snapshot + mémoire du contact inclus côté serveur).
  const send = async () => {
    const q = input.trim()
    if (!q || streaming) return
    setInput('')
    setMsgs((m) => [...m, { from: 'user', text: q }, { from: 'atlas', text: '' }])
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
              setMsgs((m) => { const cp = [...m]; cp[cp.length - 1] = { from: 'atlas', text: shown }; return cp })
            }
          } catch { /* ligne SSE partielle */ }
        }
      }
      if (!full.trim()) setMsgs((m) => { const cp = [...m]; cp[cp.length - 1] = { from: 'atlas', text: "Je n'ai pas de réponse là — reformule ?" }; return cp })
    } catch {
      setMsgs((m) => { const cp = [...m]; cp[cp.length - 1] = { from: 'atlas', text: 'Souci de connexion, réessaie dans un moment.' }; return cp })
    } finally {
      setStreaming(false)
    }
  }

  // Chips d'action : le brouillon (carte → WhatsApp, persiste lastDraft) et l'appel.
  const addDraft = () => {
    if (!c) return
    const channel = c.phone ? 'WHATSAPP' : 'EMAIL'
    setMsgs((m) => [...m, { from: 'atlas', text: `Je te prépare un message pour ${prenom} — régénère-le si besoin, puis envoie-le direct.`, }, { from: 'atlas', text: '', draft: { channel } }])
  }

  // Sous le nom : le statut seul (le détail vit dans la fiche, un tap sur l'en-tête)
  const subtitle = c ? (c.kind === 'PARTENAIRE' ? 'Partenaire' : c.kind === 'CLIENT' ? 'Client' : 'Prospect') : ''

  return (
    <div className="mx-auto flex h-dvh w-full max-w-2xl flex-col bg-background">
      {/* En-tête contact — tap = la fiche ; ⋮ = recherche dans la conversation */}
      <div className="shrink-0 border-b border-border bg-background/90 backdrop-blur">
        {filSearch.open ? (
          <FilSearchRow s={filSearch} />
        ) : (
          <div className="flex items-center gap-2.5 px-3 py-2" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}>
            <button type="button" aria-label="Retour" onClick={() => router.push('/chats')} className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground active:bg-muted">
              <ChevronLeft className="size-5 stroke-[1.5]" />
            </button>
            <button type="button" onClick={() => router.push(`/contacts/${contactId}`)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
              <span className="grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: c?.accent ?? '#F97316' }}>
                {c?.initials ?? c?.name?.slice(0, 2).toUpperCase() ?? '…'}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-foreground">{c?.name ?? 'Contact'}</span>
                {/* présence : pendant la réponse, l'en-tête vit (« Atlas écrit… ») */}
                <span className={cn('block truncate text-xs', streaming ? 'font-medium text-primary' : 'text-muted-foreground')}>
                  {streaming ? 'Atlas écrit…' : subtitle}
                </span>
              </span>
            </button>
            <button type="button" aria-label="Chercher dans la conversation" onClick={() => filSearch.setOpen(true)} className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground active:bg-muted">
              <MoreVertical className="size-5 stroke-[1.5]" />
            </button>
          </div>
        )}
      </div>

      {/* Le bandeau qui lève l'ambiguïté — règle absolue du fil contact */}
      <div className="mx-4 mt-2 shrink-0 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-center">
        <p className="text-xs font-semibold text-primary">🧭 Ici, tu parles à Atlas — à propos de {prenom}</p>
        <p className="text-[10px] text-muted-foreground">Ses vrais messages partent via WhatsApp, jamais d'ici</p>
      </div>

      {/* Le fil */}
      <div className="flex-1 overflow-y-auto px-4 pb-[130px] pt-3 lg:pb-4">
        {loading && <p className="py-6 text-center text-sm text-muted-foreground">Chargement…</p>}
        {!loading && msgs.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Demande ce que tu veux sur {prenom} : le point, un message, la prochaine étape…
          </p>
        )}
        <div className="flex flex-col gap-3">
          {msgs.map((m, i) => (
            <div key={i} data-midx={i} className={cn(m.from === 'user' ? 'max-w-[85%] self-end' : m.draft ? 'w-[92%] self-start' : 'max-w-[92%] self-start', filSearch.highlight(i))}>
              {m.draft && c ? (
                <AtlasDraftCard contactId={c.id} prenom={prenom} channel={m.draft.channel} phone={c.phone} email={c.email} initial={m.draft.initial} />
              ) : m.from === 'user' ? (
                <div className="rounded-2xl rounded-br-md bg-primary/15 px-3.5 py-2 text-[19px] leading-[1.45] text-foreground lg:text-base">{m.text}</div>
              ) : m.text === '' ? (
                <div className="flex items-center gap-1 py-1 text-muted-foreground"><Loader2 className="size-4 animate-spin" /></div>
              ) : (
                <div className="whitespace-pre-line text-[19px] leading-[1.65] text-foreground lg:text-base">{m.text}</div>
              )}
            </div>
          ))}
        </div>
        {/* Chips d'action rapides — l'envoi réel ne passe QUE par la carte brouillon */}
        {!loading && c && (
          <div className="mt-4 flex flex-wrap gap-2">
            {(c.phone || c.email) && (
              <button type="button" onClick={addDraft} className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-2 text-xs font-medium text-foreground active:bg-muted">
                <PenLine className="size-3.5 stroke-[1.5] text-primary" /> Préparer un message
              </button>
            )}
            {c.phone && (
              <a href={`tel:${c.phone}`} className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-2 text-xs font-medium text-foreground active:bg-muted">
                <PhoneCall className="size-3.5 stroke-[1.5] text-primary" /> Appeler
              </a>
            )}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Composeur unique de l'app, contextualisé */}
      <AppComposer
        desktop
        bigText
        value={input}
        onChange={setInput}
        onSubmit={send}
        agentLabel="Atlas"
        disabled={streaming}
        placeholder={`Parle à Atlas de ${prenom}…`}
      />
    </div>
  )
}
