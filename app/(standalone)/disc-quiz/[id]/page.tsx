'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { contacts } from '@/lib/data'
import { ChevronLeft, Lightbulb, RotateCcw, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

/* ── DISC data ───────────────────────────────────────────────── */
type DiscKey = 'D' | 'I' | 'S' | 'C'

const discProfiles: Record<DiscKey, {
  name: string
  color: string
  bgClass: string
  textClass: string
  desc: string
  tips: string[]
}> = {
  D: {
    name: 'Rouge',
    color: '#DC2626',
    bgClass: 'bg-red-500',
    textClass: 'text-red-500',
    desc: 'Direct, orienté résultats — va droit au but.',
    tips: [
      'Va droit au but, propose des défis concrets.',
      'Montre les résultats et les gains rapides.',
      'Laisse-lui le contrôle et la décision.',
    ],
  },
  I: {
    name: 'Jaune',
    color: '#F59E0B',
    bgClass: 'bg-amber-400',
    textClass: 'text-amber-500',
    desc: 'Sociable, enthousiaste — guidé par l\'émotion.',
    tips: [
      'Sois enthousiaste et partage la vision.',
      'Raconte des success stories inspirantes.',
      'Crée une connexion émotionnelle forte.',
    ],
  },
  S: {
    name: 'Vert',
    color: '#22C55E',
    bgClass: 'bg-green-500',
    textClass: 'text-green-600',
    desc: 'Stable, relationnel — mise sur la confiance.',
    tips: [
      'Prends le temps de créer la confiance.',
      'Sois constant, rassurant et patient.',
      'Implique sa famille ou ses proches.',
    ],
  },
  C: {
    name: 'Bleu',
    color: '#3B82F6',
    bgClass: 'bg-blue-500',
    textClass: 'text-blue-500',
    desc: 'Analytique, prudent — veut des preuves.',
    tips: [
      'Apporte des chiffres, preuves et témoignages.',
      'Laisse-lui le temps d\'analyser.',
      'Anticipe ses questions détaillées.',
    ],
  },
}

/* ── Questions ───────────────────────────────────────────────── */
const questions: {
  label: string
  options: { text: string; disc: DiscKey }[]
}[] = [
  {
    label: 'Quand tu lui parles, il préfère :',
    options: [
      { text: 'Aller droit au but — résultats concrets', disc: 'D' },
      { text: 'Prendre le temps, créer la confiance', disc: 'S' },
      { text: 'Avoir des chiffres et des preuves', disc: 'C' },
      { text: 'Partager l\'enthousiasme, parler de vision', disc: 'I' },
    ],
  },
  {
    label: 'Face à une décision, il :',
    options: [
      { text: 'Décide vite et assume', disc: 'D' },
      { text: 'Consulte les autres avant', disc: 'S' },
      { text: 'Analyse longuement', disc: 'C' },
      { text: 'Se laisse porter par l\'émotion', disc: 'I' },
    ],
  },
  {
    label: 'Ce qui le freine le plus :',
    options: [
      { text: 'La lenteur et le flou', disc: 'D' },
      { text: 'Le conflit et la pression', disc: 'S' },
      { text: 'Le manque d\'info', disc: 'C' },
      { text: 'La routine et l\'ennui', disc: 'I' },
    ],
  },
]

function computeDisc(answers: (DiscKey | null)[]): DiscKey {
  const counts: Record<DiscKey, number> = { D: 0, I: 0, S: 0, C: 0 }
  for (const a of answers) {
    if (a) counts[a]++
  }
  return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]) as DiscKey
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

  const [answers, setAnswers] = useState<(DiscKey | null)[]>([null, null, null])
  const [result, setResult] = useState<DiscKey | null>(null)

  const firstName = contact?.firstName ?? 'Ce contact'
  const initials = contact ? `${contact.firstName[0]}${contact.lastName[0]}` : '?'

  const allAnswered = answers.every((a) => a !== null)

  const handleAnswer = (qIdx: number, disc: DiscKey) => {
    setAnswers((prev) => {
      const next = [...prev]
      next[qIdx] = disc
      return next
    })
  }

  const handleSubmit = () => {
    const disc = computeDisc(answers)
    setResult(disc)
  }

  const handleSave = () => {
    toast.success(`Profil ${discProfiles[result!].name} enregistré pour ${firstName}`)
    router.back()
  }

  /* ── Result screen ── */
  if (result) {
    const profile = discProfiles[result]
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
        className="sticky top-0 z-30 flex items-start gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur"
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
          <h1 className="text-lg font-bold text-foreground">Quel est le profil de {firstName} ?</h1>
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
                const selected = answers[qIdx] === opt.disc
                return (
                  <button
                    key={opt.disc}
                    type="button"
                    onClick={() => handleAnswer(qIdx, opt.disc)}
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
            {allAnswered ? 'Voir son profil →' : 'Réponds aux 3 questions'}
          </button>
        </div>
      </div>
    </div>
  )
}
