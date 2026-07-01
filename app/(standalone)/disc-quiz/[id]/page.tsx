'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { contacts } from '@/lib/data'
import { ChevronLeft, Lightbulb, RotateCcw, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

/* ── Les 4 Couleurs de personnalité (système Tom "Big Al" Schreiter) ──
   ⚠️ Mapping Big Al, PAS le DISC standard :
   Rouge = fonceur · Bleu = festif/social · Jaune = aidant · Vert = analytique */
type ColorKey = 'rouge' | 'bleu' | 'jaune' | 'vert'

const colorProfiles: Record<ColorKey, {
  name: string
  color: string
  bgClass: string
  textClass: string
  desc: string
  tips: string[]
}> = {
  rouge: {
    name: 'Rouge',
    color: '#EF4444',
    bgClass: 'bg-red-500',
    textClass: 'text-red-500',
    desc: 'Fonceur, orienté résultats — veut gagner et diriger.',
    tips: [
      'Va droit au but, parle résultats, revenus, chiffres.',
      "Lance-lui un défi, montre l'opportunité de diriger.",
      'Respecte son temps, laisse-lui la décision.',
    ],
  },
  bleu: {
    name: 'Bleu',
    color: '#3B82F6',
    bgClass: 'bg-blue-500',
    textClass: 'text-blue-500',
    desc: "Festif, sociable — cherche le fun, les gens, l'aventure.",
    tips: [
      "Mets de l'énergie, parle aventure, voyages, récompenses.",
      "Insiste sur l'ambiance et les rencontres.",
      'Reste sur la grande vision, évite les détails.',
    ],
  },
  jaune: {
    name: 'Jaune',
    color: '#F4B342',
    bgClass: 'bg-amber-400',
    textClass: 'text-amber-500',
    desc: 'Aidant, relationnel — veut aider les autres, sans pression.',
    tips: [
      'Sois chaleureux, montre comment ça aide les gens.',
      'Écoute, rassure — zéro pression.',
      'Implique sa famille, laisse-lui le temps.',
    ],
  },
  vert: {
    name: 'Vert',
    color: '#22C55E',
    bgClass: 'bg-green-500',
    textClass: 'text-green-600',
    desc: 'Analytique, prudent — veut des faits et des preuves.',
    tips: [
      'Apporte chiffres, preuves, documentation.',
      'Détaille comment ça marche, anticipe ses questions.',
      "Laisse-lui le temps d'analyser — pas de hype.",
    ],
  },
}

/* ── Questions (observation du contact, 4 options → 4 couleurs) ── */
const questions: {
  label: string
  options: { text: string; color: ColorKey }[]
}[] = [
  {
    label: 'Quand tu lui parles, il préfère :',
    options: [
      { text: 'Aller droit au but — résultats et chiffres', color: 'rouge' },
      { text: "De l'énergie, des histoires, de l'enthousiasme", color: 'bleu' },
      { text: "De la chaleur, qu'on soigne la relation", color: 'jaune' },
      { text: 'Des faits, des preuves, des détails', color: 'vert' },
    ],
  },
  {
    label: 'Face à une décision, il :',
    options: [
      { text: 'Décide vite et assume', color: 'rouge' },
      { text: "Se laisse porter par l'enthousiasme", color: 'bleu' },
      { text: 'Hésite, pense aux autres, déteste être poussé', color: 'jaune' },
      { text: 'Analyse longuement avant de trancher', color: 'vert' },
    ],
  },
  {
    label: 'Ce qui le fait vibrer :',
    options: [
      { text: 'Gagner, diriger, la reconnaissance', color: 'rouge' },
      { text: "S'amuser, rencontrer du monde, l'aventure", color: 'bleu' },
      { text: 'Aider les autres, se sentir utile', color: 'jaune' },
      { text: "Comprendre, être sûr de son choix", color: 'vert' },
    ],
  },
]

function computeColor(answers: (ColorKey | null)[]): ColorKey {
  const counts: Record<ColorKey, number> = { rouge: 0, bleu: 0, jaune: 0, vert: 0 }
  for (const a of answers) {
    if (a) counts[a]++
  }
  return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]) as ColorKey
}

/* ── Page ─────────────────────────────────────────────────────── */
export default function DiscQuizPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const contact = contacts.find((c) => c.id === id)

  const [answers, setAnswers] = useState<(ColorKey | null)[]>([null, null, null])
  const [result, setResult] = useState<ColorKey | null>(null)

  const firstName = contact?.firstName ?? 'Ce contact'
  const initials = contact ? `${contact.firstName[0]}${contact.lastName[0]}` : '?'

  const allAnswered = answers.every((a) => a !== null)

  const handleAnswer = (qIdx: number, color: ColorKey) => {
    setAnswers((prev) => {
      const next = [...prev]
      next[qIdx] = color
      return next
    })
  }

  const handleSubmit = () => {
    setResult(computeColor(answers))
  }

  const handleSave = () => {
    toast.success(`Profil ${colorProfiles[result!].name} enregistré pour ${firstName}`)
    router.back()
  }

  /* ── Result screen ── */
  if (result) {
    const profile = colorProfiles[result]
    return (
      <div className="flex min-h-dvh flex-col bg-background">
        <div className="flex flex-col items-center gap-5 px-4 pt-12 pb-10 flex-1">
          {/* Avatar */}
          <div className={cn('flex size-20 items-center justify-center rounded-full text-2xl font-bold text-white', profile.bgClass)}>
            {initials}
          </div>

          {/* Titre */}
          <div className="text-center">
            <h1 className={cn('font-display text-[32px] font-extrabold leading-tight', profile.textClass)}>
              {firstName} est {profile.name}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">{profile.desc}</p>
          </div>

          {/* Tips */}
          <div className="w-full flex flex-col gap-2.5 mt-2">
            {profile.tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5">
                <Lightbulb className="mt-0.5 size-4 shrink-0 stroke-[1.5] text-muted-foreground" />
                <p className="text-sm text-foreground leading-snug">{tip}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTAs */}
        <div className="sticky bottom-0 flex flex-col items-center gap-3 border-t border-border bg-background px-4 py-4"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          <button
            type="button"
            onClick={handleSave}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground transition-transform active:scale-[0.98]"
          >
            <Check className="size-4 stroke-2" />
            Enregistrer le profil
          </button>
          <button
            type="button"
            onClick={() => { setResult(null); setAnswers([null, null, null]) }}
            className="flex items-center gap-1.5 text-sm text-muted-foreground"
          >
            <RotateCcw className="size-3.5 stroke-[1.5]" />
            Recommencer
          </button>
        </div>
      </div>
    )
  }

  /* ── Quiz screen ── */
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Header */}
      <header
        className="sticky top-0 z-30 flex items-start gap-3 bg-background/90 px-4 py-3 backdrop-blur"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <button
          type="button"
          onClick={() => router.back()}
          className="-ml-1 mt-0.5 flex size-9 items-center justify-center rounded-full text-muted-foreground active:bg-muted"
        >
          <ChevronLeft className="size-5 stroke-[1.5]" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Quelle est la couleur de {firstName} ?</h1>
          <p className="text-xs text-muted-foreground">3 questions · 1 minute</p>
        </div>
      </header>

      {/* Questions */}
      <div className="flex flex-col gap-6 px-4 pt-5 pb-32">
        {questions.map((q, qIdx) => (
          <div key={qIdx}>
            <p className="mb-3 text-sm font-bold text-foreground">{q.label}</p>
            <div className="flex flex-col gap-2">
              {q.options.map((opt) => {
                const selected = answers[qIdx] === opt.color
                return (
                  <button
                    key={opt.color}
                    type="button"
                    onClick={() => handleAnswer(qIdx, opt.color)}
                    className={cn(
                      'flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all',
                      selected
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-surface'
                    )}
                  >
                    <span className={cn(
                      'flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-all',
                      selected ? 'border-primary bg-primary' : 'border-muted-foreground/40'
                    )}>
                      {selected && <Check className="size-3 stroke-[2.5] text-primary-foreground" />}
                    </span>
                    <span className="text-sm text-foreground leading-snug">{opt.text}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* CTA fixé */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 px-4 py-4 backdrop-blur"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto max-w-[480px]">
          <button
            type="button"
            onClick={allAnswered ? handleSubmit : undefined}
            disabled={!allAnswered}
            className={cn(
              'w-full rounded-2xl py-3.5 text-sm font-bold transition-all',
              allAnswered
                ? 'bg-primary text-primary-foreground active:scale-[0.98]'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            )}
          >
            {allAnswered ? 'Voir sa couleur →' : 'Réponds aux 3 questions'}
          </button>
        </div>
      </div>
    </div>
  )
}
