'use client'

import { TopBar } from '@/components/top-bar'
import { Card } from '@/components/card'
import {
  ChevronRight,
  Flame,
  PhoneCall,
  BookOpen,
  CalendarDays,
  History,
  Search,
  Users,
  Mic,
  CheckCircle2,
  X,
  Check,
  ThumbsUp,
  Sparkles,
} from 'lucide-react'
import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ── Données mobiles (inchangées) ─────────────────────────────────────────────

const dailyTasks = [
  {
    id: 't1',
    icon: Flame,
    iconBg: 'bg-orange-100',
    iconColor: 'text-primary',
    label: 'Relancer 3 prospects chauds',
    cta: '/contacts',
    ctaLabel: 'Préparer',
    ctaPrimary: true,
    done: false,
  },
  {
    id: 't2',
    icon: PhoneCall,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    label: 'Appeler Sophie pour son closing',
    cta: '/aria',
    ctaLabel: 'Script',
    ctaPrimary: false,
    done: false,
  },
  {
    id: 't3',
    icon: BookOpen,
    iconBg: 'bg-green-100',
    iconColor: 'text-success',
    label: 'Module 3 — Formation',
    cta: '/formation/m3',
    ctaLabel: 'Reprendre',
    ctaPrimary: false,
    done: true,
  },
]

const agenda = [
  { time: '14:00', stage: 'Closing', stageColor: 'bg-red-100 text-red-600', name: 'Sophie Laurent', href: '/contacts/c1' },
  { time: '16:30', stage: 'Découverte', stageColor: 'bg-blue-100 text-blue-600', name: 'Julie Moreau', href: '/contacts' },
]

const ariaPhases = ['Invitation', 'Suivi', 'Démarrage', 'Coaching']

// ── Données desktop ───────────────────────────────────────────────────────────

type FeedAction = {
  kind: 'action'
  id: string
  tag: string
  tagColor: string
  icon: React.ElementType
  iconBg: string
  iconColor: string
  label: string
  cta: string
  ctaLabel: string
  ctaPrimary: boolean
}

type FeedNetwork = {
  kind: 'network'
  id: string
  initials: string
  avatarBg: string
  name: string
  label: string
  sub: string
  trigger: string
  cta: string
  ctaLabel: string
}

type FeedItem = FeedAction | FeedNetwork

const feedItems: FeedItem[] = [
  {
    kind: 'action',
    id: 'f1',
    tag: 'AGIS',
    tagColor: 'bg-primary/10 text-primary',
    icon: Flame,
    iconBg: 'bg-orange-100',
    iconColor: 'text-primary',
    label: 'Relancer Sophie — prospect chaud depuis 5 jours',
    cta: '/contacts/c1',
    ctaLabel: 'Préparer',
    ctaPrimary: true,
  },
  {
    kind: 'network',
    id: 'f2',
    initials: 'TH',
    avatarBg: 'bg-blue-400',
    name: 'Thomas',
    label: 'a signé son premier closing',
    sub: 'il y a 2h · ton N1',
    trigger: 'Appelle tes prospects chauds',
    cta: '/contacts',
    ctaLabel: 'Féliciter',
  },
  {
    kind: 'action',
    id: 'f3',
    tag: 'HONORE',
    tagColor: 'bg-amber-100 text-amber-700',
    icon: CalendarDays,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    label: '14:00 — Closing avec Sophie Laurent',
    cta: '/agenda',
    ctaLabel: 'Agenda',
    ctaPrimary: false,
  },
  {
    kind: 'network',
    id: 'f4',
    initials: 'MA',
    avatarBg: 'bg-green-400',
    name: 'Marie',
    label: 'a terminé le module 2',
    sub: 'il y a 4h · ta filleule',
    trigger: 'Tu es au module 3 — continue',
    cta: '/network',
    ctaLabel: 'Voir',
  },
  {
    kind: 'action',
    id: 'f5',
    tag: 'APPRENDS',
    tagColor: 'bg-green-100 text-green-700',
    icon: BookOpen,
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    label: 'Module 3 — 4 leçons restantes',
    cta: '/formation',
    ctaLabel: 'Reprendre',
    ctaPrimary: false,
  },
  {
    kind: 'network',
    id: 'f6',
    initials: 'LU',
    avatarBg: 'bg-violet-400',
    name: 'Lucas',
    label: 'a ajouté 3 contacts cette semaine',
    sub: 'hier · ton N2',
    trigger: 'Tu as 2 prospects en attente de relance',
    cta: '/network',
    ctaLabel: 'Motiver',
  },
  {
    kind: 'action',
    id: 'f7',
    tag: 'AGIS',
    tagColor: 'bg-primary/10 text-primary',
    icon: PhoneCall,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    label: 'Appeler Julie Moreau — suivi à J+7',
    cta: '/contacts',
    ctaLabel: 'Script',
    ctaPrimary: false,
  },
]

// ── Contacts ARIA (simulés) ───────────────────────────────────────────────────

const ariaContacts = [
  { id: 'c1', name: 'Sophie Laurent', stage: 'Closing', sim: 'Suivi' },
  { id: 'c2', name: 'Thomas Renard', stage: 'Découverte', sim: 'Invitation' },
  { id: 'c3', name: 'Julie Moreau', stage: 'Suivi J+7', sim: 'Suivi' },
  { id: 'c4', name: 'Marie Dupont', stage: 'Filleule', sim: 'Démarrage' },
  { id: 'c5', name: 'Alex Martin', stage: 'Partenaire', sim: 'Coaching' },
  { id: 'c6', name: 'Sarah Petit', stage: 'Prospect', sim: 'Invitation' },
]

const JOURNAL = [
  { label: 'Simulation ARIA — score 82/100', time: "Aujourd'hui · 10h14" },
  { label: 'Contact ajouté — Marie Dupont (prospect)', time: 'Hier · 16h32' },
  { label: 'Formation Module 2 terminé', time: 'Hier · 09h05' },
  { label: 'Simulation ARIA — score 71/100', time: 'Lundi · 14h20' },
]

// ── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  // Mobile state
  const [ariaPhase, setAriaPhase] = useState('Invitation')
  const [ariaSearch, setAriaSearch] = useState('')

  // Tasks checkables
  const [checkedTasks, setCheckedTasks] = useState<Set<string>>(new Set(['t3']))

  // Desktop ARIA state
  const [deskSearch, setDeskSearch] = useState('')
  const [deskOpen, setDeskOpen] = useState(false)
  const [deskContact, setDeskContact] = useState<typeof ariaContacts[0] | null>(null)
  const deskRef = useRef<HTMLDivElement>(null)

  const filtered = ariaContacts.filter((c) =>
    c.name.toLowerCase().includes(deskSearch.toLowerCase())
  )

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (deskRef.current && !deskRef.current.contains(e.target as Node)) {
        setDeskOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function selectContact(c: typeof ariaContacts[0]) {
    setDeskContact(c)
    setDeskSearch(c.name)
    setDeskOpen(false)
  }

  function clearContact() {
    setDeskContact(null)
    setDeskSearch('')
  }

  return (
    <>
      <TopBar />

      {/* ══════════════ MOBILE — NE PAS TOUCHER ══════════════ */}
      <div className="lg:hidden px-4 pt-5 pb-8">
        <h1 className="font-display text-[32px] font-extrabold leading-tight tracking-[-0.025em] text-foreground">
          Mon parcours
        </h1>

        <div className="mt-6 flex flex-col gap-6">

          {/* Plan du jour */}
          <Card className="p-0 overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground font-display text-xs font-bold">A</span>
              <span className="text-sm font-bold text-foreground">Plan du jour</span>
            </div>
            <div className="divide-y divide-border">
              {dailyTasks.map((task) => {
                const Icon = task.icon
                return (
                  <Link key={task.id} href={task.cta} className="flex items-center gap-3 px-4 py-3.5 transition-colors active:bg-muted hover:bg-muted/40">
                    <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl', task.iconBg)}>
                      <Icon className={cn('size-4 stroke-[1.5]', task.iconColor)} />
                    </span>
                    <span className="flex-1 text-sm font-medium text-foreground leading-snug">{task.label}</span>
                    <span className={cn('shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors', task.ctaPrimary ? 'bg-primary text-primary-foreground' : 'border border-border bg-surface text-foreground')}>
                      {task.ctaLabel}
                    </span>
                  </Link>
                )
              })}
            </div>
          </Card>

          {/* Rapport Atlas */}
          <Link href="/network">
            <Card className="flex items-center gap-3 p-4 transition-colors active:bg-muted/50 hover:bg-muted/40">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <span className="font-display text-base font-bold text-primary">A</span>
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">Ton rapport hebdo est prêt</p>
                <p className="text-xs text-muted-foreground">9 — 15 juin</p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Card>
          </Link>

          {/* Agenda */}
          <Card className="p-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <CalendarDays className="size-4 stroke-[1.5] text-muted-foreground" />
                <span className="text-sm font-bold text-foreground">Agenda du jour</span>
              </div>
              <Link href="/nova" className="text-xs font-semibold text-primary">Voir tout →</Link>
            </div>
            <div className="divide-y divide-border">
              {agenda.map((item) => (
                <div key={item.time} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-12 shrink-0 text-sm font-bold text-foreground tabular-nums">{item.time}</span>
                  <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-bold', item.stageColor)}>{item.stage}</span>
                  <span className="text-sm text-foreground">{item.name}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Simulateur ARIA */}
          <section>
            <p className="mb-3 px-0.5 text-[11px] font-extrabold uppercase tracking-widest text-primary">Simulateur ARIA</p>
            <Card className="p-4 flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                {ariaPhases.map((phase) => (
                  <button key={phase} type="button" onClick={() => setAriaPhase(phase)}
                    className={cn('rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors', ariaPhase === phase ? 'bg-primary/10 text-primary border border-primary/30' : 'border border-border bg-surface text-muted-foreground')}>
                    {phase}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground stroke-[1.5]" />
                <input type="search" value={ariaSearch} onChange={(e) => setAriaSearch(e.target.value)} placeholder="Rechercher un contact..."
                  className="w-full rounded-xl border border-border bg-muted py-2.5 pl-9 pr-4 text-sm placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring/40" />
              </div>
              <Link href={`/aria?phase=${ariaPhase}`} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground transition-transform active:scale-[0.98]">
                Simuler — {ariaPhase}
              </Link>
              <button type="button" onClick={() => toast.info('Sessions précédentes')} className="flex items-center gap-2 text-sm text-muted-foreground transition-colors active:opacity-70">
                <History className="size-4 stroke-[1.5]" />
                <span className="flex-1 text-left">Mes sessions précédentes</span>
                <ChevronRight className="size-4" />
              </button>
              <div className="flex items-start gap-3 rounded-xl bg-muted/60 p-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-success text-white font-display text-base font-bold">82</span>
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-0.5">Dernière session</p>
                  <p className="text-xs text-foreground leading-relaxed italic">« Bonne accroche — travaille ta relance sur l'objection prix. »</p>
                </div>
              </div>
            </Card>
          </section>

          {/* Formation + Communauté */}
          <div className="grid grid-cols-2 gap-3">
            <Link href="/formation">
              <Card className="flex flex-col items-start gap-3 p-4 transition-colors active:bg-muted/50 hover:bg-muted/40 h-full">
                <span className="flex size-10 items-center justify-center rounded-xl bg-blue-100">
                  <BookOpen className="size-5 stroke-[1.5] text-blue-600" />
                </span>
                <p className="text-sm font-bold text-foreground">Ma formation</p>
              </Card>
            </Link>
            <Link href="/communaute">
              <Card className="flex flex-col items-start gap-3 p-4 transition-colors active:bg-muted/50 hover:bg-muted/40 h-full">
                <span className="flex size-10 items-center justify-center rounded-xl bg-violet-100">
                  <Users className="size-5 stroke-[1.5] text-violet-600" />
                </span>
                <p className="text-sm font-bold text-foreground">Ma communauté</p>
              </Card>
            </Link>
          </div>

        </div>
      </div>

      {/* ══════════════ DESKTOP ══════════════ */}
      <div className="hidden lg:block px-8 pt-8 pb-10 max-w-6xl mx-auto">

        <div className="grid grid-cols-[1fr_340px] gap-6 items-start">

          {/* ── Colonne gauche — 3 zones ── */}
          <div className="flex flex-col gap-5">

            {/* Zone 1 — Plan du jour */}
            <Card className="p-0 overflow-hidden">
              <div className="flex items-start justify-between px-5 py-4 border-b border-border">
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <Sparkles className="size-4 text-primary stroke-[1.5]" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      Ton plan du jour{' '}
                      <span className="font-normal text-muted-foreground text-xs">· par Atlas</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {dailyTasks.filter((t) => !checkedTasks.has(t.id)).length} actions restantes
                    </p>
                  </div>
                </div>
                <Link
                  href="/atlas"
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground hover:opacity-90 transition-opacity shrink-0"
                >
                  <Sparkles className="size-3.5 stroke-2" />
                  Discuter
                </Link>
              </div>
              <div className="divide-y divide-border">
                {dailyTasks.map((task) => {
                  const Icon = task.icon
                  const done = checkedTasks.has(task.id)
                  return (
                    <div key={task.id} className={cn(
                      'flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-muted/20',
                      done && 'opacity-50'
                    )}>
                      <button
                        type="button"
                        onClick={() => setCheckedTasks((prev) => {
                          const next = new Set(prev)
                          next.has(task.id) ? next.delete(task.id) : next.add(task.id)
                          return next
                        })}
                        className={cn(
                          'flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                          done ? 'border-primary bg-primary' : 'border-border hover:border-primary'
                        )}
                      >
                        {done && <Check className="size-3 text-primary-foreground stroke-[3]" />}
                      </button>
                      <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg', task.iconBg)}>
                        <Icon className={cn('size-4 stroke-[1.5]', task.iconColor)} />
                      </span>
                      <p className={cn('flex-1 text-sm text-foreground', done && 'line-through text-muted-foreground')}>
                        {task.label}
                      </p>
                      {!done && (
                        <Link
                          href={task.cta}
                          className={cn(
                            'shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors',
                            task.ctaPrimary
                              ? 'bg-primary text-primary-foreground hover:opacity-90'
                              : 'border border-border bg-surface text-foreground hover:bg-muted'
                          )}
                        >
                          {task.ctaLabel}
                        </Link>
                      )}
                    </div>
                  )
                })}
              </div>
            </Card>

            {/* Zone 2 — Mon réseau bouge */}
            <Card className="p-0 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
                <p className="text-sm font-bold text-foreground">Mon réseau bouge</p>
                <Link href="/network" className="text-xs font-semibold text-primary">Voir →</Link>
              </div>
              <div className="divide-y divide-border">
                {(feedItems.filter((f) => f.kind === 'network') as FeedNetwork[]).map((item) => (
                  <div key={item.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/20 transition-colors">
                    <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white', item.avatarBg)}>
                      {item.initials}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground leading-snug">
                          <span className="font-bold">{item.name}</span>{' '}
                          <span className="text-muted-foreground">{item.label}</span>
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{item.sub}</p>
                        <p className="mt-1.5 text-xs text-primary font-medium">
                          → {item.trigger}
                        </p>
                      </div>
                      <Link
                        href={item.cta}
                        className="shrink-0 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                      >
                        {item.ctaLabel}
                      </Link>
                    </div>
                )
              })}
            </div>
          </Card>

            {/* Zone 3 — Journal de bord */}
            <Card className="p-0 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
                <p className="text-sm font-bold text-foreground">Journal de bord</p>
              </div>
              <div className="px-5 py-4 flex flex-col gap-4">
                {JOURNAL.map((entry, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="flex flex-col items-center shrink-0 pt-1">
                      <div className={cn(
                        'size-2 rounded-full shrink-0',
                        i === 0 ? 'bg-primary' : 'bg-border'
                      )} />
                      {i < JOURNAL.length - 1 && (
                        <div className="w-px flex-1 bg-border mt-1.5 min-h-[24px]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pb-1">
                      <p className="text-sm text-foreground leading-snug">{entry.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{entry.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

          </div>

          {/* ── Colonne droite ── */}
          <div className="flex flex-col gap-5">

            {/* ARIA — nouvelle version */}
            <Card className="p-0 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
                <div className="flex items-center gap-2">
                  <Mic className="size-4 stroke-[1.5] text-muted-foreground" />
                  <span className="text-sm font-bold text-foreground">Simulateur ARIA</span>
                </div>
                <Link href="/aria" className="text-xs font-semibold text-primary">Voir tout →</Link>
              </div>
              <div className="p-4 flex flex-col gap-4">

                {/* Recherche contact avec dropdown */}
                <div ref={deskRef} className="relative">
                  <div className={cn(
                    'flex items-center gap-2 rounded-xl border bg-muted px-3 py-2.5 transition-colors',
                    deskOpen ? 'border-primary/40 ring-2 ring-primary/20' : 'border-border'
                  )}>
                    <Search className="size-4 shrink-0 text-muted-foreground stroke-[1.5]" />
                    <input
                      type="text"
                      value={deskSearch}
                      onChange={(e) => {
                        setDeskSearch(e.target.value)
                        setDeskContact(null)
                        setDeskOpen(e.target.value.length > 0)
                      }}
                      onFocus={() => { if (deskSearch.length > 0 && !deskContact) setDeskOpen(true) }}
                      placeholder="Rechercher un contact..."
                      className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                    />
                    {deskSearch && (
                      <button type="button" onClick={clearContact} className="text-muted-foreground hover:text-foreground transition-colors">
                        <X className="size-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Dropdown */}
                  {deskOpen && filtered.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-xl border border-border bg-surface shadow-lg overflow-hidden">
                      {filtered.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => selectContact(c)}
                          className="flex w-full items-center justify-between px-3.5 py-2.5 text-left hover:bg-muted transition-colors"
                        >
                          <span className="text-sm font-medium text-foreground">{c.name}</span>
                          <span className="text-[11px] text-muted-foreground">{c.stage}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Contact sélectionné — Atlas détecte le type */}
                {deskContact ? (
                  <div className="rounded-xl bg-muted/60 px-3.5 py-3 flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-sm font-bold text-primary">
                      {deskContact.name.split(' ').map((n) => n[0]).join('')}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{deskContact.name}</p>
                      <p className="text-[11px] text-muted-foreground">{deskContact.stage}</p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
                      {deskContact.sim}
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-1">
                    Atlas détecte automatiquement le type de simulation
                  </p>
                )}

                {/* Bouton simuler */}
                <Link
                  href={deskContact ? `/aria?contact=${deskContact.id}&sim=${deskContact.sim}` : '/aria'}
                  className={cn(
                    'flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-opacity',
                    deskContact
                      ? 'bg-primary text-primary-foreground hover:opacity-90'
                      : 'bg-muted text-muted-foreground pointer-events-none'
                  )}
                >
                  <Mic className="size-4 stroke-2" />
                  {deskContact ? `Simuler — ${deskContact.sim}` : 'Simuler'}
                </Link>

                {/* Sessions précédentes */}
                <button
                  type="button"
                  onClick={() => toast.info('Sessions précédentes')}
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <History className="size-4 stroke-[1.5] shrink-0" />
                  <span className="flex-1 text-left">Mes sessions précédentes</span>
                  <ChevronRight className="size-3.5 shrink-0" />
                </button>

                {/* Dernière session */}
                <div className="flex items-start gap-3 rounded-xl bg-muted/60 p-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-success text-white font-display text-sm font-bold">82</span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">Dernière · Sophie Laurent</p>
                    <p className="text-xs text-foreground leading-relaxed italic">« Bonne accroche — travaille ta relance sur l'objection prix. »</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Formation */}
            <Card className="p-0 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
                <span className="text-sm font-bold text-foreground">Formation</span>
                <Link href="/formation" className="text-xs font-semibold text-primary">Continuer →</Link>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-foreground">Module 3 — Script d'invitation</span>
                  <span className="text-xs font-bold text-primary">60%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden mb-4">
                  <div className="h-full w-[60%] rounded-full bg-primary" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { n: '1/6', label: 'modules' },
                    { n: '24 min', label: 'restantes' },
                    { n: '4 leçons', label: 'à finir' },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl bg-muted/60 py-2 px-3 text-center">
                      <p className="text-sm font-bold text-foreground">{s.n}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Communauté */}
            <Card className="p-0 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
                <span className="text-sm font-bold text-foreground">Communauté</span>
                <Link href="/communaute" className="text-xs font-semibold text-primary">Voir →</Link>
              </div>
              <div className="p-4 flex items-center gap-3">
                <div className="flex -space-x-2">
                  {[
                    { initials: 'SL', bg: 'bg-blue-400' },
                    { initials: 'JM', bg: 'bg-green-400' },
                    { initials: 'KB', bg: 'bg-violet-400' },
                    { initials: 'NB', bg: 'bg-amber-400' },
                  ].map((a) => (
                    <span key={a.initials} className={cn('flex size-8 items-center justify-center rounded-full border-2 border-background text-[10px] font-bold text-white', a.bg)}>
                      {a.initials}
                    </span>
                  ))}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">12 membres actifs</p>
                  <p className="text-xs text-muted-foreground">2 nouveaux cette semaine</p>
                </div>
              </div>
            </Card>

          </div>
        </div>
      </div>
    </>
  )
}
