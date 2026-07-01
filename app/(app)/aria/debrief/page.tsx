'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft, Mic, CheckCircle2, Target } from 'lucide-react'
import { cn } from '@/lib/utils'

const pointsForts = [
  'Accroche directe et percutante dès les premières secondes',
  'Ton naturel et confiant tout au long de l\'appel',
  'Bonne utilisation du silence après l\'invitation',
]

const aTravailler = [
  'Répondre à l\'objection prix sans dévaloriser le produit',
  'Raccrocher plus vite après la confirmation — tu as traîné 20 sec',
]

export default function DebriefPage() {
  const router = useRouter()

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Header */}
      <header
        className="sticky top-0 z-30 flex items-center gap-3 bg-background/90 px-4 py-3 backdrop-blur lg:px-8"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <button
          type="button"
          onClick={() => router.back()}
          className="-ml-1 flex size-9 items-center justify-center rounded-full text-muted-foreground active:bg-muted lg:hidden"
        >
          <ChevronLeft className="size-5 stroke-[1.5]" />
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="hidden lg:flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
        >
          <ChevronLeft className="size-4 stroke-[1.5]" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="truncate text-sm font-bold text-foreground lg:text-lg">Débrief · Phase Invitation</h1>
        </div>
      </header>

      <div className="flex flex-col gap-5 px-4 pt-5 pb-24 lg:px-8 lg:pt-8 lg:max-w-3xl lg:mx-auto lg:pb-32">

        {/* Score */}
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-6">
          <p className="font-display text-7xl font-extrabold text-primary">78</p>
          <div className="w-full overflow-hidden rounded-full bg-muted h-2">
            <div className="h-2 rounded-full bg-primary transition-all" style={{ width: '78%' }} />
          </div>
          <p className="text-sm text-muted-foreground">Score sur 100</p>
        </div>

        {/* Contact row */}
        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-500 text-sm font-bold text-white">
            SL
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">avec Sophie Laurent</p>
            <p className="text-xs text-muted-foreground">à l&apos;instant</p>
          </div>
        </div>

        {/* Feedback Atlas */}
        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="mb-3 flex items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <span className="font-display text-sm font-bold text-primary">A</span>
            </span>
            <p className="text-sm font-bold text-foreground">Feedback Atlas</p>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Bonne accroche dans l&apos;ensemble — tu as rapidement capté l&apos;attention de Sophie.
            Travaille davantage ta gestion des objections sur le prix : reformule en valeur avant de répondre.
            Pense aussi à raccrocher plus vite une fois la confirmation obtenue pour rester dans l&apos;énergie Worre.
          </p>
        </div>

        {/* Points forts */}
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="mb-3 text-xs font-extrabold uppercase tracking-widest text-success">
            Points forts
          </p>
          <div className="flex flex-col gap-2.5">
            {pointsForts.map((point, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 stroke-[1.5] text-success" />
                <p className="text-sm text-foreground leading-snug">{point}</p>
              </div>
            ))}
          </div>
        </div>

        {/* À travailler */}
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="mb-3 text-xs font-extrabold uppercase tracking-widest text-primary">
            À travailler
          </p>
          <div className="flex flex-col gap-2.5">
            {aTravailler.map((point, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <Target className="mt-0.5 size-4 shrink-0 stroke-[1.5] text-primary" />
                <p className="text-sm text-foreground leading-snug">{point}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* CTA fixé en bas */}
      <div className="fixed bottom-0 inset-x-0 border-t border-border bg-background/95 px-4 py-4 backdrop-blur lg:left-60"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto max-w-sm">
          <button
            type="button"
            onClick={() => router.push('/aria')}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground transition-transform active:scale-[0.98]"
          >
            <Mic className="size-4 stroke-2" />
            Rejouer avec Sophie
          </button>
        </div>
      </div>
    </div>
  )
}
