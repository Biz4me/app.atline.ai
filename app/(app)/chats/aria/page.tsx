'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Mic, TrendingUp, Check, ArrowRight } from 'lucide-react'

// ═══ NAV MESSAGERIE T7 — le fil Aria : le journal d'entraînement ═══
// Aria n'est pas un chat libre : c'est un sparring-partner. Son fil = le carnet
// de tes simulations (score, résumé, axes), la progression par scénario, et le
// bouton qui lance l'entraînement (l'écran d'appel/texte existant sur /aria).

type Sim = {
  id: string; characterId: string; phase: string; difficulty: string
  score: number | null; feedback: string | null; startedAt: string
}
type Debrief = { resume?: string; forces?: unknown; axes?: unknown; prochain_scenario?: string }

const PHASE_LABEL: Record<string, string> = { INVITATION: 'Invitation', SUIVI: 'Suivi', DEMARRAGE: 'Démarrage', COACHING: 'Coaching' }
const DIFF_LABEL: Record<string, string> = { FACILE: 'facile', MOYEN: 'moyen', DIFFICILE: 'difficile', PRO: 'pro' }
const ARIA = '#14B8A6'

const scenarioName = (id: string) => id.replace(/_/g, ' ')
const toLines = (v: unknown): string[] =>
  Array.isArray(v)
    ? v.map((i) => (typeof i === 'string' ? i : (i as { probleme?: string; point?: string; conseil?: string })?.probleme ?? (i as { point?: string })?.point ?? '')).filter(Boolean).slice(0, 3)
    : []

export default function AriaThreadPage() {
  const router = useRouter()
  const [sims, setSims] = useState<Sim[]>([])
  const [loading, setLoading] = useState(true)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/aria/sessions')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => Array.isArray(d) && setSims(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [sims])

  // Progression par scénario rejoué : « objection pyramide : 45 → 78 (3 essais) »
  const byScenario = new Map<string, number[]>()
  for (const s of sims) { if (s.score !== null) { const a = byScenario.get(s.characterId) ?? []; a.push(s.score); byScenario.set(s.characterId, a) } }
  const progress = [...byScenario.entries()].filter(([, sc]) => sc.length >= 2)

  return (
    <div className="mx-auto flex h-dvh w-full max-w-2xl flex-col bg-background">
      {/* En-tête Aria */}
      <div className="flex shrink-0 items-center gap-2.5 border-b border-border bg-background/90 px-3 py-2 backdrop-blur" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}>
        <button type="button" aria-label="Retour" onClick={() => router.push('/chats')} className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground active:bg-muted">
          <ChevronLeft className="size-5 stroke-[1.5]" />
        </button>
        <span className="grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: ARIA }}>A</span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-foreground">Aria</span>
          <span className="block text-xs text-muted-foreground">ton sparring-partner · simulateur terrain</span>
        </span>
      </div>

      {/* Le journal */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-3">
        {loading && <p className="py-6 text-center text-sm text-muted-foreground">Chargement…</p>}
        {!loading && sims.length === 0 && (
          <div className="rounded-2xl bg-surface px-4 py-3 text-sm leading-relaxed text-foreground">
            Aucun entraînement encore. Dix minutes avec moi, personne ne te juge — et tu arrives blindé au vrai rendez-vous. On commence ?
          </div>
        )}
        <div className="flex flex-col gap-3">
          {sims.map((s) => {
            let d: Debrief = {}
            try { d = s.feedback ? JSON.parse(s.feedback) : {} } catch { /* texte brut → résumé */ d = { resume: s.feedback ?? '' } }
            const forces = toLines(d.forces)
            const axes = toLines(d.axes)
            return (
              <div key={s.id} className="overflow-hidden rounded-2xl border border-border bg-surface">
                <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                  <p className="min-w-0 truncate text-sm font-semibold capitalize text-foreground">{scenarioName(s.characterId)}</p>
                  <p className="shrink-0 pl-2 text-[10px] text-muted-foreground">
                    {PHASE_LABEL[s.phase] ?? s.phase} · {DIFF_LABEL[s.difficulty] ?? s.difficulty} · {new Date(s.startedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-2xl font-bold" style={{ color: ARIA }}>{s.score}<span className="text-sm font-semibold text-muted-foreground">/100</span></p>
                  {d.resume && <p className="mt-1.5 text-sm leading-relaxed text-foreground">{d.resume}</p>}
                  {forces.length > 0 && (
                    <div className="mt-2 flex flex-col gap-1">
                      {forces.map((f, i) => <p key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground"><Check className="mt-0.5 size-3 shrink-0" style={{ color: '#22C55E' }} />{f}</p>)}
                    </div>
                  )}
                  {axes.length > 0 && (
                    <div className="mt-1.5 flex flex-col gap-1">
                      {axes.map((a, i) => <p key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground"><ArrowRight className="mt-0.5 size-3 shrink-0" style={{ color: ARIA }} />{a}</p>)}
                    </div>
                  )}
                  {d.prochain_scenario && (
                    <button type="button" onClick={() => router.push('/aria')} className="mt-2.5 rounded-full bg-[#14B8A6]/10 px-3 py-1.5 text-xs font-semibold text-[#14B8A6] active:bg-[#14B8A6]/20">
                      Prochain défi : {d.prochain_scenario} →
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* La progression — ce que le fil raconte en chiffres */}
        {progress.length > 0 && (
          <div className="mt-3 rounded-2xl border border-border bg-surface px-4 py-3">
            <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"><TrendingUp className="size-3.5" style={{ color: ARIA }} /> Ta progression</p>
            {progress.map(([sc, scores]) => (
              <p key={sc} className="text-sm capitalize text-foreground">
                {scenarioName(sc)} : <b style={{ color: ARIA }}>{scores[0]} → {scores[scores.length - 1]}</b>
                <span className="text-xs text-muted-foreground"> ({scores.length} essais)</span>
              </p>
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Le geste : s'entraîner (écran d'appel/texte existant) */}
      <div className="shrink-0 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2">
        <button
          type="button"
          onClick={() => router.push('/aria')}
          className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-base font-semibold text-white transition-transform active:scale-[0.98]"
          style={{ backgroundColor: ARIA }}
        >
          <Mic className="size-5 stroke-[1.5]" /> S'entraîner avec Aria
        </button>
      </div>
    </div>
  )
}
