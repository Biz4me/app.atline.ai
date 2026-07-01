'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SendHorizontal, Mic, History, Plus, X, ChevronDown, MoreHorizontal, Pencil, Trash2, Paperclip, FileText, Users, Loader2, Zap, Target, SquarePen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { AppComposer } from '@/components/mobile/app-composer'

const BUCKET_LABEL: Record<string, string> = { PRESENTER: 'Présenter', FORMER: 'Former', VENDRE: 'Vendre' }

// Typo FR : espace fine insécable avant : ; ! ? et insécable autour du tiret — (jamais en début de ligne)
const TH = String.fromCharCode(0x202F), NB = String.fromCharCode(0xA0), EM = String.fromCharCode(0x2014)
const frText = (t: string) => t.replace(/ ([:;!?])/g, TH + '$1').replace(new RegExp(' ' + EM + ' ', 'g'), NB + EM + ' ')

type Msg = { from: 'user' | 'atlas'; text: string; chips?: string[] }

// Indicateur « Atlas réfléchit » — 3 points en cascade
function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      {[0, 200, 400].map((d) => (
        <span
          key={d}
          className="size-2 rounded-full bg-muted-foreground/50 animate-[atlas-typing_1.2s_ease-in-out_infinite]"
          style={{ animationDelay: `${d}ms` }}
        />
      ))}
    </div>
  )
}

const suggestions = [
  'Comment relancer un prospect tiède ?',
  'Prépare mon prochain closing',
  'Donne-moi mon plan du jour',
  'Comment gérer une objection prix ?',
]


type Conv = { id: string; title: string | null; updatedAt: string }

export default function AtlasPage() {
  const router = useRouter()
  const c = useSearchParams().get('c')
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [histMounted, setHistMounted] = useState(false)
  const [histVisible, setHistVisible] = useState(false)
  const [histTop, setHistTop] = useState(0)
  const [histMenuId, setHistMenuId] = useState<string | null>(null)
  const [histMenuPos, setHistMenuPos] = useState<{ top: number; right: number } | null>(null)
  const [histEditingId, setHistEditingId] = useState<string | null>(null)
  const [histDraft, setHistDraft] = useState('')
  const headerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [streaming, setStreaming] = useState(false)
  // true tant qu'on charge une conversation depuis l'URL → évite le flash de l'état vide
  const [loadingConv, setLoadingConv] = useState<boolean>(!!c)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [uploadingDoc, setUploadingDoc] = useState(false)

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (f) setPendingFile(f)
  }
  async function routeToDocuments() {
    if (!pendingFile) return
    setUploadingDoc(true)
    const fd = new FormData()
    fd.append('file', pendingFile)
    const res = await fetch('/api/supports/auto', { method: 'POST', body: fd })
    setUploadingDoc(false)
    setPendingFile(null)
    if (res.ok) { const d = await res.json().catch(() => ({})); toast.success(`Atlas l'a rangé dans tes documents${d.bucket ? ` (${BUCKET_LABEL[d.bucket] ?? ''})` : ''}`) }
    else if (res.status === 413) toast.error('Fichier trop lourd (max 25 Mo)')
    else toast.error("Échec de l'upload")
  }
  function routeToContacts() {
    if (!pendingFile) return
    const reader = new FileReader()
    reader.onload = () => {
      sessionStorage.setItem('atline_import_text', String(reader.result ?? ''))
      setPendingFile(null)
      router.push('/contacts')
    }
    reader.readAsText(pendingFile)
  }
  const [convs, setConvs] = useState<Conv[]>([])
  const [mantra, setMantra] = useState('On avance ensemble ?')
  const [typedMantra, setTypedMantra] = useState('')
  const [firstName, setFirstName] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const loadedRef = useRef<string | null>(null)
  const atBottomRef = useRef(true)

  // Charge la conversation de l'URL (?c=) — saute si on vient de la créer (loadedRef).
  useEffect(() => {
    if (c === loadedRef.current) return
    loadedRef.current = c
    if (!c) { setMsgs([]); setLoadingConv(false); return }
    let cancelled = false
    setLoadingConv(true)
    ;(async () => {
      try {
        const r = await fetch(`/api/atlas/conversations/${c}`)
        if (r.status === 404) {
          // conversation supprimée → on oublie et on repart vierge
          localStorage.removeItem('atlas-last-conv')
          loadedRef.current = null
          if (!cancelled) { setMsgs([]); router.replace('/atlas') }
          return
        }
        if (r.ok && !cancelled) {
          const d = await r.json()
          setMsgs(
            (d.messages ?? []).map((m: { role: string; content: string }) => ({
              from: m.role === 'USER' ? 'user' : 'atlas',
              text: m.content,
            })),
          )
          scrollToBottom()
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoadingConv(false)
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c])

  // Liste des conversations (historique mobile) — rafraîchie quand une nouvelle conv est créée
  const loadConvs = useCallback(async () => {
    try {
      const r = await fetch('/api/atlas/conversations')
      if (r.ok) setConvs(await r.json())
    } catch {
      /* ignore */
    }
  }, [])
  useEffect(() => { loadConvs() }, [loadConvs, c])

  // Mantra aléatoire pour l'écran d'accueil Atlas (proxy local → pas de CORS)
  const pickMantra = useCallback(() => {
    fetch('/api/mantras/random')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const t = (d?.text ?? '').replace(/^[\s«»"'"]+|[\s«»"'"]+$/g, '').trim()
        if (t) setMantra(t)
      })
      .catch(() => {})
  }, [])
  useEffect(() => { pickMantra() }, [pickMantra])

  // Frappe du mantra (façon onboarding) sur l'écran d'accueil Atlas
  useEffect(() => {
    const full = frText(mantra)
    setTypedMantra('')
    let i = 0
    const id = setInterval(() => {
      i++
      setTypedMantra(full.slice(0, i))
      if (i >= full.length) clearInterval(id)
    }, 22)
    return () => clearInterval(id)
  }, [mantra])

  // Prénom pour le bonjour perso de l'accueil
  useEffect(() => {
    fetch('/api/me').then((r) => (r.ok ? r.json() : null)).then((u) => { if (u?.firstName) setFirstName(u.firstName) }).catch(() => {})
  }, [])

  // Mémorise la conversation active pour la retrouver au retour sur Atlas
  useEffect(() => {
    if (c) localStorage.setItem('atlas-last-conv', c)
  }, [c])

  // Au retour sur /atlas (sans ?c=), reprend la dernière conversation en cours
  useEffect(() => {
    if (c) return
    const last = localStorage.getItem('atlas-last-conv')
    if (last) {
      setLoadingConv(true)
      router.replace(`/atlas?c=${last}`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Historique mobile — déploiement type menu « Plus » de l'accueil (slide depuis le header + backdrop)
  const openHist = () => {
    loadConvs()
    if (headerRef.current) setHistTop(headerRef.current.getBoundingClientRect().bottom)
    setHistMounted(true)
    requestAnimationFrame(() => setHistVisible(true))
  }
  const closeHist = () => {
    setHistVisible(false)
    setHistMenuId(null)
    setHistEditingId(null)
    setTimeout(() => setHistMounted(false), 300)
  }
  const toggleHist = () => { histMounted ? closeHist() : openHist() }

  // Composeur : grandit avec le contenu réel (jusqu'à 120px puis scroll)
  const resizeTextarea = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }
  useEffect(() => { resizeTextarea() }, [input])

  // Historique : renommer / supprimer (mobile, même logique que desktop)
  const renameConv = async () => {
    const id = histEditingId
    const title = histDraft.trim()
    setHistEditingId(null)
    if (!id || !title) return
    setConvs((prev) => prev.map((cv) => (cv.id === id ? { ...cv, title } : cv)))
    await fetch(`/api/atlas/conversations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    }).catch(() => {})
  }
  const deleteConv = async (id: string) => {
    setHistMenuId(null)
    setConvs((prev) => prev.filter((cv) => cv.id !== id))
    await fetch(`/api/atlas/conversations/${id}`, { method: 'DELETE' }).catch(() => {})
    if (id === c) {
      localStorage.removeItem('atlas-last-conv')
      router.replace('/atlas')
    }
  }

  const scrollToBottom = () =>
    setTimeout(() => scrollRef.current?.scrollTo({ top: 999999, behavior: 'smooth' }), 50)

  // Auto-scroll poli : ne suit la génération que si l'utilisateur est déjà en bas
  const autoScroll = () => { if (atBottomRef.current) scrollToBottom() }

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 48
    atBottomRef.current = atBottom
    setShowScrollBtn(!atBottom)
  }

  const goToBottom = () => { atBottomRef.current = true; setShowScrollBtn(false); scrollToBottom() }

  const setLastAtlas = (text: string) =>
    setMsgs((prev) => {
      const next = [...prev]
      next[next.length - 1] = { from: 'atlas', text }
      return next
    })

  const sendMsg = async (text: string) => {
    const q = text.trim()
    if (!q || streaming) return

    setMsgs((prev) => [...prev, { from: 'user', text: q }, { from: 'atlas', text: '' }])
    setInput('')
    setStreaming(true)
    atBottomRef.current = true
    scrollToBottom()

    try {
      const resp = await fetch('/api/atlas/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          conversationId: c ?? undefined,
          mlm_actif: 'Atline',
        }),
      })
      if (!resp.ok || !resp.body) throw new Error('no stream')

      // Nouvelle conversation : on synchronise l'URL (la sidebar se rafraîchit) sans recharger.
      const newCid = resp.headers.get('X-Conversation-Id')
      if (newCid && newCid !== c) {
        loadedRef.current = newCid
        router.replace(`/atlas?c=${newCid}`, { scroll: false })
      }

      const reader = resp.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let acc = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6)
          if (payload === '[DONE]') continue
          try {
            const data = JSON.parse(payload)
            if (data.text) {
              acc += data.text
              setLastAtlas(acc)
              autoScroll()
            }
          } catch {
            /* ligne SSE incomplète, ignorée */
          }
        }
      }
      if (!acc) setLastAtlas("Je n'ai pas de réponse pour l'instant. Reformule ta question ?")
    } catch {
      setLastAtlas("Désolé, je n'ai pas pu répondre à l'instant. Réessaie dans un moment.")
    } finally {
      setStreaming(false)
    }
  }

  const newSession = () => {
    closeHist()
    localStorage.removeItem('atlas-last-conv')
    loadedRef.current = null
    setMsgs([])
    pickMantra()
    if (c) router.push('/atlas')
  }

  // Historique + nouveau chat pilotés depuis la barre du haut globale (via événements)
  const toggleHistRef = useRef(toggleHist); toggleHistRef.current = toggleHist
  const newSessionRef = useRef(newSession); newSessionRef.current = newSession
  useEffect(() => {
    const onHist = () => toggleHistRef.current()
    const onNew = () => newSessionRef.current()
    window.addEventListener('agent:history', onHist)
    window.addEventListener('agent:new', onNew)
    return () => { window.removeEventListener('agent:history', onHist); window.removeEventListener('agent:new', onNew) }
  }, [])

  // Relais du composeur global : message tapé sur une autre page → envoyé ici une fois la conv chargée
  const sendMsgRef = useRef(sendMsg); sendMsgRef.current = sendMsg
  const pendingSentRef = useRef(false)
  useEffect(() => {
    if (loadingConv || pendingSentRef.current) return
    const pending = sessionStorage.getItem('atlas_pending')
    if (pending) {
      pendingSentRef.current = true
      sessionStorage.removeItem('atlas_pending')
      sendMsgRef.current(pending)
    }
  }, [loadingConv])

  return (
    <div className="flex h-[calc(100dvh-60px)] overflow-hidden lg:h-[calc(100dvh-3.5rem)]">

      {/* ── Zone principale : chat ── (l'historique desktop vit dans la sidebar 2) */}
      <div className="flex flex-1 flex-col min-h-0 min-w-0">

        {/* Header */}
        {/* Contrat d'alignement : lg:h-[68px] + items-center = icône/titre centrés à 90px (indépendant de la taille). */}
        {/* Ancre : 0px sur mobile (le panneau historique se positionne sous la barre globale) ; en-tête 68px desktop */}
        <div ref={headerRef} className="shrink-0 lg:h-[68px]" />

        {/* Mobile : historique — slide depuis le header + backdrop (comme le menu Plus de l'accueil) */}
        {histMounted && (
          <>
            <div
              className="lg:hidden fixed inset-x-0 bottom-0 z-[55] bg-black/40 transition-opacity duration-300"
              style={{ top: histTop, opacity: histVisible ? 1 : 0 }}
              onClick={closeHist}
            />
            <div
              data-hist-sheet
              className="lg:hidden fixed inset-x-0 z-[60] mx-auto max-w-[480px]"
              style={{ top: histTop, clipPath: 'inset(0 0 0 0)' }}
            >
              <div
                className="max-h-[60vh] overflow-y-auto no-scrollbar border-b border-border bg-background transition-transform duration-300 ease-out"
                style={{ transform: histVisible ? 'translateY(0)' : 'translateY(-100%)' }}
              >
                <div className="divide-y divide-border">
                  {convs.length === 0 && (
                    <p className="px-5 py-4 text-sm text-muted-foreground">Aucune conversation.</p>
                  )}
                  {convs.map((cv) =>
                    histEditingId === cv.id ? (
                      <div key={cv.id} className="px-3 py-2">
                        <input
                          autoFocus
                          value={histDraft}
                          onChange={(e) => setHistDraft(e.target.value)}
                          onBlur={renameConv}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') renameConv()
                            if (e.key === 'Escape') setHistEditingId(null)
                          }}
                          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none"
                        />
                      </div>
                    ) : (
                      <div key={cv.id} className="relative flex items-center">
                        <button
                          type="button"
                          onClick={() => { closeHist(); router.push(`/atlas?c=${cv.id}`) }}
                          className={cn(
                            'flex flex-1 items-center gap-3 px-5 py-3.5 pr-12 text-left transition-colors active:bg-muted',
                            cv.id === c && 'bg-muted',
                          )}
                        >
                          <History className="size-4 shrink-0 stroke-[1.5] text-muted-foreground" />
                          <span className="flex-1 truncate text-sm text-foreground">{cv.title || 'Sans titre'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            const btn = e.currentTarget.getBoundingClientRect()
                            const sheet = (e.currentTarget.closest('[data-hist-sheet]') as HTMLElement | null)?.getBoundingClientRect()
                            const right = sheet ? window.innerWidth - sheet.right : window.innerWidth - btn.right
                            setHistMenuPos({ top: btn.bottom + 6, right })
                            setHistMenuId(cv.id)
                          }}
                          className="absolute right-3 flex size-8 items-center justify-center rounded-lg text-muted-foreground active:bg-muted"
                        >
                          <MoreHorizontal className="size-4" />
                        </button>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>

            {/* Menu ••• en position fixe → jamais coupé par l'overflow/clip du panneau */}
            {histMenuId && histMenuPos && (
              <>
                <div className="lg:hidden fixed inset-0 z-[64]" onClick={() => setHistMenuId(null)} />
                <div
                  className="lg:hidden fixed z-[65] w-40 overflow-hidden rounded-xl border border-border bg-background py-1 shadow-card"
                  style={{ top: histMenuPos.top, right: histMenuPos.right }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      const id = histMenuId
                      const cv = convs.find((x) => x.id === id)
                      setHistMenuId(null)
                      setHistEditingId(id)
                      setHistDraft(cv?.title ?? '')
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-foreground active:bg-muted"
                  >
                    <Pencil className="size-3.5 stroke-[1.5] text-muted-foreground" />Renommer
                  </button>
                  <button
                    type="button"
                    onClick={() => { if (histMenuId) deleteConv(histMenuId) }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-destructive active:bg-destructive/10"
                  >
                    <Trash2 className="size-3.5 stroke-[1.5]" />Supprimer
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* Conversation / empty state */}
        {loadingConv ? (
          <div className="flex-1" />
        ) : msgs.length === 0 ? (
          <div className="flex flex-1 flex-col px-4 pb-20 lg:pb-0">
            <div className="flex flex-1 flex-col items-center justify-center gap-2.5 px-2 text-center">
              <p className="font-display text-[27px] font-bold leading-[1.2] tracking-[-0.025em] text-foreground">{firstName ? `Bonjour ${firstName}` : 'Bonjour'}</p>
              <p className="min-h-[50px] max-w-[320px] text-lg leading-[1.4] text-muted-foreground">{typedMantra}</p>
            </div>
            {!input.trim() && (
              <div className="mx-auto flex w-full max-w-md flex-col gap-0.5">
                {[
                  { icon: Zap, label: 'Mon plan du jour', run: () => sendMsg('Donne-moi mon plan du jour') },
                  { icon: Target, label: 'Mon prochain pas', run: () => sendMsg('Quel est mon prochain pas ?') },
                  { icon: Mic, label: 'Simuler un appel avec Aria', run: () => router.push('/aria') },
                  { icon: SquarePen, label: 'Créer un post avec Nova', run: () => router.push('/nova') },
                ].map(({ icon: Icon, label, run }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={run}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-lg text-foreground transition-colors active:bg-muted"
                  >
                    <Icon className="size-5 shrink-0 text-muted-foreground" />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto no-scrollbar px-6 pt-4 pb-24 lg:pb-4"
          >
            <div className="mx-auto flex max-w-md flex-col gap-4 lg:max-w-3xl">
            {msgs.map((m, i) => (
              <div key={i} className={cn('flex flex-col gap-2', m.from === 'user' ? 'items-end' : 'items-start')}>
                {m.from === 'user' ? (
                  <div className="max-w-[82%] whitespace-pre-line rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-lg leading-[1.4] text-primary-foreground lg:text-sm">
                    {frText(m.text)}
                  </div>
                ) : m.text === '' ? (
                  <TypingDots />
                ) : (
                  <div className="flex w-full flex-col gap-2.5 text-lg leading-[1.65] text-foreground lg:text-sm">
                    {frText(m.text).split(/\n{2,}/).map((para, j) => (
                      <p key={j} className="whitespace-pre-line">{para}</p>
                    ))}
                  </div>
                )}
                {m.chips && (
                  <div className="flex flex-wrap gap-2">
                    {m.chips.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => sendMsg(c)}
                        className="rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-sm font-semibold text-primary hover:bg-primary/20 transition-colors"
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            </div>
          </div>
        )}

        {/* Input fichier caché — partagé mobile (AppComposer) + desktop */}
        <input ref={fileInputRef} type="file" onChange={onPickFile} className="hidden"
          accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,image/*" />

        {/* Composeur DESKTOP — attaché (mobile utilise l'AppComposer flottant, cf. plus bas) */}
        <div className="relative hidden lg:block shrink-0 px-4 py-3 lg:px-6">
          {showScrollBtn && (
            <button
              type="button"
              onClick={goToBottom}
              aria-label="Revenir en bas"
              className="absolute -top-12 left-1/2 -translate-x-1/2 z-10 flex size-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-md hover:bg-muted hover:text-foreground transition-colors"
            >
              <ChevronDown className="size-4" />
            </button>
          )}
          <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-border bg-surface px-4 py-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Joindre un fichier"
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors"
            >
              <Paperclip className="size-5 stroke-[1.5]" />
            </button>
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMsg(input)
                }
              }}
              placeholder="Écris à Atlas…"
              className="flex-1 resize-none overflow-y-auto no-scrollbar bg-transparent text-lg leading-[1.4] text-foreground outline-none placeholder:text-muted-foreground lg:text-sm"
              style={{ maxHeight: 120, paddingTop: 7, paddingBottom: 7 }}
            />
            <button
              type="button"
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors"
            >
              <Mic className="size-5 stroke-[1.5]" />
            </button>
            <button
              type="button"
              onClick={() => sendMsg(input)}
              disabled={streaming || !input.trim()}
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              <SendHorizontal className="size-[17px] stroke-[1.5]" />
            </button>
          </div>
        </div>
      </div>

      {/* Composeur MOBILE — flottant fixe (source unique, cf. AppComposer) */}
      <AppComposer
        value={input}
        onChange={setInput}
        onSubmit={() => sendMsg(input)}
        onAttach={() => fileInputRef.current?.click()}
        agentLabel="Atlas"
        disabled={streaming}
      />
      {showScrollBtn && (
        <button
          type="button"
          onClick={goToBottom}
          aria-label="Revenir en bas"
          className="lg:hidden fixed left-1/2 z-[47] flex size-9 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-md active:bg-muted transition-colors"
          style={{ bottom: 'calc(max(14px, env(safe-area-inset-bottom)) + 62px)' }}
        >
          <ChevronDown className="size-4" />
        </button>
      )}

      {/* Sélecteur de destination pour un fichier joint */}
      {pendingFile && (() => {
        const contactish = /\.(csv|txt)$/i.test(pendingFile.name)
        return (
          <div className="fixed inset-0 z-[80] flex flex-col">
            <div className="flex-1 bg-black/40" onClick={() => { if (!uploadingDoc) setPendingFile(null) }} />
            <div className="rounded-t-3xl bg-background pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <div className="mx-auto mb-3 mt-3 h-1 w-10 rounded-full bg-border" />
              <p className="truncate px-5 pb-1 text-sm font-bold text-foreground">« {pendingFile.name} »</p>
              <p className="px-5 pb-3 text-xs text-muted-foreground">Que veux-tu qu&apos;Atlas en fasse ?</p>
              <div className="flex flex-col gap-2 px-5 py-2">
                <button type="button" onClick={routeToDocuments} disabled={uploadingDoc}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 text-left active:bg-muted disabled:opacity-60">
                  <FileText className="size-5 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground">Ranger dans mes documents{!contactish && <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wide text-primary">suggéré</span>}</p>
                    <p className="text-xs text-muted-foreground">Atlas le classe (Présenter / Former / Vendre)</p>
                  </div>
                  {uploadingDoc && <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />}
                </button>
                <button type="button" onClick={routeToContacts} disabled={uploadingDoc}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 text-left active:bg-muted disabled:opacity-60">
                  <Users className="size-5 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground">Importer comme contacts{contactish && <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wide text-primary">suggéré</span>}</p>
                    <p className="text-xs text-muted-foreground">Atlas extrait la liste et dédoublonne</p>
                  </div>
                </button>
                <button type="button" onClick={() => setPendingFile(null)} className="px-4 py-2 text-sm font-medium text-muted-foreground">Annuler</button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
