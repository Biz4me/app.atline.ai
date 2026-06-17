'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, Mic, Search, X, Volume2 } from 'lucide-react'
import { contacts } from '@/lib/data'
import { cn } from '@/lib/utils'
import type { Contact } from '@/lib/types'

/* ── Types ──────────────────────────────────────────────────── */
type Phase = 'Invitation' | 'Suivi' | 'Démarrage' | 'Coaching'

const phases: Phase[] = ['Invitation', 'Suivi', 'Démarrage', 'Coaching']

/* Per-phase per-personality prospect replies (text mode fallback) */
const priorityContacts = [
  { id: 'c1', firstName: 'Sophie', lastName: 'Laurent', city: 'Lyon', stage: 'chaud' as const },
  { id: 'c5', firstName: 'Karim', lastName: 'Benali', city: 'Marseille', stage: 'chaud' as const },
  { id: 'c2', firstName: 'Marc', lastName: 'Dubois', city: 'Paris', stage: 'prospect' as const },
  { id: 'c3', firstName: 'Thomas', lastName: 'Petit', city: 'Toulouse', stage: 'prospect' as const },
]

const stagePillColors: Record<string, string> = {
  chaud: 'bg-red-100 text-red-600',
  prospect: 'bg-amber-100 text-amber-600',
  qualifie: 'bg-orange-100 text-orange-600',
  client: 'bg-green-100 text-green-700',
  partenaire: 'bg-blue-100 text-blue-700',
  nouveau: 'bg-gray-100 text-gray-600',
}

const stageLabel: Record<string, string> = {
  chaud: 'Chaud',
  prospect: 'Qualifié',
  client: 'Client',
  partenaire: 'Partenaire',
  nouveau: 'Nouveau',
}

/* Simulator call lines */
const callLines: Record<Phase, string[]> = {
  Invitation: [
    "Bonjour ! J'ai vu votre post, ça m'intéresse vraiment.",
    "Concrètement, ça m'apporterait quoi ?",
    "Tu connais beaucoup de personnes dans ce domaine ?",
    "Je peux prendre le temps d'y réfléchir ?",
  ],
  Suivi: [
    "J'ai réfléchi depuis la dernière fois…",
    "Tu peux me garantir quelque chose ?",
    "Ma famille n'est pas sûre de tout ça.",
    "Quelles preuves tu as que ça marche ?",
  ],
  Démarrage: [
    "OK, je veux démarrer. Qu'est-ce que je fais maintenant ?",
    "Je veux voir tous les chiffres d'abord.",
    "Tu seras là pour m'accompagner ?",
    "C'est par où pour commencer ?",
  ],
  Coaching: [
    "Mon équipe n'avance pas assez vite.",
    "Comment je motive mes filleuls découragés ?",
    "Quels sont les leviers clés selon toi ?",
    "Un de mes filleuls pense à arrêter…",
  ],
}

/* ── Setup screen ────────────────────────────────────────────── */
function SetupScreen({
  phase,
  setPhase,
  onStart,
}: {
  phase: Phase
  setPhase: (p: Phase) => void
  onStart: (c: typeof priorityContacts[0]) => void
}) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<typeof priorityContacts[0] | null>(null)

  const filtered = query
    ? priorityContacts.filter((c) =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(query.toLowerCase())
      )
    : priorityContacts

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Header */}
      <header
        className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <button
          type="button"
          onClick={() => router.back()}
          className="-ml-1 flex size-9 items-center justify-center rounded-full text-muted-foreground active:bg-muted"
        >
          <ChevronLeft className="size-5 stroke-[1.5]" />
        </button>
        <h1 className="flex-1 font-display text-lg font-bold text-foreground">Préparer mon appel</h1>
      </header>

      <div className="flex flex-col gap-6 px-4 pt-5 pb-10">
        {/* Card principale */}
        <div className="rounded-2xl border border-border bg-surface p-5">
          {/* Header card */}
          <div className="mb-5 flex items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Mic className="size-5 stroke-[1.5] text-primary" />
            </span>
            <div>
              <p className="text-sm font-bold text-foreground">Simulateur vocal Aria</p>
              <p className="text-xs text-muted-foreground">Entraîne-toi face à un prospect IA</p>
            </div>
          </div>

          {/* Phase */}
          <p className="mb-2.5 text-xs font-bold text-foreground">Phase</p>
          <div className="mb-5 flex flex-wrap gap-2">
            {phases.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPhase(p)}
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors',
                  phase === p
                    ? 'bg-primary/15 text-primary border border-primary/30'
                    : 'border border-border bg-surface text-muted-foreground'
                )}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Contact à simuler */}
          <p className="mb-2.5 text-xs font-bold text-foreground">Contact à simuler</p>

          {selected ? (
            /* Contact sélectionné */
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-border bg-muted/50 p-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {selected.firstName[0]}{selected.lastName[0]}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">{selected.firstName} {selected.lastName}</p>
                <span className={cn('text-[11px] font-bold', stagePillColors[selected.stage])}>
                  {stageLabel[selected.stage]}
                </span>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="text-muted-foreground">
                <X className="size-4" />
              </button>
            </div>
          ) : (
            /* Search */
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground stroke-[1.5]" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un contact..."
                className="w-full rounded-xl border border-border bg-muted py-2.5 pl-9 pr-4 text-sm placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>
          )}

          {/* Bouton simuler */}
          <button
            type="button"
            onClick={() => selected && onStart(selected)}
            disabled={!selected}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold transition-all',
              selected
                ? 'bg-primary text-primary-foreground active:scale-[0.98]'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            )}
          >
            <Mic className="size-4 stroke-2" />
            {selected
              ? `Simuler l'appel avec ${selected.firstName}`
              : 'Sélectionne un contact'}
          </button>
        </div>

        {/* Priorités du jour */}
        {!selected && (
          <div>
            <p className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-primary">
              Tes priorités du jour
            </p>
            <div className="flex flex-col gap-2">
              {filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelected(c)}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3.5 text-left transition-colors active:bg-muted"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {c.firstName[0]}{c.lastName[0]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">{c.firstName} {c.lastName}</p>
                    <p className="text-xs text-muted-foreground">{c.city}</p>
                  </div>
                  <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold', stagePillColors[c.stage])}>
                    {stageLabel[c.stage]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Simulator screen (dark) ────────────────────────────────── */
function SimulatorScreen({
  contact,
  phase,
  onBack,
}: {
  contact: typeof priorityContacts[0]
  phase: Phase
  onBack: () => void
}) {
  const [speaking, setSpeaking] = useState(true) // prospect is speaking
  const [holding, setHolding] = useState(false)
  const [lineIndex, setLineIndex] = useState(0)
  const [userSpoke, setUserSpoke] = useState(false)
  const lines = callLines[phase]

  /* Cycle through lines */
  useEffect(() => {
    if (!speaking) return
    const t = setTimeout(() => setSpeaking(false), 2800)
    return () => clearTimeout(t)
  }, [speaking, lineIndex])

  const handleMicPress = () => {
    setHolding(true)
    setUserSpoke(false)
  }

  const handleMicRelease = () => {
    setHolding(false)
    setUserSpoke(true)
    setTimeout(() => {
      const next = (lineIndex + 1) % lines.length
      setLineIndex(next)
      setSpeaking(true)
      setUserSpoke(false)
    }, 600)
  }

  const initials = `${contact.firstName[0]}${contact.lastName[0]}`

  return (
    <div
      className="flex min-h-dvh flex-col items-center bg-[#111111] text-white"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Back */}
      <div
        className="flex w-full items-center px-4 pt-4"
        style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
      >
        <button
          type="button"
          onClick={onBack}
          className="flex size-9 items-center justify-center rounded-full bg-white/10 text-white active:bg-white/20"
        >
          <ChevronLeft className="size-5 stroke-[1.5]" />
        </button>
        <span className="mx-auto text-sm font-semibold text-white/60">Simulation en cours</span>
        <div className="size-9" />
      </div>

      {/* Contact info */}
      <div className="mt-12 flex flex-col items-center gap-4 px-6 text-center">
        {/* Avatar */}
        <div className="relative">
          <div className={cn(
            'flex size-24 items-center justify-center rounded-full text-2xl font-bold text-white transition-all duration-300',
            speaking ? 'bg-primary ring-4 ring-primary/30 scale-105' : 'bg-zinc-600'
          )}>
            {initials}
          </div>
          {speaking && (
            <span className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-primary">
              <Volume2 className="size-3.5 text-white" />
            </span>
          )}
        </div>

        <div>
          <h2 className="font-display text-2xl font-bold text-white">
            {contact.firstName} {contact.lastName}
          </h2>
          <div className="mt-1.5 flex items-center justify-center gap-2">
            <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-bold', stagePillColors[contact.stage])}>
              {stageLabel[contact.stage]}
            </span>
            <span className="text-xs text-white/50">Phase {phase}</span>
          </div>
        </div>

        {/* What prospect says */}
        <div className="mt-4 min-h-[72px] rounded-2xl bg-white/8 px-5 py-4">
          {speaking ? (
            <div className="flex items-center gap-3">
              {/* Audio wave bars */}
              <div className="flex items-center gap-0.5">
                {[3, 5, 8, 5, 7, 4, 6, 3, 5].map((h, i) => (
                  <div
                    key={i}
                    className="w-1 rounded-full bg-primary"
                    style={{
                      height: `${h * 3}px`,
                      animation: `pulse 0.6s ease-in-out ${i * 0.07}s infinite alternate`,
                    }}
                  />
                ))}
              </div>
              <span className="text-sm font-medium text-white/80">
                {contact.firstName} parle…
              </span>
            </div>
          ) : userSpoke ? (
            <p className="text-center text-xs text-white/50">En attente…</p>
          ) : (
            <p className="text-center text-sm text-white/90 leading-relaxed italic">
              « {lines[lineIndex]} »
            </p>
          )}
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Mic button */}
      <div className="flex flex-col items-center gap-3 pb-16">
        <button
          type="button"
          onPointerDown={handleMicPress}
          onPointerUp={handleMicRelease}
          onPointerLeave={handleMicRelease}
          className={cn(
            'flex size-20 items-center justify-center rounded-full transition-all duration-150 select-none',
            holding
              ? 'bg-primary scale-110 shadow-2xl shadow-primary/50 ring-8 ring-primary/20'
              : 'bg-primary shadow-lg shadow-primary/30 active:scale-95'
          )}
        >
          <Mic className={cn('size-8 stroke-[1.5] text-white', holding && 'stroke-2')} />
        </button>
        <p className="text-xs text-white/50">
          {holding ? 'Relâche pour envoyer' : 'Maintiens pour parler'}
        </p>
      </div>

      <style>{`
        @keyframes pulse {
          from { transform: scaleY(0.4); }
          to { transform: scaleY(1); }
        }
      `}</style>
    </div>
  )
}

/* ── Page principale ─────────────────────────────────────────── */
function AriaPageContent() {
  const searchParams = useSearchParams()
  const initialPhase = (searchParams.get('phase') as Phase) ?? 'Invitation'

  const [phase, setPhase] = useState<Phase>(
    phases.includes(initialPhase) ? initialPhase : 'Invitation'
  )
  const [simulatingContact, setSimulatingContact] = useState<typeof priorityContacts[0] | null>(null)

  if (simulatingContact) {
    return (
      <SimulatorScreen
        contact={simulatingContact}
        phase={phase}
        onBack={() => setSimulatingContact(null)}
      />
    )
  }

  return (
    <SetupScreen
      phase={phase}
      setPhase={setPhase}
      onStart={(c) => setSimulatingContact(c)}
    />
  )
}

export default function AriaPage() {
  return (
    <Suspense fallback={null}>
      <AriaPageContent />
    </Suspense>
  )
}
