'use client'

import { useMemo, useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'

type Color = 'ROUGE' | 'VERT' | 'BLEU' | 'JAUNE'

type Profile = { name: string; color: string; archetype: { m: string; f: string; n: string }; caracterise: string; adapte: string }
const PROFILES: Record<Color, Profile> = {
  ROUGE: {
    name: 'Rouge', color: '#EF4444',
    archetype: { m: 'Le Fonceur', f: 'La Fonceuse', n: 'Profil Fonceur' },
    caracterise: 'Direct, rapide, orienté résultats — tu décides vite et tu avances.',
    adapte: 'Atlas ira droit au but : objectifs, chiffres, actions.',
  },
  VERT: {
    name: 'Vert', color: '#22C55E',
    archetype: { m: "L'Analyste", f: "L'Analyste", n: 'Profil Analyste' },
    caracterise: "Rigoureux et prudent — tu veux des faits avant d'agir.",
    adapte: "Atlas te donnera des preuves, du concret, et le temps d'analyser.",
  },
  BLEU: {
    name: 'Bleu', color: '#3B82F6',
    archetype: { m: "L'Enthousiaste", f: "L'Enthousiaste", n: 'Profil Enthousiaste' },
    caracterise: "Sociable et spontané — tu carbures à l'énergie et aux gens.",
    adapte: "Atlas misera sur la vision, l'élan et les relations.",
  },
  JAUNE: {
    name: 'Jaune', color: '#F4B342',
    archetype: { m: 'Le Connecteur', f: 'La Connectrice', n: 'Profil Connecteur' },
    caracterise: 'Relationnel et bienveillant — tu veux aider, sans pression.',
    adapte: "Atlas sera chaleureux, à l'écoute, et respectera ton rythme.",
  },
}

// Résultat exploitable hors quiz (carte profil) — archétype gendré + description statique
export function describePersonality(color: string, gender: string) {
  const p = (PROFILES as Record<string, Profile>)[color]
  if (!p) return null
  const archetype = gender === 'F' ? p.archetype.f : gender === 'N' ? p.archetype.n : p.archetype.m
  return { name: p.name, color: p.color, archetype, text: `${p.caracterise} ${p.adapte}` }
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

export function PersonalityQuiz({ onClose, onResult, firstName = '', gender = '' }: { onClose: () => void; onResult: (color: string) => void; firstName?: string; gender?: string }) {
  const arche = (c: Color) => (gender === 'F' ? PROFILES[c].archetype.f : gender === 'N' ? PROFILES[c].archetype.n : PROFILES[c].archetype.m)
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

  // Résultat « parlé » par Atlas (streaming) — comme l'onboarding ; fallback statique si l'IA ne répond pas
  const [revealText, setRevealText] = useState('')
  useEffect(() => {
    if (phase !== 'result' || !result) return
    const p = PROFILES[result]
    const fallback = `${firstName ? firstName + ', ' : ''}tu es ${p.name} — ${arche(result)}. ${p.caracterise} ${p.adapte}`
    let cancelled = false
    let full = ''
    let shown = 0
    let streamDone = false
    setRevealText('')

    // Machine à écrire : révèle `full` char par char à 22ms (fluidité identique à l'onboarding)
    const tick = () => {
      if (cancelled) return
      if (shown < full.length) { shown++; setRevealText(full.slice(0, shown)); setTimeout(tick, 22) }
      else if (!streamDone) setTimeout(tick, 40) // rattrape le flux
    }
    setTimeout(tick, 200)

    ;(async () => {
      try {
        const r = await fetch('/api/onboarding/color-read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_first_name: firstName, color: result, answer: p.caracterise, gender: gender || 'M' }),
        })
        if (!r.ok || !r.body) throw new Error('no stream')
        const reader = r.body.getReader(); const dec = new TextDecoder(); let buf = ''
        for (;;) {
          const { done, value } = await reader.read(); if (done) break
          buf += dec.decode(value, { stream: true })
          let idx: number
          while ((idx = buf.indexOf('\n\n')) >= 0) {
            const ln = buf.slice(0, idx).trim(); buf = buf.slice(idx + 2)
            if (!ln.startsWith('data:')) continue
            const pl = ln.slice(5).trim(); if (pl === '[DONE]') continue
            try { const j = JSON.parse(pl); if (j.text) full += j.text } catch { /* ignore */ }
          }
        }
        if (!full) full = fallback
      } catch { full = fallback }
      finally { streamDone = true }
    })()

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, result])

  const busyRef = useRef(false)
  function answer(color: Color) {
    if (busyRef.current) return // évite qu'un double-tap saute la question suivante
    busyRef.current = true
    setTimeout(() => { busyRef.current = false }, 280)
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

  const progress = phase === 'quiz' ? (step + 1) / questions.length : 1

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-background animate-slide-in-right" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* Header + progression */}
      <div className="shrink-0" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}>
        <div className="flex items-center justify-between px-2 py-2">
          <p className="pl-2 text-lg font-semibold text-foreground">Ta couleur de personnalité</p>
          <button type="button" onClick={onClose} aria-label="Fermer" className="flex size-9 items-center justify-center rounded-full text-muted-foreground active:bg-muted">
            <X className="size-5" />
          </button>
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
          <div className="size-24 shrink-0 rounded-full" style={{ backgroundColor: PROFILES[result].color }} />
          <h1 className="mt-5 font-display text-[27px] font-extrabold leading-tight" style={{ color: PROFILES[result].color }}>
            Tu es {arche(result)}
          </h1>
          <p className="mt-1 text-base font-semibold text-muted-foreground">Couleur {PROFILES[result].name}</p>
          <p className="mt-3 min-h-[3.5rem] max-w-sm whitespace-pre-wrap text-lg leading-relaxed text-muted-foreground">{revealText || 'Atlas décrypte ta couleur…'}</p>
          <div className="mt-auto w-full pb-6 pt-8">
            <button
              type="button"
              onClick={() => onResult(result)}
              className="w-full rounded-2xl bg-primary py-3.5 text-base font-bold text-primary-foreground shadow-md transition-transform active:scale-[0.98]"
            >
              C'est tout moi
            </button>
            <button type="button" onClick={() => { setPhase('quiz'); setStep(0); setAnswers([]); setResult(null) }} className="mt-3 w-full py-2 text-base font-medium text-muted-foreground">
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
                    className="flex w-full items-start gap-3 rounded-2xl border border-border bg-surface px-4 py-4 text-left shadow-card transition-colors active:bg-muted active:border-primary"
                  >
                    <span className="mt-1 size-6 shrink-0 rounded-full" style={{ backgroundColor: PROFILES[c].color }} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-lg font-semibold text-foreground">{PROFILES[c].name} — {arche(c)}</span>
                      <span className="mt-0.5 block text-base leading-snug text-muted-foreground">{PROFILES[c].caracterise}</span>
                    </span>
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
                    className="w-full rounded-2xl border border-border bg-surface px-4 py-4 text-left text-lg font-medium text-foreground shadow-card transition-colors active:bg-muted active:border-primary"
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
