'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, Mic, Search, X, Phone, PhoneOff, Pause, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Room, RoomEvent, Track } from 'livekit-client'

/* ── Types ──────────────────────────────────────────────────── */
type Phase = 'Invitation' | 'Suivi' | 'Démarrage' | 'Coaching'
type SimState = 'idle' | 'calling' | 'ended'

const phases: Phase[] = ['Invitation', 'Suivi', 'Démarrage', 'Coaching']

// Contact d'entraînement = un VRAI contact du réseau (couleur Big Al incluse).
type SimContact = {
  id: string
  firstName: string
  lastName: string
  city: string
  stage: string
  market: string | null
  personality: string | null // ROUGE | VERT | BLEU | JAUNE (Big Al)
}

// Le choix de l'utilisateur pilote RÉELLEMENT la simulation :
// phase → scénario de la bibliothèque de l'agent vocal + niveau de connaissance.
const PHASE_PARAMS: Record<Phase, { phase: string; scenario: string; knowledge: string }> = {
  'Invitation': { phase: 'invitation', scenario: 'marche_chaud', knowledge: 'JAMAIS_FAIT' },
  'Suivi': { phase: 'suivi', scenario: 'suivi_j3', knowledge: 'A_UN_AVIS' },
  'Démarrage': { phase: 'demarrage', scenario: 'demarrage_filleul', knowledge: 'JAMAIS_FAIT' },
  'Coaching': { phase: 'coaching', scenario: 'filleul_inactif', knowledge: 'JAMAIS_FAIT' },
}

function simParams(contact: SimContact, phase: Phase) {
  const base = PHASE_PARAMS[phase]
  // Invitation en marché froid → le scénario froid (le reste suit la phase)
  const scenario = phase === 'Invitation' && contact.market === 'FROID' ? 'marche_froid' : base.scenario
  return {
    ...base,
    scenario,
    color: contact.personality?.toLowerCase() ?? 'bleu',
    contactId: contact.id,
  }
}

const stagePillColors: Record<string, string> = {
  closing: 'bg-red-100 text-red-600',
  prospect: 'bg-amber-100 text-amber-600',
  client: 'bg-green-100 text-green-700',
  partenaire: 'bg-blue-100 text-blue-700',
  nouveau: 'bg-gray-100 text-gray-600',
}

const stageLabel: Record<string, string> = {
  closing: 'Closing',
  prospect: 'Qualifié',
  client: 'Client',
  partenaire: 'Partenaire',
  nouveau: 'Nouveau',
}

const stageAvatarBg: Record<string, string> = {
  closing: 'bg-red-500',
  prospect: 'bg-amber-500',
  client: 'bg-green-500',
  partenaire: 'bg-blue-500',
  nouveau: 'bg-zinc-500',
}

const worreSteps = [
  { dot: 'bg-red-500', label: 'Être pressé', duration: '5 sec' },
  { dot: 'bg-red-500', label: 'Complimenter', duration: '10 sec' },
  { dot: 'bg-red-500', label: 'Inviter', duration: '15 sec' },
  { dot: 'bg-red-500', label: 'Si je… / ×3 conf.', duration: '30 sec' },
  { dot: 'bg-red-500', label: 'Raccrocher vite', duration: '5 sec' },
]

/* ── Setup screen ────────────────────────────────────────────── */
function SetupScreen({
  phase,
  setPhase,
  contacts,
  onStart,
}: {
  phase: Phase
  setPhase: (p: Phase) => void
  contacts: SimContact[]
  onStart: (c: SimContact) => void
}) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<SimContact | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  // Reco d'Atlas issue du dernier débrief (parcours adaptatif)
  const [lastSim, setLastSim] = useState<{ score: number; scenario: string; reco: string } | null>(null)
  useEffect(() => {
    fetch('/api/aria/sessions/last')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.last?.score != null) setLastSim(d.last) })
      .catch(() => {})
  }, [])

  const filtered = query
    ? contacts.filter((c) =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(query.toLowerCase())
      )
    : contacts

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header
        className="sticky top-0 z-30 flex items-center gap-3 bg-background/90 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur lg:px-6 lg:py-0 lg:h-[68px]"
      >
        <button
          type="button"
          onClick={() => router.back()}
          className="-ml-1 flex size-9 items-center justify-center rounded-full text-muted-foreground active:bg-muted lg:hidden"
        >
          <ChevronLeft className="size-5 stroke-[1.5]" />
        </button>
        <span
          className="hidden lg:flex size-9 shrink-0 items-center justify-center rounded-[11px] text-white shadow-sm"
          style={{ backgroundColor: '#14B8A6' }}
        >
          <Mic className="size-[18px] stroke-[1.5]" />
        </span>
        <h1 className="flex-1 font-display text-lg font-bold text-foreground lg:text-2xl">Aria</h1>
      </header>

      <div className="flex flex-col gap-6 px-4 pt-5 pb-10 lg:px-8 lg:max-w-2xl lg:mx-auto">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Mic className="size-5 stroke-[1.5] text-primary" />
            </span>
            <div>
              <p className="text-sm font-bold text-foreground">Simulateur vocal Aria</p>
              <p className="text-xs text-muted-foreground">Entraîne-toi face à un prospect IA</p>
            </div>
          </div>

          {lastSim && (
            <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-primary/30 bg-primary/5 p-3.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <span className="font-display text-sm font-bold text-primary">A</span>
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground">
                  Dernier entraînement : {lastSim.score}/100 · {lastSim.scenario.replace(/_/g, ' ')}
                </p>
                {lastSim.reco && <p className="mt-0.5 text-xs text-muted-foreground text-pretty">{lastSim.reco}</p>}
              </div>
            </div>
          )}

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

          <p className="mb-2.5 text-xs font-bold text-foreground">Contact à simuler</p>

          {selected ? (
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-border bg-muted/50 p-3">
              <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white', stageAvatarBg[selected.stage])}>
                {selected.firstName[0]}{selected.lastName[0]}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">{selected.firstName} {selected.lastName}</p>
                <span className={cn('text-xs font-bold', stagePillColors[selected.stage])}>
                  {stageLabel[selected.stage]}
                </span>
              </div>
              <button type="button" onClick={() => { setSelected(null); setQuery('') }} className="text-muted-foreground">
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <div className="relative mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground stroke-[1.5]" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setDropdownOpen(true) }}
                  onFocus={() => setDropdownOpen(true)}
                  placeholder="Rechercher un contact..."
                  className="w-full rounded-xl border border-border bg-muted py-2.5 pl-9 pr-4 text-sm placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring/40"
                />
              </div>
              {dropdownOpen && filtered.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border border-border bg-surface shadow-lg overflow-hidden">
                  {filtered.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onMouseDown={() => {
                        setSelected(c)
                        setDropdownOpen(false)
                        setQuery('')
                      }}
                      className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors active:bg-muted hover:bg-muted"
                    >
                      <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white', stageAvatarBg[c.stage])}>
                        {c.firstName[0]}{c.lastName[0]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{c.firstName} {c.lastName}</p>
                        <p className="text-xs text-muted-foreground">{c.city}</p>
                      </div>
                      <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold', stagePillColors[c.stage])}>
                        {stageLabel[c.stage]}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

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
            {selected ? `Simuler l'appel avec ${selected.firstName}` : 'Sélectionne un contact'}
          </button>
        </div>

        {!selected && (
          <div>
            <p className="mb-3 text-xs font-extrabold uppercase tracking-widest text-primary">
              Tes priorités du jour
            </p>
            <div className="flex flex-col gap-2">
              {contacts.slice(0, 6).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelected(c)}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3.5 text-left transition-colors active:bg-muted"
                >
                  <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white', stageAvatarBg[c.stage] ?? 'bg-zinc-500')}>
                    {c.firstName[0]}{c.lastName[0] ?? ''}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">{c.firstName} {c.lastName}</p>
                    <p className="text-xs text-muted-foreground">{c.city}</p>
                  </div>
                  <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold', stagePillColors[c.stage])}>
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
  onDebrief,
}: {
  contact: SimContact
  phase: Phase
  onBack: () => void
  onDebrief: (sessionId: string | null) => void
}) {
  const [simState, setSimState] = useState<SimState>('idle')
  const [seconds, setSeconds] = useState(0)
  const [showEndModal, setShowEndModal] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [paused, setPaused] = useState(false)
  const [micError, setMicError] = useState(false)
  const sessionIdRef = useRef<string | null>(null) // SimSession créée par /api/livekit-token
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const roomRef = useRef<Room | null>(null)

  useEffect(() => {
    if (simState === 'calling') {
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000)
      return () => clearInterval(timerRef.current!)
    }
  }, [simState])

  useEffect(() => {
    return () => { roomRef.current?.disconnect() }
  }, [])

  const startCall = async () => {
    setConnecting(true)
    setMicError(false)
    // Request mic permission immediately while still in user gesture context
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (_) {
      setMicError(true)
      setConnecting(false)
      return
    }
    try {
      // Le choix (contact réel + phase) pilote la simulation : couleur Big Al du contact,
      // scénario selon la phase (et le marché), session persistée (aria-<sessionId>).
      const res = await fetch('/api/livekit-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(simParams(contact, phase)),
      })
      if (!res.ok) throw new Error('token')
      const { token, url, sessionId } = await res.json()
      sessionIdRef.current = sessionId ?? null

      const room = new Room()
      roomRef.current = room

      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === Track.Kind.Audio) {
          const el = track.attach()
          el.setAttribute('playsinline', 'true')
          // Route vers l'oreillette (mode appel) sur Android Chrome
          if (typeof (el as any).setSinkId === 'function') {
            ;(el as any).setSinkId('communications').catch(() => {
              ;(el as any).setSinkId('').catch(() => {})
            })
          }
          el.play().catch(() => {})
          document.body.appendChild(el)
        }
      })

      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach().forEach((el) => el.remove())
      })

      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        setSpeaking(speakers.some((s) => s.isAgent))
      })

      room.on(RoomEvent.Disconnected, () => {
        setPaused(false)
        setSimState('ended')
      })

      await room.connect(url, token)
      await room.localParticipant.setMicrophoneEnabled(true)
      setPaused(false)
      setSimState('calling')
    } catch (e) {
      console.error('LiveKit connect error', e)
    } finally {
      setConnecting(false)
    }
  }

  const togglePause = async () => {
    const room = roomRef.current
    if (!room) return
    const next = !paused
    await room.localParticipant.setMicrophoneEnabled(!next).catch(() => {})
    setPaused(next)
  }

  const endCall = async () => {
    await roomRef.current?.disconnect()
    roomRef.current = null
    onDebrief(sessionIdRef.current)
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  const initials = `${contact.firstName[0]}${contact.lastName[0]}`
  const avatarBg = stageAvatarBg[contact.stage]

  return (
    <div
      className="flex min-h-dvh flex-col bg-[#111111] text-white"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Header */}
      <div
        className="flex w-full items-center px-4 pt-4"
        style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
      >
        <button
          type="button"
          onClick={simState === 'calling' ? () => setShowEndModal(true) : onBack}
          className="flex size-9 items-center justify-center rounded-full bg-white/10 text-white active:bg-white/20"
        >
          <ChevronLeft className="size-5 stroke-[1.5]" />
        </button>
        <span className="mx-auto text-sm font-semibold text-white/60">Simulateur</span>
        {simState === 'calling' ? (
          <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1">
            <span className="size-2 animate-pulse rounded-full bg-red-500" />
            <span className="text-xs font-bold text-white/80">REC {formatTime(seconds)}</span>
          </div>
        ) : (
          <div className="size-9" />
        )}
      </div>

      {/* Contact info */}
      <div className="mt-8 flex flex-col items-center gap-3 px-6 text-center">
        <div className="relative">
          <div className={cn(
            'flex size-20 items-center justify-center rounded-full text-2xl font-bold text-white transition-all duration-300',
            avatarBg,
            simState === 'calling' && speaking && 'ring-4 ring-white/20 scale-105'
          )}>
            {initials}
          </div>
          {simState === 'calling' && speaking && (
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-end gap-0.5 h-4">
              {[2, 4, 6, 4, 3, 5, 2].map((h, i) => (
                <div
                  key={i}
                  className="w-1 rounded-full bg-white/70"
                  style={{
                    height: `${h * 3}px`,
                    animation: `waveBar 0.6s ease-in-out ${i * 0.08}s infinite alternate`,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="font-display text-2xl font-bold text-white">
            {contact.firstName} {contact.lastName}
          </h2>
          <div className="mt-1.5 flex items-center justify-center gap-2">
            <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold', stagePillColors[contact.stage])}>
              {stageLabel[contact.stage]}
            </span>
            <span className="text-xs text-white/50">Phase {phase}</span>
          </div>
        </div>

        {simState === 'idle' && (
          <p className="mt-1 text-sm text-white/40">Prêt à lancer l&apos;appel</p>
        )}
        {simState === 'calling' && (
          <p className="mt-1 text-sm text-white/60">
            {speaking ? `${contact.firstName} parle…` : 'En attente de ta réponse…'}
          </p>
        )}
      </div>

      {/* MÉTHODE WORRE card */}
      <div className="mx-4 mt-6 rounded-2xl bg-white/6 border border-white/10 p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-extrabold uppercase tracking-widest text-white/50">
            Méthode Worre
          </p>
          <button type="button" className="flex items-center gap-1 text-xs font-semibold text-primary">
            Voir le détail <ChevronRight className="size-3" />
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {worreSteps.map((step, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <span className={cn('size-2 shrink-0 rounded-full', step.dot)} />
              <span className="flex-1 text-xs font-semibold text-white/80">{step.label}</span>
              <span className="text-xs text-white/40">{step.duration}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1" />

      {/* Mic error */}
      {micError && (
        <div className="mx-6 mb-4 rounded-xl bg-red-500/15 border border-red-500/30 px-4 py-3 text-center">
          <p className="text-sm font-medium text-red-400">Microphone refusé</p>
          <p className="mt-0.5 text-xs text-red-400/70">Autorise le micro dans Paramètres → Applications → Autorisations</p>
        </div>
      )}

      {/* Actions */}
      {simState === 'idle' && (
        <div className="flex flex-col items-center gap-3 pb-16">
          <button
            type="button"
            onClick={startCall}
            disabled={connecting}
            className="flex size-20 items-center justify-center rounded-full bg-[#22C55E] shadow-lg shadow-green-500/30 transition-transform active:scale-95 disabled:opacity-60"
          >
            {connecting
              ? <span className="size-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              : <Phone className="size-8 stroke-[1.5] text-white" />
            }
          </button>
          <p className="text-xs text-white/40">
            {connecting ? "Connexion en cours…" : `Appuie pour appeler ${contact.firstName}`}
          </p>
        </div>
      )}

      {simState === 'calling' && (
        <div className="flex items-center justify-center gap-6 pb-16">
          <button
            type="button"
            onClick={togglePause}
            className="flex size-14 items-center justify-center rounded-full bg-white/15 transition-colors active:bg-white/25"
          >
            {paused
              ? <Phone className="size-6 stroke-[1.5] text-white" />
              : <Pause className="size-6 stroke-[1.5] text-white" />
            }
          </button>
          <button
            type="button"
            onClick={() => setShowEndModal(true)}
            className="flex size-20 items-center justify-center rounded-full bg-red-500 shadow-lg shadow-red-500/30 transition-transform active:scale-95"
          >
            <PhoneOff className="size-8 stroke-[1.5] text-white" />
          </button>
        </div>
      )}

      {/* End modal */}
      {showEndModal && (
        <div className="absolute inset-0 flex items-end justify-center bg-black/60 backdrop-blur-sm" style={{ zIndex: 50 }}>
          <div className="w-full rounded-t-3xl bg-[#1a1a1a] p-6 pb-10">
            <h3 className="text-center text-lg font-bold text-white">Terminer la simulation ?</h3>
            <p className="mt-1 text-center text-sm text-white/50">
              Tu pourras revoir ton débrief complet ensuite.
            </p>

            {/* Score estimé */}
            <div className="mt-5 flex items-center gap-3 rounded-xl bg-white/8 px-4 py-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary font-display text-sm font-bold text-white">
                A
              </span>
              <span className="flex-1 text-sm text-white/70">Score Aria estimé</span>
              <span className="font-display text-lg font-bold text-primary">78 / 100</span>
            </div>

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setShowEndModal(false)}
                className="flex-1 rounded-xl border border-white/20 py-3.5 text-sm font-bold text-white transition-colors active:bg-white/10"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={endCall}
                className="flex-1 rounded-xl bg-red-500 py-3.5 text-sm font-bold text-white transition-transform active:scale-[0.98]"
              >
                Terminer
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes waveBar {
          from { transform: scaleY(0.3); }
          to { transform: scaleY(1); }
        }
      `}</style>
    </div>
  )
}

/* ── Page principale ─────────────────────────────────────────── */
function AriaPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialPhase = (searchParams.get('phase') as Phase) ?? 'Invitation'
  const preselectedId = searchParams.get('contact')

  const [phase, setPhase] = useState<Phase>(
    phases.includes(initialPhase) ? initialPhase : 'Invitation'
  )
  const [contacts, setContacts] = useState<SimContact[]>([])
  const [simulatingContact, setSimulatingContact] = useState<SimContact | null>(null)

  // Vrais contacts du réseau (nom, stade, marché, couleur Big Al) — plus de mock.
  useEffect(() => {
    fetch('/api/contacts')
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: { id: string; name: string; city: string; stage: string; market: string | null; personality: string | null }[]) => {
        const list: SimContact[] = (Array.isArray(rows) ? rows : []).map((c) => {
          const parts = (c.name || '').trim().split(/\s+/)
          return {
            id: c.id,
            firstName: parts[0] || c.name || '?',
            lastName: parts.slice(1).join(' '),
            city: c.city || '',
            stage: c.stage || 'nouveau',
            market: c.market ?? null,
            personality: c.personality ?? null,
          }
        })
        setContacts(list)
        if (preselectedId) {
          const pre = list.find((c) => c.id === preselectedId)
          if (pre) setSimulatingContact(pre)
        }
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (simulatingContact) {
    return (
      <SimulatorScreen
        contact={simulatingContact}
        phase={phase}
        onBack={() => setSimulatingContact(null)}
        onDebrief={(sid) => router.push(sid ? `/aria/debrief?s=${sid}` : '/aria/debrief')}
      />
    )
  }

  return (
    <SetupScreen
      phase={phase}
      setPhase={setPhase}
      contacts={contacts}
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
