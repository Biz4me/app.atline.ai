'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArrowRight, Users, Sparkles, Network, Target } from 'lucide-react'
import { cn } from '@/lib/utils'

const steps = [
  {
    icon: Target,
    title: 'Ton CRM social, enfin simple',
    desc: 'Capture tes prospects depuis Instagram, LinkedIn et WhatsApp. Suis chaque relation sans rien oublier.',
    accent: 'var(--primary)',
  },
  {
    icon: Sparkles,
    title: 'Nova planifie ton contenu',
    desc: 'Un calendrier intelligent qui équilibre lifestyle, produit et opportunité selon la règle 70/20/10.',
    accent: 'var(--info)',
  },
  {
    icon: Users,
    title: 'Atlas qualifie tes contacts',
    desc: 'Un score de potentiel et un profil DISC pour adapter ton approche à chaque personnalité.',
    accent: 'var(--success)',
  },
  {
    icon: Network,
    title: 'Fais grandir ton réseau',
    desc: 'Visualise ton équipe, suis tes commissions et accompagne tes filleuls vers le succès.',
    accent: 'var(--gold)',
  },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const current = steps[step]
  const isLast = step === steps.length - 1
  const Icon = current.icon

  function next() {
    if (isLast) router.push('/home')
    else setStep((s) => s + 1)
  }

  return (
    <div className="flex min-h-dvh flex-col px-6 pb-8 pt-10">
      <header className="flex items-center justify-between">
        <Image src="/brand/atline-icon.png" alt="Atline" width={36} height={36} className="rounded-lg" />
        {!isLast && (
          <button
            onClick={() => router.push('/home')}
            className="text-sm font-medium text-muted-foreground"
          >
            Passer
          </button>
        )}
      </header>

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <span
          className="mb-8 grid size-24 place-items-center rounded-3xl"
          style={{ backgroundColor: `color-mix(in srgb, ${current.accent} 14%, transparent)` }}
        >
          <Icon className="size-11" style={{ color: current.accent }} />
        </span>
        <h1 className="text-balance font-display text-3xl font-semibold leading-tight">
          {current.title}
        </h1>
        <p className="mt-4 max-w-xs text-pretty text-base leading-relaxed text-muted-foreground">
          {current.desc}
        </p>
      </div>

      <div className="mb-8 flex justify-center gap-2">
        {steps.map((_, i) => (
          <span
            key={i}
            className={cn(
              'h-2 rounded-full transition-all',
              i === step ? 'w-6 bg-primary' : 'w-2 bg-border',
            )}
          />
        ))}
      </div>

      <button
        onClick={next}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-semibold text-primary-foreground"
      >
        {isLast ? 'Commencer' : 'Suivant'}
        <ArrowRight className="size-5" />
      </button>
    </div>
  )
}
