'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Mic, CheckCircle2, Target, Quote, Loader2, ArrowRight } from 'lucide-react'
import { SubHeader } from '@/components/page-shell'

// Débrief RÉEL : la page attend le transcript (déposé par l'agent vocal en fin d'appel),
// lance l'analyse Sonnet (une seule fois, persistée sur la SimSession), puis l'affiche.

type Debrief = {
  score: number | null
  resume?: string
  points_forts?: { citation: string; pourquoi: string }[]
  axes?: { probleme: string; conseil: string }[]
  script_alternatif?: { moment: string; mieux: string } | null
  prochain_scenario?: string
}

function DebriefContent() {
  const router = useRouter()
  const sessionId = useSearchParams().get('s')
  const [state, setState] = useState<'waiting' | 'analyzing' | 'ready' | 'empty' | 'error'>('waiting')
  const [data, setData] = useState<Debrief | null>(null)
  const [phase, setPhase] = useState('')
  const tries = useRef(0)
  const started = useRef(false)

  useEffect(() => {
    if (!sessionId) { setState('empty'); return }
    if (started.current) return
    started.current = true

    let stop = false
    // 1) On attend le transcript (l'agent le poste à la fin de l'appel, quelques secondes)
    const poll = async () => {
      if (stop) return
      try {
        const r = await fetch(`/api/aria/sessions/${sessionId}`)
        if (!r.ok) { setState('error'); return }
        const s = await r.json()
        setPhase(String(s.phase ?? '').toLowerCase())
        if (s.feedback) { setData({ score: s.score, ...s.feedback }); setState('ready'); return }
        if (s.hasTranscript) {
          // 2) Transcript là → analyse (idempotente côté serveur)
          setState('analyzing')
          const d = await fetch(`/api/aria/sessions/${sessionId}`, { method: 'POST' })
          if (d.ok) { setData(await d.json()); setState('ready') }
          else setState('error')
          return
        }
        tries.current++
        if (tries.current > 15) { setState('empty'); return } // ~30 s sans transcript → session trop courte
        setTimeout(poll, 2000)
      } catch {
        setState('error')
      }
    }
    void poll()
    return () => { stop = true }
  }, [sessionId])

  const phaseLabel = phase ? phase.charAt(0).toUpperCase() + phase.slice(1) : ''

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SubHeader title={`Débrief${phaseLabel ? ` · ${phaseLabel}` : ''}`} onBack={() => router.push('/aria')} />

      <div className="flex flex-col gap-5 px-4 pt-5 pb-28 lg:pt-8 lg:max-w-2xl lg:mx-auto lg:pb-32 w-full">

        {(state === 'waiting' || state === 'analyzing') && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-10 text-center">
            <Loader2 className="size-7 animate-spin text-[#14B8A6]" />
            <p className="text-sm font-semibold text-foreground">
              {state === 'waiting' ? 'Je récupère ta conversation…' : 'Atlas analyse ta simulation…'}
            </p>
            <p className="max-w-xs text-xs text-muted-foreground">
              {state === 'waiting' ? 'Quelques secondes après la fin de l’appel.' : 'Score, points forts et axes de travail arrivent.'}
            </p>
          </div>
        )}

        {state === 'empty' && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-10 text-center">
            <p className="text-sm font-semibold text-foreground">Pas de conversation à analyser</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              La session était trop courte (ou l’appel ne s’est pas lancé). Refais une simulation d’au moins quelques échanges.
            </p>
          </div>
        )}

        {state === 'error' && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-10 text-center">
            <p className="text-sm font-semibold text-foreground">Le débrief n’a pas pu être généré</p>
            <p className="max-w-xs text-xs text-muted-foreground">Réessaie dans un instant — ta session est bien enregistrée.</p>
          </div>
        )}

        {state === 'ready' && data && (
          <>
            {/* Score réel */}
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-6">
              <p className="font-display text-[44px] font-extrabold text-[#14B8A6]">{data.score ?? '—'}</p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-2 rounded-full bg-[#14B8A6] transition-all" style={{ width: `${data.score ?? 0}%` }} />
              </div>
              <p className="text-sm text-muted-foreground">Score sur 100</p>
            </div>

            {/* Bilan Atlas */}
            {data.resume && (
              <div className="rounded-2xl border border-border bg-surface p-4">
                <div className="mb-3 flex items-center gap-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#14B8A6]/10">
                    <span className="font-display text-sm font-bold text-[#14B8A6]">A</span>
                  </span>
                  <p className="text-sm font-bold text-foreground">Le bilan d&apos;Atlas</p>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{data.resume}</p>
              </div>
            )}

            {/* Points forts (avec tes vraies phrases) */}
            {!!data.points_forts?.length && (
              <div className="rounded-2xl border border-border bg-surface p-4">
                <p className="mb-3 text-xs font-extrabold uppercase tracking-widest text-success">Points forts</p>
                <div className="flex flex-col gap-3">
                  {data.points_forts.map((p, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 stroke-[1.5] text-success" />
                      <div className="min-w-0">
                        <p className="text-sm italic text-foreground leading-snug">« {p.citation} »</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{p.pourquoi}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* À travailler */}
            {!!data.axes?.length && (
              <div className="rounded-2xl border border-border bg-surface p-4">
                <p className="mb-3 text-xs font-extrabold uppercase tracking-widest text-[#14B8A6]">À travailler</p>
                <div className="flex flex-col gap-3">
                  {data.axes.map((a, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <Target className="mt-0.5 size-4 shrink-0 stroke-[1.5] text-[#14B8A6]" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground leading-snug">{a.probleme}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{a.conseil}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Le script qu'il fallait */}
            {data.script_alternatif?.mieux && (
              <div className="rounded-2xl border border-border bg-surface p-4">
                <p className="mb-3 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Le moment à rejouer</p>
                <div className="flex items-start gap-2.5">
                  <Quote className="mt-0.5 size-4 shrink-0 stroke-[1.5] text-muted-foreground" />
                  <div className="min-w-0">
                    {data.script_alternatif.moment && (
                      <p className="text-xs text-muted-foreground line-through decoration-muted-foreground/50">{data.script_alternatif.moment}</p>
                    )}
                    <p className="mt-1.5 text-sm font-medium text-foreground leading-snug">« {data.script_alternatif.mieux} »</p>
                  </div>
                </div>
              </div>
            )}

            {/* Prochaine étape */}
            {data.prochain_scenario && (
              <div className="flex items-start gap-2.5 rounded-2xl border border-[#14B8A6]/30 bg-[#14B8A6]/5 p-4">
                <ArrowRight className="mt-0.5 size-4 shrink-0 text-[#14B8A6]" />
                <p className="text-sm text-foreground leading-snug">{data.prochain_scenario}</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* CTA */}
      <div
        className="fixed bottom-0 inset-x-0 border-t border-border bg-background/95 px-4 py-4 backdrop-blur lg:left-60"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto max-w-sm">
          <button
            type="button"
            onClick={() => router.push('/aria')}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#14B8A6] py-3.5 text-sm font-bold text-white transition-transform active:scale-[0.98]"
          >
            <Mic className="size-4 stroke-2" />
            Refaire une simulation
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DebriefPage() {
  return (
    <Suspense fallback={null}>
      <DebriefContent />
    </Suspense>
  )
}
