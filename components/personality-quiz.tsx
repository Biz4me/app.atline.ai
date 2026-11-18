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
  /**
   * ── 🔴 LES TROIS COULEURS ÉTAIENT PERMUTÉES (18 novembre 2026) ───────────
   *
   * Atline suit les quatre couleurs de Tom « Big Al » Schreiter, décalquées
   * du DISC : **Rouge** dominance/action, **Jaune** influence/enthousiasme,
   * **Vert** stabilité/harmonie, **Bleu** conformité/analyse.
   *
   * Ce fichier disait : Vert = analytique, Bleu = sociable, Jaune =
   * relationnel. Soit une rotation à trois — seul Rouge tombait juste. Et ce
   * n'était pas une faute isolée : les six fichiers de `.ai` la portaient,
   * tous d'accord entre eux et tous faux. **C'est une erreur cohérente, le
   * genre que rien ne peut révéler de l'intérieur.**
   *
   * ⚠️ C'EST CE QUIZ QUI ATTRIBUE LA COULEUR. Les questions et les réponses,
   * elles, étaient JUSTES — « montre-moi les chiffres » décrit bien un
   * analytique. Seule l'étiquette posée dessus était fausse. 43 contacts en
   * portent une : 21 ont été corrigés en base par
   * `scripts/disc-rotation.ts`, et la correction d'ici est ce qui empêche
   * qu'un nouveau quiz en reclasse de travers.
   *
   * 🧭 LES HEX NE BOUGENT PAS : bleu reste bleu. Ce sont les DESCRIPTIONS qui
   * rejoignent la bonne couleur.
   */
  JAUNE: {
    name: 'Jaune', color: '#F4B342',
    archetype: { m: "L'Enthousiaste", f: "L'Enthousiaste", n: 'Profil Enthousiaste' },
    caracterise: "Sociable et spontané — tu carbures à l'énergie et aux gens.",
    adapte: "Atlas misera sur la vision, l'élan et les relations.",
  },
  VERT: {
    name: 'Vert', color: '#22C55E',
    archetype: { m: 'Le Connecteur', f: 'La Connectrice', n: 'Profil Connecteur' },
    caracterise: 'Relationnel et bienveillant — tu veux aider, sans pression.',
    adapte: "Atlas sera chaleureux, à l'écoute, et respectera ton rythme.",
  },
  BLEU: {
    name: 'Bleu', color: '#3B82F6',
    archetype: { m: "L'Analyste", f: "L'Analyste", n: 'Profil Analyste' },
    caracterise: "Rigoureux et prudent — tu veux des faits avant d'agir.",
    adapte: "Atlas te donnera des preuves, du concret, et le temps d'analyser.",
  },
}

// Résultat exploitable hors quiz (carte profil) — archétype gendré + description statique
export function describePersonality(color: string, gender: string) {
  const p = (PROFILES as Record<string, Profile>)[color]
  if (!p) return null
  const archetype = gender === 'F' ? p.archetype.f : gender === 'N' ? p.archetype.n : p.archetype.m
  return { name: p.name, color: p.color, archetype, text: `${p.caracterise} ${p.adapte}` }
}

// Descriptions 3e personne (pour un contact) — l'IA onboarding est écrite à la 2e personne
const THIRD: Record<Color, string> = {
  ROUGE: 'Direct et orienté résultats. Va droit au but : chiffres, objectifs, décision rapide.',
  JAUNE: "Sociable et énergique. Mise sur la vision, l'élan et les relations.",
  VERT: "Relationnel et sans pression. Reste chaleureux, à l'écoute, respecte son rythme.",
  BLEU: "Rigoureux et factuel. Apporte des preuves et laisse-lui le temps d'analyser.",
}

// Questions d'observation (3e personne) — pour évaluer un contact, pas soi-même
const QUESTIONS_3P: { prompt: string; options: { text: string; color: Color }[] }[] = [
  { prompt: "Quand on lui parle, qu'est-ce qui compte le plus pour lui/elle ?", options: [
    { text: 'Aller au résultat, gagner', color: 'ROUGE' },
    { text: "S'amuser, du contact, du fun", color: 'JAUNE' },
    { text: 'Aider, des relations sincères', color: 'VERT' },
    { text: 'Comprendre, avoir des preuves', color: 'BLEU' },
  ] },
  { prompt: 'Comment prend-il/elle ses décisions ?', options: [
    { text: 'Vite et avec assurance', color: 'ROUGE' },
    { text: "À l'instinct, à l'émotion", color: 'JAUNE' },
    { text: 'Lentement, sans pression', color: 'VERT' },
    { text: 'Après avoir tout analysé', color: 'BLEU' },
  ] },
  { prompt: "Qu'est-ce qui l'agace le plus ?", options: [
    { text: 'Perdre son temps', color: 'ROUGE' },
    { text: "La routine, l'ennui", color: 'JAUNE' },
    { text: 'Le conflit, la pression', color: 'VERT' },
    { text: 'Le manque de détails', color: 'BLEU' },
  ] },
]

const QUESTIONS: { prompt: string; options: { text: string; color: Color }[] }[] = [
  { prompt: "Dans une conversation, tu…", options: [
    { text: "vas droit au but", color: 'ROUGE' },
    { text: "vérifies les faits", color: 'BLEU' },
    { text: "mets de l'ambiance", color: 'JAUNE' },
    { text: "soignes la relation", color: 'VERT' },
  ] },
  { prompt: "Une décision à prendre…", options: [
    { text: "tu décides vite", color: 'ROUGE' },
    { text: "tu analyses longuement", color: 'BLEU' },
    { text: "tu suis ton envie", color: 'JAUNE' },
    { text: "tu penses aux autres", color: 'VERT' },
  ] },
  { prompt: "Ce qui te motive…", options: [
    { text: "gagner, diriger", color: 'ROUGE' },
    { text: "comprendre, avoir raison", color: 'BLEU' },
    { text: "t'amuser, rencontrer du monde", color: 'JAUNE' },
    { text: "aider les gens", color: 'VERT' },
  ] },
  { prompt: "On te décrit comme…", options: [
    { text: "efficace, direct", color: 'ROUGE' },
    { text: "rigoureux, précis", color: 'BLEU' },
    { text: "enthousiaste, fun", color: 'JAUNE' },
    { text: "attentionné, fiable", color: 'VERT' },
  ] },
  { prompt: "Un nouveau projet : tu dis…", options: [
    { text: "« on fonce »", color: 'ROUGE' },
    { text: "« montre-moi les chiffres »", color: 'BLEU' },
    { text: "« ça va être génial ! »", color: 'JAUNE' },
    { text: "« qui ça touche ? »", color: 'VERT' },
  ] },
  { prompt: "Ce qui t'agace le plus…", options: [
    { text: "perdre du temps", color: 'ROUGE' },
    { text: "l'à-peu-près", color: 'BLEU' },
    { text: "l'ennui, la routine", color: 'JAUNE' },
    { text: "les conflits, la pression", color: 'VERT' },
  ] },
  { prompt: "En réunion, tu…", options: [
    { text: "prends les commandes", color: 'ROUGE' },
    { text: "poses les vraies questions", color: 'BLEU' },
    { text: "animes, fais rire", color: 'JAUNE' },
    { text: "veilles au confort de chacun", color: 'VERT' },
  ] },
  { prompt: "Ton rêve plutôt…", options: [
    { text: "réussir en grand", color: 'ROUGE' },
    { text: "maîtriser ton domaine", color: 'BLEU' },
    { text: "vivre des aventures", color: 'JAUNE' },
    { text: "une vie stable avec les tiens", color: 'VERT' },
  ] },
  { prompt: "Quand tu achètes…", options: [
    { text: "vite, le meilleur", color: 'ROUGE' },
    { text: "tu compares en détail", color: 'BLEU' },
    { text: "au coup de cœur", color: 'JAUNE' },
    { text: "tu demandes l'avis des proches", color: 'VERT' },
  ] },
  { prompt: "On compte sur toi pour…", options: [
    { text: "les résultats", color: 'ROUGE' },
    { text: "éviter les erreurs", color: 'BLEU' },
    { text: "motiver le groupe", color: 'JAUNE' },
    { text: "soutenir les autres", color: 'VERT' },
  ] },
  { prompt: "Sous stress, tu deviens…", options: [
    { text: "autoritaire", color: 'ROUGE' },
    { text: "tatillon", color: 'BLEU' },
    { text: "dispersé", color: 'JAUNE' },
    { text: "effacé", color: 'VERT' },
  ] },
  { prompt: "Ta phrase…", options: [
    { text: "« le temps c'est de l'argent »", color: 'ROUGE' },
    { text: "« mesure deux fois, coupe une fois »", color: 'BLEU' },
    { text: "« on n'a qu'une vie ! »", color: 'JAUNE' },
    { text: "« les gens d'abord »", color: 'VERT' },
  ] },
]

function tally(ans: Color[]): Color[] {
  const c: Record<Color, number> = { ROUGE: 0, VERT: 0, BLEU: 0, JAUNE: 0 }
  ans.forEach((a) => { c[a]++ })
  const max = Math.max(...Object.values(c))
  return (Object.keys(c) as Color[]).filter((k) => c[k] === max)
}

export function PersonalityQuiz({ onClose, onResult, firstName = '', gender = '', count, subjectName, inline }: { onClose: () => void; onResult: (color: string) => void; firstName?: string; gender?: string; count?: number; subjectName?: string; inline?: boolean }) {
  const arche = (c: Color) => (gender === 'F' ? PROFILES[c].archetype.f : gender === 'N' ? PROFILES[c].archetype.n : PROFILES[c].archetype.m)
  // Options mélangées une fois (réduit le biais de position) — count limite le nombre de questions (ex. 3 pour un contact)
  const questions = useMemo(
    () => (subjectName ? QUESTIONS_3P : count ? QUESTIONS.slice(0, count) : QUESTIONS).map((q) => ({ prompt: q.prompt, options: [...q.options].sort(() => Math.random() - 0.5) })),
    [count, subjectName],
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
    const fallback = subjectName ? THIRD[result] : `${firstName ? firstName + ', ' : ''}tu es ${p.name} — ${arche(result)}. ${p.caracterise} ${p.adapte}`
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
          body: JSON.stringify({ user_first_name: firstName, color: result, answer: p.caracterise, gender: gender || 'M', subject_name: subjectName || '' }),
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
    <div
      className={inline
        ? 'flex flex-col overflow-hidden rounded-2xl border border-border bg-surface'
        : 'fixed inset-0 z-[80] mx-auto flex max-w-[480px] flex-col bg-background animate-slide-in-right lg:max-w-none'}
      style={inline ? undefined : { paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Header + progression */}
      <div className="shrink-0" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}>
        <div className="flex items-center justify-between px-2 py-2">
          <p className="pl-2 text-lg font-semibold text-foreground">{subjectName ? 'Sa couleur de personnalité' : 'Ta couleur de personnalité'}</p>
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
          <h1 className="mt-5 text-2xl font-extrabold leading-tight" style={{ color: PROFILES[result].color }}>
            {subjectName ? `${subjectName} est ` : 'Tu es '}{arche(result)}
          </h1>
          <p className="mt-1 text-base font-semibold text-muted-foreground">Couleur {PROFILES[result].name}</p>
          <p className="mt-3 min-h-[3.5rem] max-w-sm whitespace-pre-wrap text-lg leading-relaxed text-muted-foreground">{revealText || (subjectName ? 'Atlas décrypte sa couleur…' : 'Atlas décrypte ta couleur…')}</p>
          <div className="mt-auto w-full pb-6 pt-8">
            <button
              type="button"
              onClick={() => onResult(result)}
              className="w-full rounded-2xl bg-primary py-3.5 text-base font-bold text-primary-foreground transition-transform active:scale-[0.98]"
            >
              {subjectName ? 'Valider' : "C'est tout moi"}
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
              <h2 className="mt-2 text-2xl font-semibold leading-tight text-foreground">
                {subjectName
                  ? `${subjectName} est plutôt entre ${tieOptions.map((c) => PROFILES[c].name).join(' et ')}. Lequel lui ressemble le plus ?`
                  : `Tu es entre ${tieOptions.map((c) => PROFILES[c].name).join(' et ')}. Lequel te ressemble le plus ?`}
              </h2>
              <div className="mt-6 flex flex-col gap-3">
                {tieOptions.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => answer(c)}
                    className="flex w-full items-start gap-3 rounded-2xl border border-border bg-surface px-4 py-4 text-left transition-colors active:bg-muted active:border-primary"
                  >
                    <span className="mt-1 size-6 shrink-0 rounded-full" style={{ backgroundColor: PROFILES[c].color }} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-lg font-semibold text-foreground">{PROFILES[c].name} — {arche(c)}</span>
                      <span className="mt-0.5 block text-base leading-snug text-muted-foreground">{subjectName ? THIRD[c].split(' Pour')[0] : PROFILES[c].caracterise}</span>
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Question {step + 1} / {questions.length}</p>
              <h2 className="mt-2 text-2xl font-semibold leading-tight text-foreground">{questions[step].prompt}</h2>
              <div className="mt-6 flex flex-col gap-3">
                {questions[step].options.map((opt) => (
                  <button
                    key={opt.text}
                    type="button"
                    onClick={() => answer(opt.color)}
                    className="w-full rounded-2xl border border-border bg-surface px-4 py-4 text-left text-lg font-medium text-foreground transition-colors active:bg-muted active:border-primary"
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
