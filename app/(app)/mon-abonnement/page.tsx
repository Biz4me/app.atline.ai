'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AppHeader } from '@/components/app-header'
import { PageShell } from '@/components/page-shell'
import { Card } from '@/components/card'
import { Calendar, CreditCard, ChevronRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { planOf } from '@/lib/plans'

type Sub = {
  plan: string
  planBillingCycle: string | null
  planExpiresAt: string | null
  trialEndsAt: string | null
}

function fmtDate(s: string | null): string | null {
  if (!s) return null
  const d = new Date(s)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function Summary() {
  const [sub, setSub] = useState<Sub | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    fetch('/api/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => {
        if (!active) return
        if (u) setSub({ plan: u.plan, planBillingCycle: u.planBillingCycle, planExpiresAt: u.planExpiresAt, trialEndsAt: u.trialEndsAt })
        setLoading(false)
      })
      .catch(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }
  if (!sub) return null

  const p = planOf(sub.plan)
  const cycleYear = sub.planBillingCycle === 'YEARLY'
  const inTrial = !!(sub.trialEndsAt && new Date(sub.trialEndsAt) > new Date())
  const renew = fmtDate(inTrial ? sub.trialEndsAt : sub.planExpiresAt)

  return (
    <div className="flex flex-col gap-5 pb-10">
      {/* Plan actuel */}
      <Card className="overflow-hidden p-0">
        <div className="bg-primary px-4 py-1.5">
          <p className="text-xs font-bold text-primary-foreground">Plan actuel</p>
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <span className={cn('flex size-9 items-center justify-center rounded-xl text-lg lg:text-sm font-bold text-white', p.color)}>{p.initial}</span>
              <div>
                <p className="font-display text-lg font-semibold text-foreground">{p.label}</p>
                <p className="text-xs text-muted-foreground">{p.desc}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-display text-2xl font-bold text-foreground">{p.price === 0 ? 'Gratuit' : `${p.price}€`}</p>
              {p.price > 0 && <p className="text-xs text-muted-foreground">{cycleYear ? '/an' : '/mois'}</p>}
            </div>
          </div>

          {p.price > 0 && (
            <div className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border">
              <div className="flex items-center gap-3 px-3.5 py-3">
                <Calendar className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 text-lg lg:text-sm text-muted-foreground">{inTrial ? "Fin d'essai" : 'Renouvellement'}</span>
                <span className="text-lg lg:text-sm font-medium text-foreground">{renew ?? '—'}</span>
              </div>
              <div className="flex items-center gap-3 px-3.5 py-3">
                <CreditCard className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 text-lg lg:text-sm text-muted-foreground">Facturation</span>
                <span className="text-lg lg:text-sm font-medium text-foreground">{cycleYear ? 'Annuelle' : 'Mensuelle'}</span>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Gérer → page complète */}
      <Link
        href="/abonnement"
        className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3.5 shadow-card transition-colors active:bg-muted"
      >
        <span className="text-lg lg:text-sm font-semibold text-foreground">Gérer mon abonnement</span>
        <ChevronRight className="size-4 text-muted-foreground" />
      </Link>
    </div>
  )
}

export default function MonAbonnementPage() {
  return (
    <>
      {/* ── MOBILE ONLY ── */}
      <div className="lg:hidden">
        <AppHeader title="Mon abonnement" back showActions={false} />
        <div className="px-4 pt-4">
          <Summary />
        </div>
      </div>

      {/* ── DESKTOP ONLY — gabarit lecture ── */}
      <PageShell title="Mon abonnement">
        <Summary />
      </PageShell>
    </>
  )
}
