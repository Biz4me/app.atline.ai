'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { Route, Users, User, GitFork, Sparkles, X, History, ArrowLeft, Mic, SendHorizontal } from 'lucide-react'
import { usePageVisibility } from '@/components/page-visibility-context'

/* ── Tabs ───────────────────────────────────────────────────── */
const ALL_TABS = [
  { href: '/home',    label: 'Parcours', icon: Route, visKey: 'home',     side: 'left'  },
  { href: '/contacts',label: 'Contacts', icon: Users,   visKey: 'contacts', side: 'left'  },
  { href: '/network', label: 'Réseau',   icon: GitFork, visKey: 'network',  side: 'right' },
  { href: '/profile', label: 'Moi',      icon: User,    visKey: 'profile',  side: 'right' },
]

/* ── Data ───────────────────────────────────────────────────── */
type Msg = { from: 'user' | 'atlas'; text: string; chips?: string[] }

const suggestions = ['Relancer Sophie', 'Préparer mon appel', 'Voir mon plan']

const autoReplies: Record<string, Msg> = {
  'Relancer Sophie': {
    from: 'atlas',
    text: "Sophie Lefèvre est en phase Closing depuis 4 jours. Voici mon conseil : envoie-lui un message direct avec une proposition concrète de rendez-vous. J'ai préparé un script adapté à son profil DISC C.",
    chips: ['Voir le script', 'Ouvrir sa fiche'],
  },
  'Préparer mon appel': {
    from: 'atlas',
    text: "Tu as un appel Closing avec Sophie à 14h00. Son profil DISC C signifie qu'elle a besoin de chiffres et de preuves. Je te suggère de préparer : ① ton témoignage de résultats, ② la grille tarifaire complète, ③ les FAQ objections courantes.",
    chips: ['Simuler avec Aria', 'Voir les objections'],
  },
  'Voir mon plan': {
    from: 'atlas',
    text: "Aujourd'hui je te recommande 3 actions prioritaires :\n① Relancer Thomas Bernard (chaud, 2 jours sans contact)\n② Clôturer le dossier Sophie (Closing)\n③ Contacter 2 nouveaux prospects via Instagram",
    chips: ['Commencer maintenant'],
  },
}

const histSessions = [
  { date: '17 juin', summary: 'Comment closer Sophie Lefèvre efficacement ?' },
  { date: '15 juin', summary: 'Analyse de mon rapport hebdo – semaine 24' },
  { date: '12 juin', summary: 'Script d\'invitation pour profil DISC I' },
  { date: '10 juin', summary: 'Optimiser mon temps de prospection' },
]

/* ── BottomNav ──────────────────────────────────────────────── */
export function BottomNav() {
  const pathname = usePathname()
  const vis = usePageVisibility()
  const [open, setOpen] = useState(false)
  const [histOpen, setHistOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  const scrollToBottom = () => {
    setTimeout(() => scrollRef.current?.scrollTo({ top: 999999, behavior: 'smooth' }), 50)
  }

  const sendMsg = (text: string) => {
    if (!text.trim()) return
    const userMsg: Msg = { from: 'user', text: text.trim() }
    const reply: Msg = autoReplies[text.trim()] ?? {
      from: 'atlas',
      text: "Je note ta question. Voici ce que je recommande en tenant compte de ton activité actuelle et de ton réseau.",
    }
    setMsgs((prev) => [...prev, userMsg, reply])
    setInput('')
    scrollToBottom()
  }

  const leftTabs  = ALL_TABS.filter(t => t.side === 'left'  && vis[t.visKey] !== false)
  const rightTabs = ALL_TABS.filter(t => t.side === 'right' && vis[t.visKey] !== false)
  const showAtlas = vis['atlas'] !== false

  const openAtlas = () => { setOpen(true); setHistOpen(false) }
  const closeAtlas = () => setOpen(false)

  return (
    <>
      {/* ── Atlas overlay ── */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[49] bg-black/40"
            onClick={closeAtlas}
          />

          {/* Panel */}
          <div
            className="fixed inset-x-0 bottom-0 z-[50] mx-auto flex max-w-[480px] flex-col overflow-hidden rounded-t-[24px] bg-background"
            style={{ height: '88%', boxShadow: '0 -12px 40px rgba(0,0,0,0.30)' }}
          >
            {/* Drag handle */}
            <div className="flex shrink-0 justify-center pb-1 pt-2.5">
              <div className="h-[5px] w-[42px] rounded-full bg-muted opacity-50" />
            </div>

            {/* Header */}
            <div className="flex shrink-0 items-center gap-3 px-4 py-2">
              {!histOpen ? (
                <>
                  <button
                    type="button"
                    onClick={closeAtlas}
                    className="flex size-9 items-center justify-center rounded-full text-foreground active:bg-muted"
                  >
                    <X className="size-[19px] stroke-[1.5]" />
                  </button>

                  <div className="flex flex-1 items-center gap-2.5">
                    <div className="flex size-[38px] shrink-0 items-center justify-center rounded-[12px] bg-primary font-display text-[20px] font-bold text-primary-foreground shadow-md">
                      A
                    </div>
                    <div>
                      <p className="font-display text-lg font-bold leading-tight text-foreground">Atlas</p>
                      <div className="flex items-center gap-1.5">
                        <span className="size-[7px] rounded-full bg-green-500" />
                        <span className="text-xs font-semibold text-green-600">En ligne</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setHistOpen(true)}
                    className="flex size-9 items-center justify-center rounded-full text-muted-foreground active:bg-muted"
                  >
                    <History className="size-[18px] stroke-[1.5]" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setHistOpen(false)}
                    className="flex size-9 items-center justify-center rounded-full text-foreground active:bg-muted"
                  >
                    <ArrowLeft className="size-[19px] stroke-[1.5]" />
                  </button>
                  <p className="flex-1 font-display text-lg font-bold text-foreground">Historique</p>
                </>
              )}
            </div>

            {/* History list */}
            {histOpen && (
              <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-4 pb-6 pt-2">
                {histSessions.map((s) => (
                  <button
                    key={s.date}
                    type="button"
                    onClick={() => {
                      setMsgs([{ from: 'atlas', text: `Reprise de la session du ${s.date} : "${s.summary}"` }])
                      setHistOpen(false)
                    }}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3.5 text-left active:bg-muted"
                  >
                    <span className="w-12 shrink-0 text-xs font-semibold text-muted-foreground">{s.date}</span>
                    <span className="flex-1 truncate text-sm text-foreground">{s.summary}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Empty state */}
            {!histOpen && msgs.length === 0 && (
              <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
                <div className="flex size-[78px] items-center justify-center rounded-[24px] bg-primary font-display text-[36px] font-bold text-primary-foreground shadow-lg">
                  A
                </div>
                <p className="mt-5 font-display text-xl font-extrabold text-foreground">On avance ensemble ?</p>
                <p className="mt-1 text-sm text-muted-foreground">Apprends. Agis. Duplique.</p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => sendMsg(s)}
                      className="rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-foreground shadow-card active:bg-muted"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Conversation */}
            {!histOpen && msgs.length > 0 && (
              <div
                ref={scrollRef}
                className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-3"
              >
                {msgs.map((m, i) => (
                  <div key={i} className={cn('flex flex-col gap-2', m.from === 'user' ? 'items-end' : 'items-start')}>
                    <div
                      className={cn(
                        'max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-[1.5]',
                        m.from === 'user'
                          ? 'rounded-br-md bg-primary text-primary-foreground'
                          : 'rounded-bl-md bg-muted text-foreground'
                      )}
                    >
                      {m.text}
                    </div>
                    {m.chips && (
                      <div className="flex flex-wrap gap-2">
                        {m.chips.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => sendMsg(c)}
                            className="rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-sm font-semibold text-primary active:bg-primary/20"
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Input bar */}
            {!histOpen && (
              <div
                className="flex shrink-0 items-end gap-2 px-4 pb-6 pt-3"
              >
                <div className="flex flex-1 items-end gap-2 rounded-[22px] border border-border bg-surface px-4 py-2">
                  <textarea
                    rows={1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(input) } }}
                    placeholder="Écris à Atlas…"
                    className="flex-1 resize-none bg-transparent text-sm leading-[1.4] text-foreground outline-none placeholder:text-muted-foreground"
                    style={{ maxHeight: 110, paddingTop: 7, paddingBottom: 7 }}
                  />
                  <button
                    type="button"
                    className="mb-[7px] flex shrink-0 items-center justify-center text-muted-foreground"
                  >
                    <Mic className="size-5 stroke-[1.5]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => sendMsg(input)}
                    className="mb-[5px] flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md active:opacity-80"
                  >
                    <SendHorizontal className="size-[18px] stroke-[1.5]" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Nav bar ── */}
      <nav
        className="lg:hidden fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[480px] bg-surface/95 backdrop-blur-md shadow-[0_-1px_0_rgba(0,0,0,0.06)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center justify-around px-2 pt-2 pb-2">
          {/* Left tabs */}
          {leftTabs.map(tab => (
            <NavItem key={tab.href} tab={tab} active={isActive(tab.href)} />
          ))}

          {/* Atlas FAB — conditionnel */}
          {showAtlas && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={openAtlas}
                aria-label="Ouvrir Atlas"
                className="-translate-y-4 flex size-[58px] items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-95"
              >
                <Sparkles className="size-6 stroke-[1.5]" />
              </button>
            </div>
          )}

          {/* Right tabs */}
          {rightTabs.map(tab => (
            <NavItem key={tab.href} tab={tab} active={isActive(tab.href)} />
          ))}
        </div>
      </nav>
    </>
  )
}

function NavItem({ tab, active }: { tab: { href: string; label: string; icon: typeof User }; active: boolean }) {
  const Icon = tab.icon
  return (
    <Link
      href={tab.href}
      className={cn(
        'flex items-center justify-center p-2 transition-colors',
        active ? 'text-primary' : 'text-muted-foreground',
      )}
    >
      <Icon className={cn('size-6 stroke-[1.5]', active && 'stroke-2')} />
    </Link>
  )
}
