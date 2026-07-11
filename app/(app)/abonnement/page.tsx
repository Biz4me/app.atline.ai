'use client'

import { AppHeader } from '@/components/app-header'
import { Card, SectionTitle } from '@/components/card'
import { Check, Crown, ChevronRight, Calendar, CreditCard } from 'lucide-react'
import { euro } from '@/lib/data'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const plans = [
  {
    id: 'starter',
    label: 'Starter',
    price: 0,
    desc: 'Pour découvrir la plateforme',
    color: 'bg-muted',
    features: [
      'CRM jusqu\'à 20 contacts',
      'Nova (3 posts / mois)',
      'Réseau N1 uniquement',
      'Formation de base',
    ],
    locked: ['Aria simulation', 'Atlas IA coaching', 'Réseau N2+', 'Bot WhatsApp'],
  },
  {
    id: 'pro',
    label: 'Pro',
    price: 49,
    desc: "L'outil complet pour performer",
    color: 'bg-primary',
    current: true,
    features: [
      'CRM illimité',
      'Nova illimité + scheduling',
      'Réseau N1 + N2',
      'Formation complète',
      'Aria simulation',
      'Atlas IA coaching',
      'Boîte à outils complète',
    ],
    locked: ['Bot WhatsApp/Telegram', 'Analyse réseau avancée'],
  },
  {
    id: 'leader',
    label: 'Leader',
    price: 99,
    desc: "Pour les bâtisseurs d'équipe",
    color: 'bg-[#F4B342]',
    features: [
      'Tout le plan Pro',
      'Bot WhatsApp/Telegram',
      'Analyse réseau avancée',
      'Rapports automatiques',
      'Support prioritaire',
      'Accès bêta nouvelles fonctions',
    ],
    locked: [],
  },
]

const invoices = [
  { id: 'i1', date: '1 juin 2026', amount: 49, status: 'Payé' },
  { id: 'i2', date: '1 mai 2026', amount: 49, status: 'Payé' },
  { id: 'i3', date: '1 avr 2026', amount: 49, status: 'Payé' },
]

function AbonnementContent() {
  return (
    <div className="flex flex-col gap-5 pb-10">
      {/* Plan actuel */}
      <Card accent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Crown className="size-4 text-primary" />
              <p className="text-lg lg:text-sm font-bold text-foreground">Plan Pro — Actif</p>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">Prochain renouvellement le 1 juillet 2026</p>
          </div>
          <span className="money text-lg">{euro(49)}</span>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Calendar className="size-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Mensuel · Visa •••• 4242</span>
        </div>
      </Card>

      {/* Plans */}
      <section>
        <SectionTitle>Changer de plan</SectionTitle>
        <div className="flex flex-col gap-3">
          {plans.map((plan) => (
            <Card key={plan.id} className={cn('overflow-hidden', plan.current && 'ring-2 ring-primary')}>
              {plan.current && (
                <div className="bg-primary px-4 py-1.5">
                  <p className="text-xs font-bold text-primary-foreground">Plan actuel</p>
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={cn('flex size-7 items-center justify-center rounded-lg text-xs font-bold text-white', plan.color)}>
                        {plan.id === 'leader' ? '★' : plan.id === 'pro' ? 'P' : 'S'}
                      </span>
                      <p className="font-display text-lg font-semibold text-foreground">{plan.label}</p>
                    </div>
                    <p className="mt-0.5 text-lg lg:text-sm text-muted-foreground">{plan.desc}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-xl font-bold text-foreground">
                      {plan.price === 0 ? 'Gratuit' : `${plan.price}€`}
                    </p>
                    {plan.price > 0 && <p className="text-xs text-muted-foreground">/mois</p>}
                  </div>
                </div>

                <ul className="mt-3 flex flex-col gap-1.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="size-3.5 shrink-0 text-success stroke-2" />
                      <span className="text-lg lg:text-sm text-foreground">{f}</span>
                    </li>
                  ))}
                  {plan.locked.map((f) => (
                    <li key={f} className="flex items-center gap-2 opacity-40">
                      <div className="size-3.5 shrink-0 rounded-full border border-border" />
                      <span className="text-lg lg:text-sm text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>

                {!plan.current && (
                  <button
                    type="button"
                    onClick={() => toast.info(`Passer au plan ${plan.label}`)}
                    className={cn(
                      'mt-4 w-full rounded-xl py-2.5 text-lg lg:text-sm font-bold transition-colors active:scale-[0.98]',
                      plan.id === 'leader'
                        ? 'bg-[#F4B342] text-white'
                        : plan.id === 'starter'
                        ? 'border border-border bg-surface text-fg-2'
                        : 'bg-primary text-primary-foreground'
                    )}
                  >
                    {plan.price === 0 ? 'Rétrograder' : `Passer à ${plan.label}`}
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Moyen de paiement */}
      <section>
        <SectionTitle>Moyen de paiement</SectionTitle>
        <Card className="p-0">
          <button
            type="button"
            onClick={() => toast.info('Modifier le paiement')}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-muted"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted">
              <CreditCard className="size-5 stroke-[1.5] text-muted-foreground" />
            </span>
            <div className="flex-1">
              <p className="text-lg lg:text-sm font-semibold text-foreground">Visa •••• 4242</p>
              <p className="text-xs text-muted-foreground">Expire 12/28</p>
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </button>
        </Card>
      </section>

      {/* Historique */}
      <section>
        <SectionTitle>Historique des paiements</SectionTitle>
        <Card className="divide-y divide-border p-0">
          {invoices.map((inv) => (
            <div key={inv.id} className="flex items-center px-4 py-3">
              <div className="flex-1">
                <p className="text-lg lg:text-sm font-semibold text-foreground">Plan Pro</p>
                <p className="text-xs text-muted-foreground">{inv.date}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-bold text-success">
                  {inv.status}
                </span>
                <span className="text-lg lg:text-sm font-semibold text-foreground">{euro(inv.amount)}</span>
              </div>
            </div>
          ))}
        </Card>
      </section>

      <button
        type="button"
        onClick={() => toast.info("Résilier l'abonnement")}
        className="py-3 text-lg lg:text-sm font-semibold text-destructive"
      >
        Résilier mon abonnement
      </button>
    </div>
  )
}

export default function AbonnementPage() {
  return (
    <>
      {/* ── MOBILE ONLY ── */}
      <div className="lg:hidden">
        <AppHeader title="Abonnement" back showActions={false} />
        <div className="px-4 pt-4">
          <AbonnementContent />
        </div>
      </div>

      {/* ── DESKTOP ONLY ── */}
      <div className="hidden lg:block">
        <div className="px-8 pt-8 max-w-2xl mx-auto">
          <AbonnementContent />
        </div>
      </div>
    </>
  )
}
