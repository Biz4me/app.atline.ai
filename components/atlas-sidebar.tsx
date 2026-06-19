'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRef, useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  ChevronLeft, ChevronRight, Sparkles, Mic, CalendarDays,
  Search, X, History,
} from 'lucide-react'
import { toast } from 'sonner'

const ATLAS_SESSIONS = [
  { id: '1', icon: Sparkles, label: "Stratégie — relances prospects c...", time: "Auj. · 09:12", score: null },
  { id: '2', icon: Mic,      label: "Débrief simulation — Closing",        time: "Hier · 18:40",  score: 88 },
  { id: '3', icon: Sparkles, label: "Préparation call équipe",             time: "Hier · 08:30",  score: null },
]

const RDV = [
  { day: 'AUJ.',  time: '14:00', title: 'Call équipe hebdo',           sub: 'Visio · 6 participants' },
  { day: 'AUJ.',  time: '16:30', title: "Présentation produit — Sophie", sub: "Prospect · présentiel" },
  { day: 'DEM.',  time: '09:00', title: 'Closing avec Karim',           sub: 'Appel téléphonique' },
]

const ariaContacts = [
  { id: 'c1', name: 'Sophie Laurent', stage: 'Closing',     sim: 'Suivi' },
  { id: 'c2', name: 'Thomas Renard',  stage: "Découverte",  sim: 'Invitation' },
  { id: 'c3', name: 'Julie Moreau',   stage: 'Suivi J+7',   sim: 'Suivi' },
  { id: 'c4', name: 'Marie Dupont',   stage: 'Filleule',    sim: "Démarrage" },
  { id: 'c5', name: 'Alex Martin',    stage: 'Partenaire',  sim: 'Coaching' },
  { id: 'c6', name: 'Sarah Petit',    stage: 'Prospect',    sim: 'Invitation' },
]

interface Props {
  collapsed: boolean
  onToggle: () => void
}

export function AtlasSidebar({ collapsed, onToggle }: Props) {
  const pathname = usePathname()
  const hiddenOnThisPage = pathname === '/atlas' || pathname.startsWith('/atlas/')

  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [contact, setContact] = useState<typeof ariaContacts[0] | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  const filtered = ariaContacts.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function selectContact(c: typeof ariaContacts[0]) {
    setContact(c)
    setSearch(c.name)
    setOpen(false)
  }

  function clearContact() {
    setContact(null)
    setSearch('')
  }

  if (hiddenOnThisPage) return null

  const isOpen = !collapsed

  return (
    <>
      <aside
        className={cn(
          'hidden lg:flex flex-col fixed right-0 top-14 h-[calc(100dvh-3.5rem)] z-40',
          'bg-background border-l border-border overflow-hidden',
          'transition-[width] duration-200 ease-out',
          isOpen ? 'w-[360px]' : 'w-14',
        )}
      >
        {/* Header */}
        <div className={cn(
          'flex items-center shrink-0 h-12 border-b border-border',
          isOpen ? 'px-4' : 'justify-center px-0',
        )}>
          <button
            type="button"
            onClick={onToggle}
            title={isOpen ? 'Réduire' : 'Développer'}
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            {isOpen ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          </button>
          {isOpen && (
            <div className="flex items-center gap-2 ml-2">
              <Sparkles className="size-4 text-primary stroke-[1.5]" />
              <span className="text-sm font-semibold text-foreground">Atlas</span>
            </div>
          )}
        </div>

        {!isOpen && (
          <nav className="flex flex-col gap-0.5 px-2 pt-3 overflow-x-hidden">
            <button type="button" onClick={onToggle} title="Simulateur ARIA"
              className="flex size-10 items-center justify-center rounded-xl mx-auto text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              <Mic className="size-[18px] stroke-[1.5]" />
            </button>
            <button type="button" onClick={onToggle} title="Prochains rendez-vous"
              className="flex size-10 items-center justify-center rounded-xl mx-auto text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              <CalendarDays className="size-[18px] stroke-[1.5]" />
            </button>
          </nav>
        )}

        <div className={cn('flex-1 overflow-y-auto px-[10px] py-3 flex flex-col gap-3', !isOpen && 'hidden')}>

          {/* ── Card Simulateur ARIA ── */}
          <div className="rounded-xl border border-border bg-surface overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-1.5">
                <Mic className="size-3.5 text-muted-foreground stroke-[1.5]" />
                <p className="text-sm font-bold text-foreground">Simulateur ARIA</p>
              </div>
              <Link href="/aria" className="text-xs font-semibold text-primary">Voir tout →</Link>
            </div>
            <div className="p-4 flex flex-col gap-3">

              {/* Recherche contact */}
              <div ref={ref} className="relative">
                <div className={cn(
                  'flex items-center gap-2 rounded-xl border bg-muted px-3 py-2 transition-colors',
                  open ? 'border-primary/40 ring-2 ring-primary/20' : 'border-border'
                )}>
                  <Search className="size-3.5 shrink-0 text-muted-foreground stroke-[1.5]" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value)
                      setContact(null)
                      setOpen(e.target.value.length > 0)
                    }}
                    onFocus={() => { if (search.length > 0 && !contact) setOpen(true) }}
                    placeholder="Rechercher un contact..."
                    className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
                  />
                  {search && (
                    <button type="button" onClick={clearContact} className="text-muted-foreground hover:text-foreground">
                      <X className="size-3" />
                    </button>
                  )}
                </div>
                {open && filtered.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-xl border border-border bg-surface shadow-lg overflow-hidden">
                    {filtered.map((c) => (
                      <button key={c.id} type="button" onClick={() => selectContact(c)}
                        className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted transition-colors">
                        <span className="text-xs font-medium text-foreground">{c.name}</span>
                        <span className="text-[11px] text-muted-foreground">{c.stage}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Contact sélectionné */}
              {contact && (
                <div className="rounded-xl bg-muted/60 px-3 py-2.5 flex items-center gap-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {contact.name.split(' ').map((n) => n[0]).join('')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground">{contact.name}</p>
                    <p className="text-[11px] text-muted-foreground">{contact.stage}</p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary shrink-0">
                    {contact.sim}
                  </span>
                </div>
              )}

              {/* Bouton simuler */}
              <Link
                href={contact ? `/aria?contact=${contact.id}&sim=${contact.sim}` : '/aria'}
                className={cn(
                  'flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-opacity',
                  contact
                    ? 'bg-primary text-primary-foreground hover:opacity-90'
                    : 'bg-muted text-muted-foreground pointer-events-none'
                )}
              >
                <Mic className="size-3.5 stroke-2" />
                {contact ? `Simuler — ${contact.sim}` : 'Simuler'}
              </Link>

              {/* Dernière session */}
              <div className="flex items-start gap-2.5 rounded-xl bg-muted/60 p-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#22c55e] text-white text-xs font-bold">82</span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">Dernière · Sophie Laurent</p>
                  <p className="text-[11px] text-foreground leading-relaxed italic">
                    &laquo; Bonne accroche — travaille ta relance sur l&apos;objection prix. &raquo;
                  </p>
                </div>
              </div>

              {/* Sessions précédentes */}
              <button type="button" onClick={() => toast.info("Sessions précédentes")}
                className="flex w-full items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                <History className="size-3.5 stroke-[1.5] shrink-0" />
                <span className="flex-1 text-left">Mes sessions précédentes</span>
                <ChevronRight className="size-3 shrink-0" />
              </button>
            </div>
          </div>

          {/* ── Card Prochains RDV ── */}
          <div className="rounded-xl border border-border bg-surface overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="text-sm font-bold text-foreground">Prochains rendez-vous</p>
              <Link href="/agenda" className="text-xs font-semibold text-primary">Agenda →</Link>
            </div>
            <div className="px-4 py-3 flex flex-col gap-3">
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

    </>
  )
}
