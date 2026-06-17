'use client'

import { AppHeader } from '@/components/app-header'
import { BusinessSwitcher } from '@/components/business-switcher'
import { Card, SectionTitle } from '@/components/card'
import { DiscAvatar } from '@/components/disc-avatar'
import { currentUser, euro, networkStats } from '@/lib/data'
import {
  ArrowRight,
  Sparkles,
  Users,
  CalendarClock,
  Wallet,
  ChevronRight,
  CheckCircle2,
  Circle,
  Mic,
  BookOpen,
  Play,
  TrendingUp,
  MessageCircle,
  UserPlus,
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const dailyTasks = [
  { id: 't1', icon: MessageCircle, label: 'Relancer 3 contacts chauds', cta: '/contacts?filter=chaud', done: true, color: 'text-primary bg-primary/10' },
  { id: 't2', icon: Mic, label: 'Simuler l\'appel avec Thomas B.', cta: '/aria', done: false, color: 'text-violet-600 bg-violet-50' },
  { id: 't3', icon: UserPlus, label: 'Ajouter 2 nouveaux prospects', cta: '/contacts', done: false, color: 'text-success bg-success/10' },
  { id: 't4', icon: Sparkles, label: 'Publier le post Nova prévu ce soir', cta: '/nova', done: false, color: 'text-amber-600 bg-amber-50' },
]

const ariaPhases = [
  { id: 'INVITATION', label: 'Invitation', active: true },
  { id: 'SUIVI', label: 'Suivi', active: false },
  { id: 'DEMARRAGE', label: 'Démarrage', active: false },
  { id: 'COACHING', label: 'Coaching', active: false },
]

const lmsModules = [
  { id: 'm1', title: 'Les bases du MLM', category: 'Fondamentaux', duration: '18 min', progress: 100, color: 'bg-success' },
  { id: 'm2', title: 'Maîtriser la méthode DISC', category: 'Communication', duration: '24 min', progress: 60, color: 'bg-primary' },
  { id: 'm3', title: 'Construire ton script d\'invitation', category: 'Prospection', duration: '32 min', progress: 0, color: 'bg-violet-500' },
]

export default function HomePage() {
  const [tasks, setTasks] = useState(dailyTasks)
  const done = tasks.filter((t) => t.done).length

  const today = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())

  const toggleTask = (id: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
  }

  return (
    <>
      <AppHeader title="Parcours" showNova />

      <div className="flex flex-col gap-6 px-4 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold text-foreground">
              Bonjour {currentUser.firstName}
            </h2>
            <p className="text-sm capitalize text-muted-foreground">{today}</p>
          </div>
          <BusinessSwitcher />
        </div>

        {/* Atlas coach card */}
        <Card accent className="p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground font-display text-sm font-bold">
              A
            </span>
            <span className="eyebrow text-primary">Atlas · ton coach</span>
          </div>
          <p className="text-[15px] font-semibold leading-relaxed text-foreground text-pretty">
            Tu as 3 contacts chauds sans relance depuis 2 jours. On les recontacte
            aujourd'hui pour ne pas perdre l'élan.
          </p>
          <div className="mt-4 flex gap-2">
            <Link
              href="/contacts?filter=chaud"
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-transform active:scale-[0.98]"
            >
              Voir mes contacts chauds
              <ArrowRight className="size-4 stroke-2" />
            </Link>
            <Link
              href="/aria"
              className="inline-flex items-center justify-center rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-bold text-fg-2 transition-colors active:bg-muted"
            >
              M'entraîner
            </Link>
          </div>
        </Card>

        {/* Metrics */}
        <section>
          <div className="grid grid-cols-3 gap-3">
            <Metric icon={Users} value="24" label="Contacts actifs" />
            <Metric icon={CalendarClock} value="4" label="Posts planifiés" />
            <Metric
              icon={Wallet}
              valueNode={<span className="money text-lg">{euro(networkStats.monthCommission)}</span>}
              label="Commissions"
            />
          </div>
        </section>

        {/* Plan du jour */}
        <section>
          <SectionTitle
            action={
              <span className="text-xs font-semibold text-muted-foreground">
                {done}/{tasks.length} faites
              </span>
            }
          >
            Plan du jour
          </SectionTitle>
          <Card className="divide-y divide-border p-0">
            {tasks.map((task) => {
              const Icon = task.icon
              return (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => toggleTask(task.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-muted"
                >
                  {task.done ? (
                    <CheckCircle2 className="size-5 shrink-0 text-success stroke-2" />
                  ) : (
                    <Circle className="size-5 shrink-0 text-border stroke-[1.5]" />
                  )}
                  <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-xl text-xs', task.color)}>
                    <Icon className="size-4 stroke-[1.5]" />
                  </span>
                  <span className={cn('flex-1 text-sm font-medium', task.done && 'text-muted-foreground line-through')}>
                    {task.label}
                  </span>
                  {!task.done && <ChevronRight className="size-4 shrink-0 text-muted-foreground" />}
                </button>
              )
            })}
          </Card>
        </section>

        {/* ARIA — Préparer mon appel */}
        <section>
          <SectionTitle
            action={
              <Link href="/aria" className="text-xs font-semibold text-primary">
                S'entraîner
              </Link>
            }
          >
            Préparer mon appel
          </SectionTitle>
          <Link href="/aria">
            <Card className="p-4 transition-colors active:bg-muted/50">
              <div className="mb-3 flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                  <Mic className="size-5 stroke-[1.5] text-primary" />
                </span>
                <div>
                  <p className="text-sm font-bold text-foreground">Simuler avec ARIA</p>
                  <p className="text-xs text-muted-foreground">Entraîne-toi avant tes vrais appels</p>
                </div>
              </div>
              <div className="flex gap-2">
                {ariaPhases.map((phase) => (
                  <span
                    key={phase.id}
                    className={cn(
                      'rounded-full px-2.5 py-1 text-[11px] font-bold',
                      phase.active
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {phase.label}
                  </span>
                ))}
              </div>
            </Card>
          </Link>
        </section>

        {/* Ma formation */}
        <section>
          <SectionTitle
            action={
              <Link href="/formation" className="text-xs font-semibold text-primary">
                Tout voir
              </Link>
            }
          >
            Ma formation
          </SectionTitle>
          <div className="flex flex-col gap-2">
            {lmsModules.map((mod) => (
              <Link key={mod.id} href={`/formation/${mod.id}`}>
                <Card className="flex items-center gap-3 p-3.5 transition-colors active:bg-muted/50">
                  <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', mod.color)}>
                    <BookOpen className="size-5 stroke-[1.5] text-white" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">{mod.title}</p>
                    <p className="text-xs text-muted-foreground">{mod.category} · {mod.duration}</p>
                    {mod.progress > 0 && (
                      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${mod.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                  {mod.progress === 100 ? (
                    <CheckCircle2 className="size-5 shrink-0 text-success stroke-2" />
                  ) : (
                    <Play className="size-5 shrink-0 text-muted-foreground" />
                  )}
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Network events */}
        <section>
          <SectionTitle
            action={
              <Link href="/network" className="text-xs font-semibold text-primary">
                Voir le réseau
              </Link>
            }
          >
            Mon réseau
          </SectionTitle>
          <Card className="divide-y divide-border">
            <NetworkRow
              first="Sophie"
              last="Lefèvre"
              disc="C"
              text="a parrainé un nouveau filleul"
              time="2 h"
            />
            <NetworkRow
              first="Nadia"
              last="Benali"
              disc="I"
              text="a atteint 18 pts de volume"
              time="5 h"
            />
            <NetworkRow
              first="Karim"
              last="Haddad"
              disc="S"
              text="a validé son plan Pro"
              time="Hier"
            />
          </Card>
        </section>

        {/* Nova next post */}
        <section>
          <SectionTitle
            action={
              <Link href="/nova" className="text-xs font-semibold text-primary">
                Ouvrir Nova
              </Link>
            }
          >
            Prochain post Nova
          </SectionTitle>
          <Link href="/nova">
            <Card className="flex items-center gap-3 p-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <Sparkles className="size-5 stroke-[1.5]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">
                  Ma routine matinale pour rester focus
                </p>
                <p className="text-xs text-muted-foreground">
                  Instagram · Reel · Aujourd'hui 18:00
                </p>
              </div>
              <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
            </Card>
          </Link>
        </section>

        {/* Ma communauté */}
        <section>
          <SectionTitle
            action={
              <Link href="/communaute" className="text-xs font-semibold text-primary">
                Tout voir
              </Link>
            }
          >
            Ma communauté
          </SectionTitle>
          <Link href="/communaute">
            <Card className="p-4 transition-colors active:bg-muted/50">
              <div className="flex items-center gap-3 mb-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-violet-100">
                  <Users className="size-5 stroke-[1.5] text-violet-600" />
                </span>
                <div>
                  <p className="text-sm font-bold text-foreground">Forum Atline</p>
                  <p className="text-xs text-muted-foreground">3 nouvelles discussions</p>
                </div>
                <ChevronRight className="ml-auto size-4 text-muted-foreground" />
              </div>
              <div className="flex gap-2">
                {['Prospection', 'Mindset', 'Wins'].map((tag) => (
                  <span key={tag} className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                    {tag}
                  </span>
                ))}
              </div>
            </Card>
          </Link>
        </section>

        {/* Performance du mois */}
        <section>
          <SectionTitle>Performance du mois</SectionTitle>
          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <TrendingUp className="size-4 text-success stroke-[1.5]" />
              <span className="text-sm font-semibold text-foreground">+34% vs mois dernier</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Nouveaux contacts', value: '12' },
                { label: 'Appels passés', value: '28' },
                { label: 'RDV organisés', value: '6' },
                { label: 'Filleuls recrutés', value: '2' },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl bg-muted/50 p-3">
                  <p className="font-display text-xl font-semibold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </Card>
        </section>
      </div>
    </>
  )
}

function Metric({
  icon: Icon,
  value,
  valueNode,
  label,
}: {
  icon: typeof Users
  value?: string
  valueNode?: React.ReactNode
  label: string
}) {
  return (
    <Card className="flex flex-col gap-1.5 p-3">
      <Icon className="size-4 stroke-[1.5] text-muted-foreground" />
      {valueNode ?? (
        <span className="font-display text-2xl font-semibold leading-none text-foreground">
          {value}
        </span>
      )}
      <span className="text-[11px] leading-tight text-muted-foreground">{label}</span>
    </Card>
  )
}

function NetworkRow({
  first,
  last,
  disc,
  text,
  time,
}: {
  first: string
  last: string
  disc: 'D' | 'I' | 'S' | 'C'
  text: string
  time: string
}) {
  return (
    <div className="flex items-center gap-3 p-3.5">
      <DiscAvatar firstName={first} lastName={last} disc={disc} size="sm" />
      <p className="flex-1 text-sm text-fg-2">
        <span className="font-bold text-foreground">{first}</span> {text}
      </p>
      <span className="text-xs text-muted-foreground">{time}</span>
    </div>
  )
}
