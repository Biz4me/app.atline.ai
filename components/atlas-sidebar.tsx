'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  PanelRightClose,
  PanelRightOpen,
  TrendingUp,
  CalendarDays,
  Send,
  Sparkles,
} from 'lucide-react'

const rdvs = [
  { time: '14:00', name: 'Sophie Laurent', stage: 'Closing', stageColor: 'bg-red-100 text-red-600' },
  { time: '16:30', name: 'Julie Moreau', stage: 'Découverte', stageColor: 'bg-blue-100 text-blue-600' },
]

interface Props {
  collapsed: boolean
  onToggle: () => void
}

export function AtlasSidebar({ collapsed, onToggle }: Props) {
  const [input, setInput] = useState('')

  return (
    <>
      {/* Sidebar ouverte */}
      <aside
        className={cn(
          'hidden lg:flex flex-col fixed right-0 top-0 h-dvh z-40',
          'bg-surface border-l border-border',
          'transition-[width,opacity] duration-200 ease-out overflow-hidden',
          collapsed ? 'w-0 opacity-0 pointer-events-none' : 'w-[280px] opacity-100',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground font-display text-xs font-bold">A</span>
            <span className="text-sm font-bold text-foreground">Atlas</span>
          </div>
          <button
            type="button"
            onClick={onToggle}
            title="Masquer Atlas"
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <PanelRightClose className="size-4" />
          </button>
        </div>

        <div className="flex flex-col gap-0 overflow-y-auto flex-1">

          {/* Score du jour */}
          <div className="px-4 py-4 border-b border-border">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Score ARIA du jour</p>
            <div className="flex items-end gap-2">
              <span className="font-display text-4xl font-extrabold text-success leading-none">82</span>
              <div className="flex items-center gap-1 mb-1">
                <TrendingUp className="size-3.5 text-success stroke-2" />
                <span className="text-xs font-semibold text-success">+6 pts</span>
              </div>
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-success transition-all" style={{ width: '82%' }} />
            </div>
          </div>

          {/* Suggestion du moment */}
          <div className="px-4 py-4 border-b border-border">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2.5">Suggestion du moment</p>
            <div className="rounded-xl bg-primary/5 border border-primary/15 p-3">
              <div className="flex items-start gap-2">
                <Sparkles className="size-3.5 text-primary shrink-0 mt-0.5 stroke-[1.5]" />
                <p className="text-xs text-foreground leading-relaxed">
                  Sophie est en phase de closing — relance-la avec un chiffre concret. Essaie : <span className="font-semibold">« En 3 mois j'ai ajouté 400€/mois. »</span>
                </p>
              </div>
            </div>
          </div>

          {/* Prochains RDV */}
          <div className="px-4 py-4 border-b border-border">
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Prochains RDV</p>
              <CalendarDays className="size-3.5 text-muted-foreground" />
            </div>
            <div className="flex flex-col gap-2">
              {rdvs.map((r) => (
                <div key={r.time} className="flex items-center gap-2.5">
                  <span className="text-xs font-bold text-foreground tabular-nums w-10 shrink-0">{r.time}</span>
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0', r.stageColor)}>{r.stage}</span>
                  <span className="text-xs text-foreground truncate">{r.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Cette semaine */}
          <div className="px-4 py-4 border-b border-border">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2.5">Cette semaine</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Contacts', value: '8' },
                { label: 'Appels', value: '5' },
                { label: 'RDV', value: '2' },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-muted/60 py-2 px-2 text-center">
                  <p className="font-display text-base font-bold text-foreground">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Question rapide */}
          <div className="px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2.5">Demander à Atlas</p>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-muted px-3 py-2.5">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Une question…"
                className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
              />
              <button
                type="button"
                disabled={!input.trim()}
                className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-30 transition-opacity"
              >
                <Send className="size-3 stroke-2" />
              </button>
            </div>
          </div>

        </div>
      </aside>

      {/* Tab flottante quand collapsed — desktop seulement */}
      {collapsed && (
        <button
          type="button"
          onClick={onToggle}
          title="Ouvrir Atlas"
          className="hidden lg:flex fixed right-0 top-1/2 -translate-y-1/2 z-40 flex-col items-center gap-1 rounded-l-xl border border-r-0 border-border bg-surface px-1.5 py-3 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shadow-sm"
        >
          <PanelRightOpen className="size-3.5" />
          <span className="text-[9px] font-bold tracking-wider [writing-mode:vertical-lr] rotate-180">ATLAS</span>
        </button>
      )}
    </>
  )
}
