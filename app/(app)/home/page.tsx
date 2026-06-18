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
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

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

export default function HomePage() {
  const [ariaPhase, setAriaPhase] = useState('Invitation')
  const [ariaSearch, setAriaSearch] = useState('')

  return (
    <>
      <TopBar />

      {/* ══════════════ MOBILE ══════════════ */}
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

        {/* KPI strip — mêmes Cards que le reste du site */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Contacts actifs', value: '12', sub: '+2 cette semaine', valueColor: '' },
            { label: 'Score ARIA', value: '82', sub: '▲ +6 pts vs semaine passée', valueColor: 'text-success' },
            { label: 'Progression', value: '60%', sub: null, valueColor: '' },
            { label: 'Filleuls Atline', value: '3', sub: '2 mois offerts', valueColor: '' },
          ].map((kpi) => (
            <Card key={kpi.label} className="p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">{kpi.label}</p>
              <p className={cn('font-display text-3xl font-extrabold leading-none', kpi.valueColor || 'text-foreground')}>{kpi.value}</p>
              {kpi.label === 'Progression' ? (
                <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full w-[60%] rounded-full bg-primary" />
                </div>
              ) : (
                <p className="mt-1.5 text-xs text-muted-foreground">{kpi.sub}</p>
              )}
            </Card>
          ))}
        </div>

        {/* Grille 2 colonnes */}
        <div className="grid grid-cols-[1fr_340px] gap-6 items-start">

          {/* ── Colonne gauche ── */}
          <div className="flex flex-col gap-5">

            {/* Plan du jour */}
            <Card className="p-0 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground font-display text-xs font-bold">A</span>
                  <span className="text-sm font-bold text-foreground">Plan du jour</span>
                </div>
                <span className="text-xs text-muted-foreground">jeudi 18 juin · 2/3 faits</span>
              </div>
              <div className="divide-y divide-border">
                {dailyTasks.map((task) => {
                  const Icon = task.icon
                  return (
                    <Link key={task.id} href={task.cta} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/40 transition-colors">
                      <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl', task.done ? 'bg-success/15' : task.iconBg)}>
                        {task.done
                          ? <CheckCircle2 className="size-4 stroke-2 text-success" />
                          : <Icon className={cn('size-4 stroke-[1.5]', task.iconColor)} />}
                      </span>
                      <span className={cn('flex-1 text-sm font-medium leading-snug', task.done ? 'line-through text-muted-foreground' : 'text-foreground')}>
                        {task.label}
                      </span>
                      {!task.done && (
                        <span className={cn('shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-bold', task.ctaPrimary ? 'bg-primary text-primary-foreground' : 'border border-border bg-surface text-foreground')}>
                          {task.ctaLabel}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </Card>

            {/* Rapport Atlas */}
            <Card className="p-0 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary/10">
                    <span className="font-display text-xs font-bold text-primary">A</span>
                  </span>
                  <span className="text-sm font-bold text-foreground">Rapport Atlas · 9–15 juin</span>
                </div>
                <Link href="/network" className="text-xs font-semibold text-primary">Voir tout →</Link>
              </div>
              <div className="px-5 py-4">
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {[
                    { label: 'Contacts', value: '8' },
                    { label: 'Appels', value: '5' },
                    { label: 'RDV', value: '2' },
                    { label: 'Score', value: '82', color: 'text-success' },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl bg-muted/60 px-3 py-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</p>
                      <p className={cn('mt-0.5 font-display text-xl font-bold', s.color ?? 'text-foreground')}>{s.value}</p>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground italic leading-relaxed">
                  « Excellente semaine sur l'invitation. Point à améliorer : gestion des objections prix. »
                </p>
              </div>
            </Card>

            {/* Agenda */}
            <Card className="p-0 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
                <div className="flex items-center gap-2">
                  <CalendarDays className="size-4 stroke-[1.5] text-muted-foreground" />
                  <span className="text-sm font-bold text-foreground">Agenda du jour</span>
                </div>
                <Link href="/agenda" className="text-xs font-semibold text-primary">Voir tout →</Link>
              </div>
              <div className="divide-y divide-border">
                {agenda.map((item) => (
                  <Link key={item.time} href={item.href} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/40 transition-colors">
                    <span className="w-12 shrink-0 text-sm font-bold text-foreground tabular-nums">{item.time}</span>
                    <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-bold shrink-0', item.stageColor)}>{item.stage}</span>
                    <span className="flex-1 text-sm text-foreground">{item.name}</span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </Card>

          </div>

          {/* ── Colonne droite ── */}
          <div className="flex flex-col gap-5">

            {/* ARIA */}
            <Card className="p-0 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
                <span className="text-sm font-bold text-foreground">Simulateur ARIA</span>
                <Link href="/aria" className="text-xs font-semibold text-primary">Lancer →</Link>
              </div>
              <div className="p-4 flex flex-col gap-4">
                <div className="flex flex-wrap gap-2">
                  {ariaPhases.map((phase) => (
                    <button key={phase} type="button" onClick={() => setAriaPhase(phase)}
                      className={cn('rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors', ariaPhase === phase ? 'bg-primary/10 text-primary border border-primary/30' : 'border border-border bg-surface text-muted-foreground')}>
                      {phase}
                    </button>
                  ))}
                </div>
                <div className="flex items-start gap-3 rounded-xl bg-muted/60 p-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-success text-white font-display text-sm font-bold">82</span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">Dernière · Sophie Laurent</p>
                    <p className="text-xs text-foreground leading-relaxed italic">« Bonne accroche — travaille ta relance sur l'objection prix. »</p>
                  </div>
                </div>
                <Link href={`/aria?phase=${ariaPhase}`}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 transition-opacity">
                  <Mic className="size-4 stroke-2" />
                  Simuler — {ariaPhase}
                </Link>
                <button type="button" onClick={() => toast.info('Sessions précédentes')}
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <History className="size-4 stroke-[1.5] shrink-0" />
                  <span className="flex-1 text-left">Mes sessions précédentes</span>
                  <ChevronRight className="size-3.5 shrink-0" />
                </button>
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
