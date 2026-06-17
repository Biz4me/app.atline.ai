'use client'

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
} from 'lucide-react'
import { Card } from '@/components/card'
import { DiscAvatar } from '@/components/disc-avatar'
import { currentUser, businesses, networkStats, euro } from '@/lib/data'
import { useBusiness } from '@/components/business-provider'

export default function ProfilePage() {
  const { current: activeBusiness } = useBusiness()

  return (
    <div className="space-y-5 px-4 pb-6 pt-4">
      {/* Identity */}
      <section className="flex items-center gap-4">
        <DiscAvatar firstName={currentUser.firstName} lastName={currentUser.lastName} disc="I" size="xl" />
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold leading-tight">
            {currentUser.firstName} {currentUser.lastName}
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
          <span className="text-[11px] text-muted-foreground">jours de série</span>
        </Card>
        <Card className="flex flex-col items-center gap-1 p-3 text-center">
          <Trophy className="size-5 text-money" />
          <span className="font-display text-xl font-semibold">Niv. {currentUser.level}</span>
          <span className="text-[11px] text-muted-foreground">niveau</span>
        </Card>
        <Card className="flex flex-col items-center gap-1 p-3 text-center">
          <Users className="size-5 text-info" />
          <span className="font-display text-xl font-semibold">{currentUser.directReferrals}</span>
          <span className="text-[11px] text-muted-foreground">filleuls</span>
        </Card>
      </section>

      {/* Commission highlight */}
      <Card className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Commission du mois</p>
          <p className="font-display text-2xl font-semibold text-money">{euro(networkStats.monthCommission)}</p>
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
      <section>
        <h2 className="mb-2 px-1 text-sm font-semibold text-muted-foreground">Mes activités</h2>
        <Card className="divide-y divide-border p-0">
          {businesses.map((b) => (
            <div key={b.id} className="flex items-center gap-3 px-4 py-3">
              <span
                className="grid size-9 shrink-0 place-items-center rounded-xl text-sm font-bold text-white"
                style={{ backgroundColor: b.color }}
              >
                {b.initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{b.name}</p>
                {b.isAtline && <p className="text-xs text-muted-foreground">Activité principale</p>}
              </div>
              {b.id === activeBusiness.id && (
                <span className="rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-bold text-success">
                  Active
                </span>
              )}
            </div>
          ))}
          <button className="flex w-full items-center gap-2 px-4 py-3 text-sm font-semibold text-primary">
            <span className="grid size-9 place-items-center rounded-xl border border-dashed border-primary/40">+</span>
            Ajouter une activité
          </button>
        </Card>
      </section>

      {/* Quick access to AI */}
      <Link href="/aria" className="block">
        <Card className="flex items-center gap-3 p-4">
          <span className="grid size-10 place-items-center rounded-full bg-primary/10">
            <Sparkles className="size-5 text-primary" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold">Entraînement ARIA</p>
            <p className="text-xs text-muted-foreground">Simule tes conversations de vente</p>
          </div>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Card>
      </Link>

      {/* Settings list */}
      <section>
        <h2 className="mb-2 px-1 text-sm font-semibold text-muted-foreground">Réglages</h2>
        <Card className="divide-y divide-border p-0">
          {[
            { icon: Bell, label: 'Notifications' },
            { icon: Shield, label: 'Confidentialité & sécurité' },
            { icon: Settings, label: 'Préférences de l’app' },
            { icon: CircleHelp, label: 'Aide & support' },
          ].map((row) => (
            <button key={row.label} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
              <row.icon className="size-5 text-muted-foreground" />
              <span className="flex-1 text-sm font-medium">{row.label}</span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </button>
          ))}
        </Card>
      </section>

      <button className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border py-3.5 text-sm font-semibold text-destructive">
        <LogOut className="size-4" />
        Se déconnecter
      </button>

      <div className="flex flex-col items-center gap-2 pt-2 text-center">
        <Image src="/brand/atline-icon.png" alt="Atline" width={28} height={28} className="opacity-40" />
        <p className="text-xs text-muted-foreground">Atline · version 1.0.0</p>
      </div>
    </div>
  )
}
