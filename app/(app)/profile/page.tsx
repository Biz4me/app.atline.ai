'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Flame,
  Trophy,
  Users,
  Crown,
  ChevronRight,
  Sparkles,
  Bell,
  Shield,
  CircleHelp,
  LogOut,
  Settings,
  ContactRound,
  Mic,
  CalendarPlus,
  CreditCard,
  Wrench,
} from 'lucide-react'
import { TopBar } from '@/components/top-bar'
import { Card } from '@/components/card'
import { DiscAvatar } from '@/components/disc-avatar'
import { businesses, networkStats, euro } from '@/lib/data'
import { useBusiness } from '@/components/business-provider'
import { toast } from 'sonner'

const desktopStats = [
  { icon: ContactRound, value: '14', label: 'Contacts' },
  { icon: Mic, value: '8', label: 'Simulations' },
  { icon: CalendarPlus, value: '5', label: 'RDV' },
]

export default function ProfilePage() {
  const { current: activeBusiness } = useBusiness()
  const [moduleDone, setModuleDone] = useState<boolean[]>(Array(11).fill(false))
  const [me, setMe] = useState<{ firstName: string; lastName: string; plan: string; level: number } | null>(null)

  useEffect(() => {
    fetch('/api/me').then(r => r.json()).then(data => {
      if (data?.firstName) setMe(data)
    }).catch(() => {})
  }, [])

  const firstName = me?.firstName ?? '...'
  const lastName = me?.lastName ?? ''
  const planLabel = me?.plan === 'LEADER' ? 'Leader' : me?.plan === 'PRO' ? 'Pro' : me?.plan === 'DISTRIBUTEUR' ? 'Distributeur' : '...'
  const userLevel = me?.level ?? 1

  useEffect(() => {
    fetch('/api/formation/modules').then(r => r.json()).then((course) => {
      if (!course?.modules) return
      const done = Array(11).fill(false)
      course.modules.forEach((m: { position: number; progress: { status: string }[] }) => {
        if (m.position < 11) done[m.position] = m.progress?.[0]?.status === 'DONE'
      })
      setModuleDone(done)
    }).catch(() => {})
  }, [])

  return (
    <>
      {/* ── MOBILE ONLY ── */}
      <div className="lg:hidden">
        <div className="space-y-5 px-4 pb-6 pt-4">
          {/* Header row */}
          <div className="flex items-center justify-end -mt-1 -mb-1">
            <Link href="/settings" className="flex size-9 items-center justify-center rounded-full text-muted-foreground active:bg-muted transition-colors">
              <Settings className="size-5 stroke-[1.5]" />
            </Link>
          </div>

          {/* Identity */}
          <section className="flex items-center gap-4">
            <DiscAvatar firstName={firstName} lastName={lastName} disc="I" size="xl" />
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-semibold leading-tight">
                {firstName} {lastName}
              </h1>
              <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                <Crown className="size-3.5" />
                Plan Pro
              </div>
            </div>
          </section>

          {/* Gamification */}
          <section className="grid grid-cols-3 gap-3">
            <Card className="flex flex-col items-center gap-1 p-3 text-center">
              <Flame className="size-5 text-primary" />
              <span className="font-display text-xl font-semibold">{currentUser.streak}</span>
              <span className="text-xs text-muted-foreground">jours de série</span>
            </Card>
            <Card className="flex flex-col items-center gap-1 p-3 text-center">
              <Trophy className="size-5 text-gold" />
              <span className="font-display text-xl font-semibold">Niv. {userLevel}</span>
              <span className="text-xs text-muted-foreground">niveau</span>
            </Card>
            <Card className="flex flex-col items-center gap-1 p-3 text-center">
              <Users className="size-5 text-info" />
              <span className="font-display text-xl font-semibold">{currentUser.directReferrals}</span>
              <span className="text-xs text-muted-foreground">filleuls</span>
            </Card>
          </section>

          {/* Commission highlight */}
          <Card className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Commission du mois</p>
              <p className="font-display text-2xl font-semibold text-gold">{euro(networkStats.monthCommission)}</p>
            </div>
            <Link
              href="/network"
              className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-2 text-xs font-semibold"
            >
              Mon réseau
              <ChevronRight className="size-3.5" />
            </Link>
          </Card>

          {/* Businesses */}
          <Card className="p-0 overflow-hidden">
            <div className="px-4 py-3.5 border-b border-border">
              <p className="text-sm font-semibold text-foreground">Mes activités</p>
            </div>
            <div className="flex flex-wrap gap-2 px-4 py-3.5">
              {businesses.map((b) => (
                <div key={b.id} className="flex items-center gap-2.5 rounded-2xl border border-border bg-background px-3 py-2.5">
                  <span
                    className="grid size-7 shrink-0 place-items-center rounded-lg text-xs font-bold text-white"
                    style={{ backgroundColor: b.color }}
                  >
                    {b.initials}
                  </span>
                  <p className="text-sm font-semibold text-foreground">{b.name}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* ARIA training counter */}
          <Card className="p-0 overflow-hidden">
              <div className="px-4 py-3.5 border-b border-border flex items-center gap-2.5">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#14B8A6]/10">
                  <Mic className="size-4 text-[#14B8A6]" />
                </span>
                <p className="text-sm font-semibold text-foreground">Entraînement ARIA</p>
              </div>
              <div className="grid grid-cols-3 gap-2 px-4 py-3.5">
                <div className="flex flex-col items-center gap-0.5 rounded-xl bg-muted/50 px-2 py-2.5">
                  <span className="text-lg font-bold text-foreground">8</span>
                  <span className="text-xs text-muted-foreground text-center">sessions</span>
                </div>
                <div className="flex flex-col items-center gap-0.5 rounded-xl bg-muted/50 px-2 py-2.5">
                  <span className="text-lg font-bold text-[#14B8A6]">82</span>
                  <span className="text-xs text-muted-foreground text-center">score moyen</span>
                </div>
                <div className="flex flex-col items-center gap-0.5 rounded-xl bg-muted/50 px-2 py-2.5">
                  <span className="text-lg font-bold text-foreground">3</span>
                  <span className="text-xs text-muted-foreground text-center">cette semaine</span>
                </div>
              </div>
          </Card>


          {/* Badges */}
          <Card className="p-0 overflow-hidden">
            <div className="px-4 py-3.5 border-b border-border flex items-center gap-2.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10">
                <Trophy className="size-4 text-primary" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">Badges Formation</p>
                <p className="text-xs text-muted-foreground">{moduleDone.filter(Boolean).length} / 11 obtenus</p>
              </div>
            </div>
            <div className="grid grid-cols-11 gap-1.5 px-4 py-3.5">
              {moduleDone.map((earned, i) => (
                <div
                  key={i}
                  className={`flex flex-col items-center gap-1 rounded-xl py-2 ${earned ? 'bg-primary/10' : 'bg-muted/50'}`}
                >
                  <Trophy className={`size-4 ${earned ? 'text-primary' : 'text-muted-foreground/30'}`} />
                  <span className={`text-[10px] font-bold ${earned ? 'text-primary' : 'text-muted-foreground/40'}`}>{i + 1}</span>
                </div>
              ))}
            </div>
          </Card>



        </div>
      </div>

      {/* ── DESKTOP ONLY ── */}
      <div className="hidden lg:block">
        <TopBar />
        <div className="flex flex-col gap-6 px-8 pt-8 pb-8 max-w-2xl mx-auto">
          <h1 className="font-display text-[32px] font-extrabold leading-tight tracking-[-0.025em] text-foreground">
            Moi
          </h1>

          {/* Mon activité */}
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-primary">Mon activité</p>
            <div className="grid grid-cols-3 gap-2.5">
              {desktopStats.map(({ icon: Icon, value, label }) => (
                <div key={label} className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-surface px-3 py-4 text-center shadow-card">
                  <Icon className="size-4 stroke-[1.5] text-muted-foreground" />
                  <span className="font-display text-xl font-extrabold tabular-nums text-foreground">{value}</span>
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Compte */}
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-primary">Compte</p>

            <button
              type="button"
              onClick={() => toast.info('Mon profil — bientôt')}
              className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface p-4 text-left shadow-card transition-colors active:bg-muted"
            >
              <DiscAvatar firstName={firstName} lastName={lastName} disc="I" size="md" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-lg text-foreground">
                  {firstName} {lastName}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                    <Crown className="size-3" />
                    Pro
                  </span>
                  <span className="text-xs text-muted-foreground">Voir mon profil</span>
                </div>
              </div>
              <ChevronRight className="size-5 shrink-0 stroke-[1.5] text-muted-foreground" />
            </button>

            <div className="mt-2.5 overflow-hidden rounded-2xl border border-border bg-surface shadow-card divide-y divide-border">
              <Link href="/abonnement" className="flex items-center gap-3.5 px-4 py-3.5 transition-colors active:bg-muted">
                <CreditCard className="size-5 shrink-0 stroke-[1.5] text-amber-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">Abonnement</p>
                  <p className="text-xs text-muted-foreground">Pro · renouvellement le 3 juil.</p>
                </div>
                <ChevronRight className="size-4 shrink-0 stroke-[1.5] text-muted-foreground" />
              </Link>
              <Link href="/settings" className="flex items-center gap-3.5 px-4 py-3.5 transition-colors active:bg-muted">
                <Settings className="size-5 shrink-0 stroke-[1.5] text-muted-foreground" />
                <span className="flex-1 text-sm font-bold text-foreground">Réglages</span>
                <ChevronRight className="size-4 shrink-0 stroke-[1.5] text-muted-foreground" />
              </Link>
              <button
                type="button"
                onClick={() => toast.error('Déconnexion')}
                className="flex w-full items-center gap-3.5 px-4 py-3.5 transition-colors active:bg-muted"
              >
                <LogOut className="size-5 shrink-0 stroke-[1.5] text-destructive" />
                <span className="text-sm font-bold text-destructive">Déconnexion</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
