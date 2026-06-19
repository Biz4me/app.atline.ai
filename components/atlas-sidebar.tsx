'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { PanelRightClose, PanelRightOpen, CalendarDays, Sparkles, Mic, ChevronRight } from 'lucide-react'

const ATLAS_SESSIONS = [
  { id: '1', icon: Sparkles, label: "Stratégie — relances prospects c...", time: "Auj. · 09:12", score: null },
  { id: '2', icon: Mic,      label: "Débrief simulation — Closing",        time: "Hier · 18:40",  score: 88 },
  { id: '3', icon: Sparkles, label: "Préparation call équipe",             time: "Hier · 08:30",  score: null },
]

const RDV = [
  { day: 'AUJ.',  time: '14:00', title: 'Call équipe hebdo',        sub: 'Visio · 6 participants',  stage: 'Closing',     stageColor: 'bg-red-100 text-red-700' },
  { day: 'AUJ.',  time: '16:30', title: "Présentation produit — Sophie", sub: 'Prospect · présentiel', stage: "Découverte", stageColor: 'bg-blue-100 text-blue-700' },
  { day: 'DEM.',  time: '09:00', title: 'Closing avec Karim',         sub: 'Appel téléphonique',      stage: null,          stageColor: '' },
]

interface Props {
  collapsed: boolean
  onToggle: () => void
}

export function AtlasSidebar({ collapsed, onToggle }: Props) {
  const pathname = usePathname()
  const hiddenOnThisPage = pathname === '/atlas' || pathname.startsWith('/atlas/')

  if (hiddenOnThisPage) return null

  const isOpen = !collapsed

  return (
    <>
      <aside
        className={cn(
          'hidden lg:flex flex-col fixed right-0 top-14 h-[calc(100dvh-3.5rem)] z-40',
          'bg-background border-l border-border',
          'transition-[width,opacity] duration-200 ease-out overflow-hidden',
          isOpen ? 'w-[300px] opacity-100' : 'w-0 opacity-0 pointer-events-none',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary stroke-[1.5]" />
            <span className="text-sm font-semibold text-foreground">Atlas</span>
          </div>
          <button type="button" onClick={onToggle} title="Masquer"
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <PanelRightClose className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Sessions Atlas */}
          <div className="px-4 pt-4 pb-2">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-foreground">Sessions avec Atlas</p>
              <Link href="/atlas" className="text-[11px] text-primary font-medium hover:underline">
                Tout voir
              </Link>
            </div>
            <div className="flex flex-col gap-0.5">
              {ATLAS_SESSIONS.map((s) => {
                const Icon = s.icon
                return (
                  <Link key={s.id} href="/atlas"
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted transition-colors group">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted group-hover:bg-background transition-colors">
                      <Icon className="size-3.5 text-muted-foreground stroke-[1.5]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{s.label}</p>
                      <p className="text-[11px] text-muted-foreground">{s.time}</p>
                    </div>
                    {s.score && (
                      <span className="text-xs font-bold text-success shrink-0">{s.score}</span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="mx-4 h-px bg-border" />

          {/* ARIA */}
          <div className="px-4 pt-4 pb-2">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-foreground">Entraînement ARIA</p>
              <Link href="/aria" className="text-[11px] text-primary font-medium hover:underline">
                S&apos;entraîner
              </Link>
            </div>
            <div className="flex items-center gap-3 bg-muted rounded-xl px-3 py-3">
              <div className="relative flex size-12 shrink-0 items-center justify-center">
                <svg className="size-12 -rotate-90" viewBox="0 0 48 48">
                  <circle cx="24" cy="24" r="20" fill="none" stroke="var(--border)" strokeWidth="4" />
                  <circle cx="24" cy="24" r="20" fill="none" stroke="#f97316" strokeWidth="4"
                    strokeDasharray={`${2 * Math.PI * 20 * 0.74} ${2 * Math.PI * 20 * 0.26}`}
                    strokeLinecap="round" />
                </svg>
                <span className="absolute text-sm font-bold text-foreground">74</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Bon niveau</p>
                <p className="text-[11px] text-muted-foreground">15 simulations avec ARIA</p>
              </div>
            </div>
          </div>

          <div className="mx-4 h-px bg-border" />

          {/* Prochains RDV */}
          <div className="px-4 pt-4 pb-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-foreground">Prochains rendez-vous</p>
              <Link href="/agenda" className="text-[11px] text-primary font-medium hover:underline flex items-center gap-0.5">
                Voir l&apos;agenda <ChevronRight className="size-3" />
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              {RDV.map((r, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="text-center shrink-0 w-10">
                    <p className="text-[10px] font-bold text-muted-foreground">{r.day}</p>
                    <p className="text-sm font-bold text-foreground tabular-nums">{r.time}</p>
                  </div>
                  <div className="flex-1 min-w-0 border-l border-border pl-3">
                    <p className="text-xs font-medium text-foreground leading-tight">{r.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{r.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Tab flottante quand collapsed */}
      {!isOpen && !hiddenOnThisPage && (
        <button type="button" onClick={onToggle} title="Ouvrir Atlas"
          className="hidden lg:flex fixed right-0 top-1/2 -translate-y-1/2 z-40 flex-col items-center gap-1 rounded-l-xl border border-r-0 border-border bg-background px-1.5 py-3 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shadow-sm">
          <PanelRightOpen className="size-3.5" />
          <span className="text-[9px] font-bold tracking-wider [writing-mode:vertical-lr] rotate-180">ATLAS</span>
        </button>
      )}
    </>
  )
}
