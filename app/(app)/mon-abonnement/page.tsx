'use client'

import { AppHeader } from '@/components/app-header'
import { Card, SectionTitle } from '@/components/card'
import { Check, Crown, ChevronRight, Calendar, CreditCard } from 'lucide-react'
import { euro, contacts, posts } from '@/lib/data'
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
    locked: ['ARIA simulation', 'Atlas IA coaching', 'Réseau N2+', 'Bot WhatsApp'],
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
      'ARIA simulation',
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
    color: 'bg-amber-500',
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
      {/* Plans */}
      <section>
        <SectionTitle>Comparer les abonnements</SectionTitle>
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
                    <p className="mt-0.5 text-xs text-muted-foreground">{plan.desc}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-2xl font-bold text-foreground">
                      {plan.price === 0 ? 'Gratuit' : `${plan.price}€`}
                    </p>
                    {plan.price > 0 && <p className="text-xs text-muted-foreground">/mois</p>}
                  </div>
                </div>

                <ul className="mt-3 flex flex-col gap-1.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="size-3.5 shrink-0 text-success stroke-2" />
                      <span className="text-xs text-foreground">{f}</span>
                    </li>
                  ))}
                  {plan.locked.map((f) => (
                    <li key={f} className="flex items-center gap-2 opacity-40">
                      <div className="size-3.5 shrink-0 rounded-full border border-border" />
                      <span className="text-xs text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>

                {!plan.current && (
                  <button
                    type="button"
                    onClick={() => toast.info(`Passer au plan ${plan.label}`)}
                    className={cn(
                      'mt-4 w-full rounded-2xl py-2.5 text-base font-semibold transition-colors active:scale-[0.98]',
                      plan.id === 'leader'
                        ? 'bg-amber-500 text-white'
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

    </div>
  )
}

export default function AbonnementPage() {
  return (
    <>
      {/* ── MOBILE ONLY ── */}
      <div className="lg:hidden">
        <AppHeader title="Mon abonnement" showActions={false} />
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
