'use client'

import { useState, useRef } from 'react'
import { Sparkles, SendHorizontal, Mic, History, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Msg = { from: 'user' | 'atlas'; text: string; chips?: string[] }

const suggestions = [
  'Relancer Sophie',
  'Préparer mon appel',
  'Voir mon plan du jour',
  'Analyser mon réseau',
]

const autoReplies: Record<string, Msg> = {
  'Relancer Sophie': {
    from: 'atlas',
    text: "Sophie Lefèvre est en phase Closing depuis 4 jours. Voici mon conseil : envoie-lui un message direct avec une proposition concrète de rendez-vous. J'ai préparé un script adapté à son profil DISC C.",
    chips: ['Voir le script', 'Ouvrir sa fiche'],
  },
  'Préparer mon appel': {
    from: 'atlas',
    text: "Tu as un appel Closing avec Sophie à 14h00. Son profil DISC C signifie qu'elle a besoin de chiffres et de preuves. Je te suggère : ① ton témoignage de résultats, ② la grille tarifaire complète, ③ les FAQ objections courantes.",
    chips: ['Simuler avec Aria', 'Voir les objections'],
  },
  'Voir mon plan du jour': {
    from: 'atlas',
    text: "Aujourd'hui je te recommande 3 actions prioritaires :\n① Relancer Thomas Bernard (chaud, 2 jours sans contact)\n② Clôturer le dossier Sophie (Closing)\n③ Contacter 2 nouveaux prospects via Instagram",
    chips: ['Commencer maintenant'],
  },
  'Analyser mon réseau': {
    from: 'atlas',
    text: "Ton réseau compte 12 filleuls actifs. 3 sont en phase d'intégration et méritent une attention cette semaine. Le taux d'activité global est de 68%, en hausse de +4% ce mois.",
    chips: ['Voir les filleuls', 'Ouvrir le réseau'],
  },
}

const sessions = [
  { id: 's1', title: 'Comment closer Sophie Lefèvre ?', date: '17 juin' },
  { id: 's2', title: 'Analyse rapport hebdo — semaine 24', date: '15 juin' },
  { id: 's3', title: "Script d'invitation pour profil DISC I", date: '12 juin' },
  { id: 's4', title: 'Optimiser mon temps de prospection', date: '10 juin' },
  { id: 's5', title: 'Préparer la présentation équipe', date: '8 juin' },
]

export default function AtlasPage() {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [histOpen, setHistOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () =>
    setTimeout(() => scrollRef.current?.scrollTo({ top: 999999, behavior: 'smooth' }), 50)

  const sendMsg = (text: string) => {
    if (!text.trim()) return
    const reply: Msg = autoReplies[text.trim()] ?? {
      from: 'atlas',
      text: "Je note ta question. En mode démo je ne réponds pas en temps réel — dans la version complète je rédige tes messages, prépare tes appels et suis ta progression.",
    }
    setMsgs((prev) => [...prev, { from: 'user', text: text.trim() }, reply])
    setInput('')
    scrollToBottom()
  }

  const newSession = () => { setMsgs([]); setHistOpen(false) }

  return (
    <div className="flex h-dvh overflow-hidden">

      {/* ── Rail gauche : historique sessions (desktop) ── */}
      <aside className="hidden lg:flex w-64 flex-col shrink-0 border-r border-border bg-surface">
        <div className="flex items-center justify-between px-4 py-4 shrink-0">
          <span className="text-[13px] font-semibold text-muted-foreground">Conversations</span>
          <button
            type="button"
            onClick={newSession}
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Plus className="size-4" />
          </button>
        </div>
        <div className="flex flex-col gap-0.5 px-2 overflow-y-auto flex-1 pb-4">
          {sessions.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setMsgs([{ from: 'atlas', text: `Reprise : "${s.title}"` }])
                setHistOpen(false)
              }}
              className="flex flex-col items-start gap-0.5 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-muted"
            >
              <span className="line-clamp-2 text-[13px] font-medium text-foreground leading-snug">{s.title}</span>
              <span className="text-[11px] text-muted-foreground">{s.date}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* ── Zone principale : chat ── */}
      <div className="flex flex-1 flex-col min-h-0">

        {/* Header */}
        <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-[11px] bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="size-[18px] stroke-[1.5]" />
          </div>
          <div className="flex-1">
            <p className="font-display text-[15px] font-bold text-foreground leading-tight">Atlas</p>
            <div className="flex items-center gap-1.5">
              <span className="size-[6px] rounded-full bg-green-500" />
              <span className="text-[11px] font-semibold text-green-600">En ligne</span>
            </div>
          </div>
          {/* Mobile : bouton historique */}
          <button
            type="button"
            onClick={() => setHistOpen((v) => !v)}
            className="lg:hidden flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors"
          >
            {histOpen ? <X className="size-[18px]" /> : <History className="size-[18px]" />}
          </button>
          <button
            type="button"
            onClick={newSession}
            className="lg:hidden flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors"
          >
            <Plus className="size-[18px]" />
          </button>
        </div>

        {/* Mobile : liste sessions */}
        {histOpen && (
          <div className="lg:hidden flex flex-col gap-1 overflow-y-auto px-3 py-3 bg-surface border-b border-border">
            {sessions.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setMsgs([{ from: 'atlas', text: `Reprise : "${s.title}"` }])
                  setHistOpen(false)
                }}
                className="flex items-center gap-3 rounded-xl border border-border bg-background p-3 text-left"
              >
                <span className="w-12 shrink-0 text-[11px] font-semibold text-muted-foreground">{s.date}</span>
                <span className="flex-1 truncate text-sm text-foreground">{s.title}</span>
              </button>
            ))}
          </div>
        )}

        {/* Conversation / empty state */}
        {msgs.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <Sparkles className="size-7 stroke-[1.5]" />
            </div>
            <p className="mt-5 font-display text-xl font-extrabold text-foreground">On avance ensemble ?</p>
            <p className="mt-1 text-sm text-muted-foreground">Apprends. Agis. Duplique.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-md">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => sendMsg(s)}
                  className="rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-foreground shadow-card hover:bg-muted transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div
            ref={scrollRef}
            className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4 lg:px-6"
          >
            {msgs.map((m, i) => (
              <div key={i} className={cn('flex flex-col gap-2', m.from === 'user' ? 'items-end' : 'items-start')}>
                {m.from === 'atlas' && (
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Sparkles className="size-3.5 stroke-[1.5]" />
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[75%] rounded-2xl px-4 py-3 text-[14px] leading-[1.55] whitespace-pre-line',
                    m.from === 'user'
                      ? 'rounded-br-md bg-primary text-primary-foreground'
                      : 'rounded-bl-md bg-muted text-foreground',
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
                        className="rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-[13px] font-semibold text-primary hover:bg-primary/20 transition-colors"
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

        {/* Input */}
        <div className="shrink-0 border-t border-border px-4 py-3 lg:px-6">
          <div className="flex items-end gap-2 rounded-2xl border border-border bg-surface px-4 py-2">
            <textarea
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
              className="flex-1 resize-none bg-transparent text-[14px] leading-[1.4] text-foreground outline-none placeholder:text-muted-foreground"
              style={{ maxHeight: 120, paddingTop: 7, paddingBottom: 7 }}
            />
            <button type="button" className="mb-[7px] text-muted-foreground">
              <Mic className="size-5 stroke-[1.5]" />
            </button>
            <button
              type="button"
              onClick={() => sendMsg(input)}
              className="mb-[5px] flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm hover:opacity-90 transition-opacity"
            >
              <SendHorizontal className="size-[17px] stroke-[1.5]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
