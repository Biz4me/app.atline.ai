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
  Check,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { contacts } from '@/lib/data'

// ── Données mobiles (inchangées) ─────────────────────────────────────────────

type DailyTask = {
  id: string
  title: string
  subtitle: string | null
  icon: string
  color: string
  cta: string
  done: boolean
}

const agenda = [
  { time: '14:00', stage: 'Closing', stageColor: 'bg-red-100 text-red-600', name: 'Sophie Laurent', href: '/contacts/c1' },
  { time: '16:30', stage: 'Découverte', stageColor: 'bg-blue-100 text-blue-600', name: 'Julie Moreau', href: '/contacts' },
]

const ariaPhases = ['Invitation', 'Suivi', 'Démarrage', 'Coaching']

const DESKTOP_RDV = [
  { day: 'AUJ.',  time: '14:00', title: 'Call équipe hebdo',             sub: 'Visio · 6 participants'  },
  { day: 'AUJ.',  time: '16:30', title: "Présentation produit — Sophie", sub: "Prospect · présentiel"   },
  { day: 'DEM.',  time: '09:00', title: 'Closing avec Karim',             sub: 'Appel téléphonique'      },
]

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
    iconBg: 'bg-muted',
    iconColor: 'text-muted-foreground',
    label: 'Relancer Sophie — prospect chaud depuis 5 jours',
    cta: '/contacts/c1',
    ctaLabel: 'Préparer',
    ctaPrimary: true,
  },
  {
    kind: 'network',
    id: 'f2',
    initials: 'TH',
    avatarBg: 'bg-muted',
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
    iconBg: 'bg-muted',
    iconColor: 'text-muted-foreground',
    label: '14:00 — Closing avec Sophie Laurent',
    cta: '/agenda',
    ctaLabel: 'Agenda',
    ctaPrimary: false,
  },
  {
    kind: 'network',
    id: 'f4',
    initials: 'MA',
    avatarBg: 'bg-muted',
    name: 'Marie',
    label: 'a terminé le module 2',
    sub: 'il y a 4h · ta partenaire',
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
    iconBg: 'bg-muted',
    iconColor: 'text-muted-foreground',
    label: 'Module 3 — 4 leçons restantes',
    cta: '/formation',
    ctaLabel: 'Reprendre',
    ctaPrimary: false,
  },
  {
    kind: 'network',
    id: 'f6',
    initials: 'LU',
    avatarBg: 'bg-muted',
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
    iconBg: 'bg-muted',
    iconColor: 'text-muted-foreground',
    label: 'Appeler Julie Moreau — suivi à J+7',
    cta: '/contacts',
    ctaLabel: 'Script',
    ctaPrimary: false,
  },
]

// ── Contacts ARIA (simulés) ───────────────────────────────────────────────────

const JOURNAL = [
  { label: 'Simulation ARIA — score 82/100', time: "Aujourd'hui · 10h14", agent: 'aria' },
  { label: 'Contact ajouté — Marie Dupont (prospect)', time: 'Hier · 16h32', agent: null },
  { label: 'Formation Module 2 terminé', time: 'Hier · 09h05', agent: null },
  { label: 'Simulation ARIA — score 71/100', time: 'Lundi · 14h20', agent: 'aria' },
]

const JOURNAL_DOT: Record<string, string> = {
  aria:  '#14B8A6',
  atlas: '#F97316',
  nova:  '#8B5CF6',
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  // Mobile state
  const [ariaPhase, setAriaPhase] = useState('Invitation')
  const [ariaSearch, setAriaSearch] = useState('')

  // Plan du jour
  const [plan, setPlan] = useState<{ id: string; tasks: DailyTask[] } | null>(null)
  const [planLoading, setPlanLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [checkedTasks, setCheckedTasks] = useState<Set<string>>(new Set())

  const dailyTasks = plan?.tasks ?? []
  const allDone = dailyTasks.length > 0 && dailyTasks.every((t) => checkedTasks.has(t.id))

  const fetchPlan = useCallback(async () => {
    setPlanLoading(true)
    try {
      const res = await fetch('/api/daily-plan/today')
      const data = await res.json()
      setPlan(data.plan ?? null)
    } catch {}
    setPlanLoading(false)
  }, [])

  useEffect(() => { fetchPlan() }, [fetchPlan])

  const generatePlan = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/daily-plan/generate', { method: 'POST' })
      const data = await res.json()
      if (data.plan) setPlan(data.plan)
    } catch {}
    setGenerating(false)
  }

  const toggleTask = async (taskId: string, done: boolean) => {
    setPlan(prev => prev ? { ...prev, tasks: prev.tasks.map(t => t.id === taskId ? { ...t, done } : t) } : prev)
    await fetch(`/api/daily-plan/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done }),
    }).catch(() => {})
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
              <span className="flex-1 text-sm font-bold text-foreground">Plan du jour</span>
              <button type="button" onClick={generatePlan} disabled={generating}
                className="flex size-7 items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40">
                {generating ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
              </button>
            </div>
            {planLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : !plan ? (
              <div className="flex flex-col items-center gap-3 py-6 px-4 text-center">
                <p className="text-sm text-muted-foreground">Atlas va te préparer ton plan du jour.</p>
                <button type="button" onClick={generatePlan} disabled={generating}
                  className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60">
                  {generating ? <Loader2 className="size-4 animate-spin" /> : null}
                  {generating ? "Génération..." : "Générer mon plan"}
                </button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {plan.tasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-3 px-4 py-3.5">
                    <button type="button" onClick={() => toggleTask(task.id, !task.done)}
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                        task.done ? "border-primary bg-primary" : "border-border bg-transparent"
                      )}>
                      {task.done && <Check className="size-3.5 stroke-[2.5] text-primary-foreground" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-medium leading-snug", task.done ? "line-through text-muted-foreground" : "text-foreground")}>
                        {task.title}
                      </p>
                      {task.subtitle && <p className="text-xs text-muted-foreground mt-0.5">{task.subtitle}</p>}
                    </div>
                    <Link href={task.cta}
                      className="shrink-0 rounded-xl border border-border bg-surface px-3.5 py-1.5 text-xs font-bold text-foreground transition-colors active:bg-muted">
                      Aller
                    </Link>
                  </div>
                ))}
              </div>
            )}
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
              <Link href="/nova" className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">Voir tout →</Link>
            </div>
            <div className="divide-y divide-border">
              {agenda.map((item) => (
                <div key={item.time} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-12 shrink-0 text-sm font-bold text-foreground tabular-nums">{item.time}</span>
                  <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold', item.stageColor)}>{item.stage}</span>
                  <span className="text-sm text-foreground">{item.name}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Simulateur ARIA */}
          <section>
            <p className="mb-3 px-0.5 text-xs font-extrabold uppercase tracking-widest text-primary">Simulateur ARIA</p>
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
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mb-0.5">Dernière session</p>
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

        {/* ── KPI Strip ── */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Liste de noms',       value: '12', sub: '+2 cette semaine'  },
            { label: 'Score ARIA',         value: '82', sub: 'Moyenne 30 jours'  },
            { label: 'Partenaires actifs', value: '4',  sub: 'sur 7 partenaires' },
          ].map((kpi) => (
            <Card key={kpi.label} className="px-4 py-3">
              <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
              <p className="text-xl font-bold text-foreground mt-1 tabular-nums">{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{kpi.sub}</p>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-[1fr_340px] gap-6 items-start">

          {/* ── Colonne gauche — 3 zones ── */}
          <div className="flex flex-col gap-5">

            {/* Zone 1 — Plan du jour */}
            <Card className="p-0 overflow-hidden">
              <div className="flex items-start justify-between px-5 py-4 border-b border-border">
                <div className="flex items-start gap-3">
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      Ton plan du jour{' '}
                      <span className="font-normal text-muted-foreground text-xs">· par Atlas</span>
                    </p>
                    <p className={cn(
                      'text-xs mt-0.5',
                      allDone ? 'text-[#22c55e] font-medium' : 'text-muted-foreground'
                    )}>
                      {allDone ? 'Toutes les actions terminées ✓' : `${dailyTasks.filter((t) => !checkedTasks.has(t.id)).length} actions restantes`}
                    </p>
                  </div>
                </div>
                <Link
                  href="/atlas"
                  className="flex items-center gap-1.5 rounded-xl bg-primary/10 text-primary px-3.5 py-2 text-xs font-bold hover:bg-primary/20 transition-colors shrink-0"
                >
                  Discuter
                </Link>
              </div>
              {allDone ? (
                <div className="flex items-center gap-3 px-5 py-5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#22c55e]/10">
                    <Check className="size-5 text-[#22c55e] stroke-[2.5]" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-foreground">Plan du jour bouclé</p>
                    <button type="button" onClick={() => setCheckedTasks(new Set())}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors mt-0.5">
                      Tout décocher
                    </button>
                  </div>
                </div>
              ) : (
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
                      <p className={cn('flex-1 text-sm font-medium text-foreground', done && 'line-through text-muted-foreground')}>
                        {task.label}
                      </p>
                      {!done && (
                        <Link
                          href={task.cta}
                          className={cn(
                            'shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors',
                            'border border-border bg-surface text-foreground hover:bg-muted'
                          )}
                        >
                          {task.ctaLabel}
                        </Link>
                      )}
                    </div>
                  )
                })}
              </div>
              )}
            </Card>

            {/* Zone 2 — Mon réseau bouge */}
            <Card className="p-0 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
                <div>
                  <p className="text-sm font-bold text-foreground">Mon réseau bouge</p>
                  <p className="text-xs text-muted-foreground mt-0.5">3 partenaires actifs cette semaine</p>
                </div>
                <Link href="/network" className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">Voir →</Link>
              </div>
              <div className="divide-y divide-border">
                {(feedItems.filter((f) => f.kind === 'network') as FeedNetwork[]).map((item) => (
                  <div key={item.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/20 transition-colors">
                    <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-muted-foreground', item.avatarBg)}>
                      {item.initials}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground leading-snug">
                        <span className="font-bold">{item.name}</span>{' '}
                        <span className="text-muted-foreground">{item.label}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.sub}</p>
                    </div>
                    <Link
                      href={item.cta}
                      className="shrink-0 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                    >
                      {item.ctaLabel}
                    </Link>
                  </div>
                ))}
              </div>
            </Card>

          </div>

          {/* ── Colonne droite ── */}
          <div className="flex flex-col gap-5">

            {/* Prochains rendez-vous */}
            <Card className="p-0 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
                <span className="text-sm font-bold text-foreground">Prochains rendez-vous</span>
                <Link href="/agenda" className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">Agenda →</Link>
              </div>
              <div className="px-5 py-4 flex flex-col gap-4">
                {DESKTOP_RDV.map((r, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="text-center shrink-0 w-10">
                      <p className="text-[10px] font-bold text-muted-foreground">{r.day}</p>
                      <p className="text-sm font-bold text-foreground tabular-nums">{r.time}</p>
                    </div>
                    <div className="flex-1 min-w-0 border-l border-border pl-3">
                      <p className="text-xs font-medium text-foreground leading-tight">{r.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{r.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Formation */}
            <Card className="p-0 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
                <span className="text-sm font-bold text-foreground">Formation</span>
                <Link href="/formation" className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">Continuer →</Link>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Module 3 — Script d'invitation</span>
                  <span className="text-xs font-bold text-primary">60%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden mb-4">
                  <div className="h-full w-[60%] rounded-full bg-primary" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { n: '1/6', label: 'modules' },
                    { n: '24 min', label: 'restantes' },
                    { n: '4', label: 'leçons restantes' },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl bg-muted/60 py-2 px-3 text-center">
                      <p className="text-sm font-bold text-foreground">{s.n}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

          </div>
        </div>
      </div>
    </>
  )
}
