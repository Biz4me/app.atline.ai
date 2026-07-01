'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, Check } from 'lucide-react'

type Color = 'ROUGE' | 'VERT' | 'BLEU' | 'JAUNE'

const PROFILES: Record<Color, { name: string; color: string; result: string }> = {
  ROUGE: {
    name: 'Rouge',
    color: '#EF4444',
    result: "Tu es orienté résultats : direct, rapide, tu aimes décider et avancer. Atlas ira droit au but avec toi — chiffres, objectifs et actions.",
  },
  VERT: {
    name: 'Vert',
    color: '#22C55E',
    result: "Tu es analytique et prudent : tu veux des faits avant d'agir. Atlas te donnera des preuves, du concret, et te laissera le temps d'analyser.",
  },
  BLEU: {
    name: 'Bleu',
    color: '#3B82F6',
    result: "Tu es sociable et enthousiaste : tu carbures au fun, aux gens et à l'aventure. Atlas misera sur l'énergie, la vision et les relations.",
  },
  JAUNE: {
    name: 'Jaune',
    color: '#F4B342',
    result: "Tu es relationnel et bienveillant : tu veux aider, sans pression. Atlas sera chaleureux, à l'écoute, et respectera ton rythme.",
  },
}

const QUESTIONS: { prompt: string; options: { text: string; color: Color }[] }[] = [
  { prompt: "Dans une conversation, tu…", options: [
    { text: "vas droit au but", color: 'ROUGE' },
    { text: "vérifies les faits", color: 'VERT' },
    { text: "mets de l'ambiance", color: 'BLEU' },
    { text: "soignes la relation", color: 'JAUNE' },
  ] },
  { prompt: "Une décision à prendre…", options: [
    { text: "tu décides vite", color: 'ROUGE' },
    { text: "tu analyses longuement", color: 'VERT' },
    { text: "tu suis ton envie", color: 'BLEU' },
    { text: "tu penses aux autres", color: 'JAUNE' },
  ] },
  { prompt: "Ce qui te motive…", options: [
    { text: "gagner, diriger", color: 'ROUGE' },
    { text: "comprendre, avoir raison", color: 'VERT' },
    { text: "t'amuser, rencontrer du monde", color: 'BLEU' },
    { text: "aider les gens", color: 'JAUNE' },
  ] },
  { prompt: "On te décrit comme…", options: [
    { text: "efficace, direct", color: 'ROUGE' },
    { text: "rigoureux, précis", color: 'VERT' },
    { text: "enthousiaste, fun", color: 'BLEU' },
    { text: "attentionné, fiable", color: 'JAUNE' },
  ] },
  { prompt: "Un nouveau projet : tu dis…", options: [
    { text: "« on fonce »", color: 'ROUGE' },
    { text: "« montre-moi les chiffres »", color: 'VERT' },
    { text: "« ça va être génial ! »", color: 'BLEU' },
    { text: "« qui ça touche ? »", color: 'JAUNE' },
  ] },
  { prompt: "Ce qui t'agace le plus…", options: [
    { text: "perdre du temps", color: 'ROUGE' },
    { text: "l'à-peu-près", color: 'VERT' },
    { text: "l'ennui, la routine", color: 'BLEU' },
    { text: "les conflits, la pression", color: 'JAUNE' },
  ] },
  { prompt: "En réunion, tu…", options: [
    { text: "prends les commandes", color: 'ROUGE' },
    { text: "poses les vraies questions", color: 'VERT' },
    { text: "animes, fais rire", color: 'BLEU' },
    { text: "veilles au confort de chacun", color: 'JAUNE' },
  ] },
  { prompt: "Ton rêve plutôt…", options: [
    { text: "réussir en grand", color: 'ROUGE' },
    { text: "maîtriser ton domaine", color: 'VERT' },
    { text: "vivre des aventures", color: 'BLEU' },
    { text: "une vie stable avec les tiens", color: 'JAUNE' },
  ] },
  { prompt: "Quand tu achètes…", options: [
    { text: "vite, le meilleur", color: 'ROUGE' },
    { text: "tu compares en détail", color: 'VERT' },
    { text: "au coup de cœur", color: 'BLEU' },
    { text: "tu demandes l'avis des proches", color: 'JAUNE' },
  ] },
  { prompt: "On compte sur toi pour…", options: [
    { text: "les résultats", color: 'ROUGE' },
    { text: "éviter les erreurs", color: 'VERT' },
    { text: "motiver le groupe", color: 'BLEU' },
    { text: "soutenir les autres", color: 'JAUNE' },
  ] },
  { prompt: "Sous stress, tu deviens…", options: [
    { text: "autoritaire", color: 'ROUGE' },
    { text: "tatillon", color: 'VERT' },
    { text: "dispersé", color: 'BLEU' },
    { text: "effacé", color: 'JAUNE' },
  ] },
  { prompt: "Ta phrase…", options: [
    { text: "« le temps c'est de l'argent »", color: 'ROUGE' },
    { text: "« mesure deux fois, coupe une fois »", color: 'VERT' },
    { text: "« on n'a qu'une vie ! »", color: 'BLEU' },
    { text: "« les gens d'abord »", color: 'JAUNE' },
  ] },
]

function tally(ans: Color[]): Color[] {
  const c: Record<Color, number> = { ROUGE: 0, VERT: 0, BLEU: 0, JAUNE: 0 }
  ans.forEach((a) => { c[a]++ })
  const max = Math.max(...Object.values(c))
  return (Object.keys(c) as Color[]).filter((k) => c[k] === max)
}

export function PersonalityQuiz({ onClose, onResult }: { onClose: () => void; onResult: (color: string) => void }) {
  // Options mélangées une fois (réduit le biais de position)
  const questions = useMemo(
    () => QUESTIONS.map((q) => ({ prompt: q.prompt, options: [...q.options].sort(() => Math.random() - 0.5) })),
    [],
  )
  const [phase, setPhase] = useState<'quiz' | 'tie' | 'result'>('quiz')
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Color[]>([])
  const [tieOptions, setTieOptions] = useState<Color[]>([])
  const [result, setResult] = useState<Color | null>(null)

  function answer(color: Color) {
    if (phase === 'tie') { setResult(color); setPhase('result'); return }
    const next = [...answers, color]
    if (step < questions.length - 1) {
      setAnswers(next)
      setStep(step + 1)
    } else {
      setAnswers(next)
      const winners = tally(next)
      if (winners.length === 1) { setResult(winners[0]); setPhase('result') }
      else { setTieOptions(winners); setPhase('tie') }
    }
  }

  function back() {
    if (phase === 'quiz' && step > 0) {
      setAnswers(answers.slice(0, -1))
      setStep(step - 1)
    } else {
      onClose()
    }
  }

  const progress = phase === 'quiz' ? (step + 1) / questions.length : 1

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-background" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* Header + progression */}
      <div className="shrink-0" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}>
        <div className="flex items-center gap-2 px-2 py-2">
          <button type="button" onClick={back} className="flex size-9 items-center justify-center rounded-full text-muted-foreground active:bg-muted">
            <ChevronLeft className="size-5" />
          </button>
          <p className="text-sm font-semibold text-foreground">Ta couleur de personnalité</p>
        </div>
        {phase !== 'result' && (
          <div className="h-1 w-full bg-muted">
            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        )}
      </div>

      {/* Résultat */}
      {phase === 'result' && result ? (
        <div className="flex flex-1 flex-col items-center px-6 pt-10 text-center">
          <div className="grid size-24 place-items-center rounded-full text-3xl font-extrabold text-white" style={{ backgroundColor: PROFILES[result].color }}>
            <Check className="size-10" />
          </div>
          <h1 className="mt-5 font-display text-[28px] font-extrabold leading-tight" style={{ color: PROFILES[result].color }}>
            Tu es {PROFILES[result].name}
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">{PROFILES[result].result}</p>
          <div className="mt-auto w-full pb-6 pt-8">
            <button
              type="button"
              onClick={() => onResult(result)}
              className="w-full rounded-2xl bg-primary py-3.5 text-base font-bold text-primary-foreground shadow-md transition-transform active:scale-[0.98]"
            >
              C'est tout moi
            </button>
            <button type="button" onClick={() => { setPhase('quiz'); setStep(0); setAnswers([]); setResult(null) }} className="mt-3 w-full py-2 text-sm font-medium text-muted-foreground">
              Refaire le test
            </button>
          </div>
        </div>
      ) : (
        /* Question (ou départage) */
        <div className="flex flex-1 flex-col px-5 pt-8">
          {phase === 'tie' ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">Départage</p>
              <h2 className="mt-2 font-display text-2xl font-semibold leading-tight text-foreground">
                Tu es entre {tieOptions.map((c) => PROFILES[c].name).join(' et ')}. Lequel te ressemble le plus ?
              </h2>
              <div className="mt-6 flex flex-col gap-3">
                {tieOptions.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => answer(c)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-4 text-left shadow-card transition-colors active:bg-muted"
                  >
                    <span className="size-6 shrink-0 rounded-full" style={{ backgroundColor: PROFILES[c].color }} />
                    <span className="text-sm font-semibold text-foreground">{PROFILES[c].name}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Question {step + 1} / {questions.length}</p>
              <h2 className="mt-2 font-display text-2xl font-semibold leading-tight text-foreground">{questions[step].prompt}</h2>
              <div className="mt-6 flex flex-col gap-3">
                {questions[step].options.map((opt) => (
                  <button
                    key={opt.text}
                    type="button"
                    onClick={() => answer(opt.color)}
                    className="w-full rounded-2xl border border-border bg-surface px-4 py-4 text-left text-sm font-medium text-foreground shadow-card transition-colors active:bg-muted active:border-primary"
                  >
                    {opt.text}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
