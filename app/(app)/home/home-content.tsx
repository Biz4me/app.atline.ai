'use client'

import { Card } from '@/components/card'
import {
  ChevronRight,
  Flame,
  PhoneCall,
  BookOpen,
  CalendarDays,
  Users,
  Check,
  Rocket,
  Mic,
} from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

// ── Données mobiles (inchangées) ─────────────────────────────────────────────

const dailyTasks = [
  {
    id: 't1',
    icon: Flame,
    iconBg: 'bg-muted',
    iconColor: 'text-muted-foreground',
    label: 'Relancer 3 prospects chauds',
    cta: '/contacts',
    ctaLabel: 'Préparer',
    ctaPrimary: true,
    done: false,
  },
  {
    id: 't2',
    icon: PhoneCall,
    iconBg: 'bg-muted',
    iconColor: 'text-muted-foreground',
    label: 'Appeler Sophie pour son closing',
    cta: '/aria',
    ctaLabel: 'Script',
    ctaPrimary: false,
    done: false,
  },
  {
    id: 't3',
    icon: BookOpen,
    iconBg: 'bg-muted',
    iconColor: 'text-muted-foreground',
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

// ── Contacts Aria (simulés) ───────────────────────────────────────────────────

const JOURNAL = [
  { label: 'Simulation Aria — score 82/100', time: "Aujourd'hui · 10h14", agent: 'aria' },
  { label: 'Contact ajouté — Marie Dupont (prospect)', time: 'Hier · 16h32', agent: null },
  { label: 'Formation Module 2 terminé', time: 'Hier · 09h05', agent: null },
  { label: 'Simulation Aria — score 71/100', time: 'Lundi · 14h20', agent: 'aria' },
]

const JOURNAL_DOT: Record<string, string> = {
  aria:  '#14B8A6',
  atlas: '#F97316',
  nova:  '#8B5CF6',
}

// ── Carte partagée — Plan du jour (mobile + desktop, source unique) ────────────

function PlanDuJourCard() {
  const [checkedTasks, setCheckedTasks] = useState<Set<string>>(new Set(['t3']))
  const allDone = checkedTasks.size >= dailyTasks.length

  return (
    <Card className="p-0 overflow-hidden">
      <div className="flex h-14 items-center justify-between px-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Rocket className="size-4 stroke-[1.5] text-muted-foreground" />
          <span className="text-sm font-bold text-foreground">Plan du jour</span>
        </div>
        <Link
          href="/atlas"
          className="flex items-center gap-1.5 rounded-xl bg-primary/10 text-primary px-3.5 py-2 text-xs font-bold hover:bg-primary/20 transition-colors shrink-0"
        >
          Discuter
        </Link>
      </div>
      {allDone ? (
        <div className="flex items-center gap-3 px-4 py-5">
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
                'flex h-[60px] items-center gap-3 px-4 transition-colors hover:bg-muted/20',
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
                    className="shrink-0 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
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
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function HomeContent({ mantra }: { mantra: string }) {
  const [stats, setStats] = useState<{ contacts: number; rdv: number; simCount: number; certificates: number } | null>(null)
  useEffect(() => {
    fetch('/api/home/stats').then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) setStats(d) }).catch(() => {})
  }, [])

  return (
    <>
      {/* ══════════════ MOBILE — NE PAS TOUCHER ══════════════ */}
      <div className="lg:hidden px-4 pt-6 pb-8">
        <div className="flex flex-col gap-6">

          {/* Mantra */}
          {mantra ? (
            <div className="px-2 py-1 text-center leading-snug">
              <span className="text-primary font-semibold text-base">« </span>
              <span className="text-base font-semibold text-foreground">{mantra}</span>
              <span className="text-primary font-semibold text-base"> »</span>
            </div>
          ) : null}

          {/* Compteurs */}
          <div className="grid grid-cols-4 gap-2.5">
            {[
              { icon: Users, label: 'Contacts', value: stats?.contacts },
              { icon: CalendarDays, label: 'RDV', value: stats?.rdv },
              { icon: Mic, label: 'Aria', value: stats?.simCount },
              { icon: BookOpen, label: 'Formation', value: stats?.certificates },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-surface px-1 py-3 text-center shadow-card">
                <Icon className="size-4 stroke-[1.5] text-muted-foreground" />
                <span className="font-display text-lg font-bold tabular-nums text-foreground">{value ?? '—'}</span>
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>

          {/* Plan du jour */}
          <PlanDuJourCard />

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
                <div key={item.time} className="flex items-center gap-3 px-4 py-3.5">
                  <span className="w-12 shrink-0 text-sm font-bold text-foreground tabular-nums">{item.time}</span>
                  <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold', item.stageColor)}>{item.stage}</span>
                  <span className="text-sm text-foreground">{item.name}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Rapport Atlas */}
          <Link href="/atlas">
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

        </div>
      </div>

      {/* ══════════════ DESKTOP ══════════════ */}
      <div className="hidden lg:block px-8 pt-8 pb-10 max-w-6xl mx-auto">

        {/* ── Mantra ── */}
        {mantra ? (
          <div className="text-center mb-8 leading-snug">
            <span className="text-primary font-semibold text-base">« </span>
            <span className="text-base font-semibold text-foreground">{mantra}</span>
            <span className="text-primary font-semibold text-base"> »</span>
          </div>
        ) : null}

        {/* ── KPI Strip ── */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Liste de noms',       value: '12', sub: '+2 cette semaine'  },
            { label: 'Score Aria',         value: '82', sub: 'Moyenne 30 jours'  },
            { label: 'Partenaires actifs', value: '4',  sub: 'sur 7 partenaires' },
          ].map((kpi) => (
            <Card key={kpi.label} className="px-4 py-3">
              <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
              <p className="text-xl font-bold text-foreground mt-1 tabular-nums">{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{kpi.sub}</p>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-6 items-start">

          {/* ── Colonne gauche — 3 zones ── */}
          <div className="flex flex-col gap-5">

            {/* Plan du jour — carte partagée */}
            <PlanDuJourCard />


          </div>

          {/* ── Colonne droite ── */}
          <div className="flex flex-col gap-5">

            {/* Agenda du jour */}
            <Card className="p-0 overflow-hidden">
              <div className="flex h-14 items-center justify-between px-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <CalendarDays className="size-4 stroke-[1.5] text-muted-foreground" />
                  <span className="text-sm font-bold text-foreground">Agenda du jour</span>
                </div>
                <Link href="/agenda" className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">Voir tout →</Link>
              </div>
              <div className="divide-y divide-border">
                {agenda.map((item) => (
                  <div key={item.time} className="flex h-[60px] items-center gap-3 px-4">
                    <span className="w-12 shrink-0 text-sm font-bold text-foreground tabular-nums">{item.time}</span>
                    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold', item.stageColor)}>{item.stage}</span>
                    <span className="text-sm text-foreground">{item.name}</span>
                  </div>
                ))}
              </div>
            </Card>

          </div>
        </div>
      </div>
    </>
  )
}
