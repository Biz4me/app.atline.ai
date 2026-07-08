'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft,
  Users,
  UserPlus,
  Sparkles,
  User,
  UsersRound,
  Video,
  CalendarClock,
  Check,
  Lock,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const NOVA = '#8B5CF6'

// Flow campagne complet (8 écrans). Écrans 4-8 = à venir (skeleton branché sur du réel pour 1-3).
const STEPS = ['Objectif', 'Persona', 'Réunion', 'Canaux', 'Profil', 'Contenu', 'Parcours', 'Récap']

type Goal = 'CLIENTS' | 'PARTENAIRES'
type MeetingFormat = 'TETE_A_TETE' | 'GROUPE'

const WEEKDAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

export default function CampagnePage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [campaignId, setCampaignId] = useState<string | null>(null)

  // Écran 1 — Objectif
  const [goal, setGoal] = useState<Goal | null>('PARTENAIRES')

  // Écran 2 — Persona
  const [who, setWho] = useState('')
  const [pain, setPain] = useState('')
  const [desire, setDesire] = useState('')

  // Écran 3 — La réunion
  const [meetingFormat, setMeetingFormat] = useState<MeetingFormat | null>(null)
  const [offerPitch, setOfferPitch] = useState('')
  const [day, setDay] = useState('Mardi')
  const [time, setTime] = useState('19:00')
  const [link, setLink] = useState('')

  async function persist(): Promise<boolean> {
    setSaving(true)
    try {
      if (step === 0) {
        if (!goal) {
          toast.error('Choisis un objectif')
          return false
        }
        if (!campaignId) {
          const res = await fetch('/api/nova/campaigns', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ goal }),
          })
          if (!res.ok) throw new Error()
          const { campaign } = await res.json()
          setCampaignId(campaign.id)
        } else {
          await patch({ goal })
        }
        return true
      }
      if (!campaignId) return true
      if (step === 1) {
        await patch({ audience: { who, pain, desire } })
      } else if (step === 2) {
        if (!meetingFormat) {
          toast.error('Choisis un format de réunion')
          return false
        }
        const meetingConfig = meetingFormat === 'GROUPE' ? { day, time, link } : {}
        await patch({ meetingFormat, offerPitch, meetingConfig })
      }
      return true
    } catch {
      toast.error('Enregistrement impossible, réessaie')
      return false
    } finally {
      setSaving(false)
    }
  }

  async function patch(data: Record<string, unknown>) {
    const res = await fetch(`/api/nova/campaigns/${campaignId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error()
  }

  async function next() {
    if (step <= 2) {
      const ok = await persist()
      if (!ok) return
    }
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1)
    } else {
      toast.success('Campagne enregistrée')
      router.push('/nova')
    }
  }

  function back() {
    if (step === 0) router.back()
    else setStep((s) => s - 1)
  }

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Header + progress */}
      <header
        className="sticky top-0 z-30 bg-background/90 px-4 py-3 backdrop-blur"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={back}
            aria-label="Retour"
            className="-ml-1 flex size-9 items-center justify-center rounded-full text-fg-2 active:bg-muted"
          >
            <ChevronLeft className="size-5" />
          </button>
          <h1 className="font-display text-lg font-semibold">Nouvelle campagne</h1>
          <span className="ml-auto text-xs font-semibold text-muted-foreground">
            {step + 1} / {STEPS.length}
          </span>
        </div>
        <div className="mt-3 flex gap-1.5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className="h-1.5 flex-1 rounded-full transition-colors"
              style={{ background: i <= step ? NOVA : 'var(--border)' }}
            />
          ))}
        </div>
      </header>

      <div className="flex-1 px-4 py-5 pb-32">
        {/* Écran 1 — Objectif */}
        {step === 0 && (
          <Step
            title="Que veux-tu développer ?"
            subtitle="Une campagne = un objectif. Tu pourras en créer une autre plus tard."
          >
            <div className="flex flex-col gap-3">
              <GoalCard
                active={goal === 'PARTENAIRES'}
                onClick={() => setGoal('PARTENAIRES')}
                icon={UserPlus}
                title="Recruter des partenaires"
                desc="Attirer des personnes qui veulent se lancer avec toi."
              />
              <GoalCard
                active={goal === 'CLIENTS'}
                onClick={() => toast('Objectif Clients — bientôt disponible')}
                icon={Users}
                title="Trouver des clients"
                desc="Faire découvrir tes produits et remplir tes réunions."
                soon
              />
            </div>
          </Step>
        )}

        {/* Écran 2 — Persona */}
        {step === 1 && (
          <Step
            title="Qui veux-tu attirer ?"
            subtitle="Plus c'est précis, plus le contenu de Nova touche juste."
          >
            <div className="flex flex-col gap-4">
              <Field
                label="Qui sont ces personnes ?"
                value={who}
                onChange={setWho}
                placeholder="Ex. des mamans actives entre 30 et 45 ans qui cherchent un revenu complémentaire"
              />
              <Field
                label="Quel est leur frein aujourd'hui ?"
                value={pain}
                onChange={setPain}
                placeholder="Ex. elles manquent de temps et n'osent pas se lancer seules"
              />
              <Field
                label="Que veulent-elles atteindre ?"
                value={desire}
                onChange={setDesire}
                placeholder="Ex. gagner en liberté financière tout en gardant leur job"
              />
              <button
                type="button"
                onClick={() => toast('Affinage par Atlas — bientôt disponible')}
                className="flex items-center justify-center gap-2 rounded-xl border border-dashed py-2.5 text-sm font-semibold transition-colors active:bg-muted"
                style={{ borderColor: NOVA, color: NOVA }}
              >
                <Sparkles className="size-4" />
                Affiner avec Atlas
              </button>
            </div>
          </Step>
        )}

        {/* Écran 3 — La réunion */}
        {step === 2 && (
          <Step
            title="Comment se passe la rencontre ?"
            subtitle="C'est le rendez-vous vers lequel Nova conduit chaque prospect."
          >
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-3">
                <FormatCard
                  active={meetingFormat === 'TETE_A_TETE'}
                  onClick={() => setMeetingFormat('TETE_A_TETE')}
                  icon={User}
                  title="En tête-à-tête"
                  desc="Le prospect réserve un créneau ; il choisit appel ou visio."
                />
                <FormatCard
                  active={meetingFormat === 'GROUPE'}
                  onClick={() => setMeetingFormat('GROUPE')}
                  icon={UsersRound}
                  title="En groupe"
                  desc="Une visio récurrente ; les prospects s'inscrivent à la session."
                />
              </div>

              {meetingFormat === 'GROUPE' && (
                <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
                  <p className="eyebrow flex items-center gap-1.5">
                    <CalendarClock className="size-3.5" style={{ color: NOVA }} />
                    Session récurrente
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex flex-col gap-1 text-xs font-semibold text-fg-2">
                      Jour
                      <select
                        value={day}
                        onChange={(e) => setDay(e.target.value)}
                        className="rounded-xl border border-border bg-background px-3 py-2 text-sm font-normal text-foreground outline-none"
                      >
                        {WEEKDAYS.map((d) => (
                          <option key={d}>{d}</option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-semibold text-fg-2">
                      Heure
                      <input
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="rounded-xl border border-border bg-background px-3 py-2 text-sm font-normal text-foreground outline-none"
                      />
                    </label>
                  </div>
                  <label className="flex flex-col gap-1 text-xs font-semibold text-fg-2">
                    Lien de la visio
                    <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
                      <Video className="size-4 shrink-0 text-muted-foreground" />
                      <input
                        type="url"
                        value={link}
                        onChange={(e) => setLink(e.target.value)}
                        placeholder="https://zoom.us/j/…"
                        className="w-full bg-transparent text-sm font-normal text-foreground outline-none placeholder:text-muted-foreground"
                      />
                    </div>
                  </label>
                </div>
              )}

              {meetingFormat && (
                <div>
                  <p className="eyebrow mb-2">Ton invitation à la réunion</p>
                  <textarea
                    value={offerPitch}
                    onChange={(e) => setOfferPitch(e.target.value)}
                    rows={4}
                    placeholder="En une phrase : pourquoi ça vaut le coup de venir ? Ex. « 30 min pour voir comment lancer une activité qui te ressemble, sans quitter ton job. »"
                    className="w-full resize-none rounded-2xl border border-border bg-surface p-4 text-sm outline-none focus:ring-2"
                    style={{ ['--tw-ring-color' as string]: NOVA }}
                  />
                </div>
              )}
            </div>
          </Step>
        )}

        {/* Écrans 4-8 — à venir */}
        {step > 2 && (
          <Step title={STEPS[step]} subtitle="Cet écran arrive bientôt.">
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
              <span
                className="flex size-12 items-center justify-center rounded-full"
                style={{ background: `${NOVA}1a`, color: NOVA }}
              >
                <Sparkles className="size-6" />
              </span>
              <p className="text-sm font-semibold text-foreground">« {STEPS[step]} » en construction</p>
              <p className="max-w-xs text-xs text-muted-foreground">
                Ta campagne est déjà enregistrée. On branche cet écran dans la prochaine étape.
              </p>
            </div>
          </Step>
        )}
      </div>

      {/* Bouton fixe */}
      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 p-4 backdrop-blur lg:left-60"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <button
          type="button"
          onClick={next}
          disabled={saving}
          className="w-full rounded-xl py-3.5 text-sm font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-50"
          style={{ background: NOVA }}
        >
          {saving ? 'Enregistrement…' : step === STEPS.length - 1 ? 'Terminer' : 'Continuer'}
        </button>
      </div>
    </div>
  )
}

function Step({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-2xl font-semibold text-foreground text-balance">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">{subtitle}</p>
      </div>
      {children}
    </div>
  )
}

function GoalCard({
  active,
  onClick,
  icon: Icon,
  title,
  desc,
  soon,
}: {
  active: boolean
  onClick: () => void
  icon: typeof Users
  title: string
  desc: string
  soon?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-2xl border bg-surface p-4 text-left shadow-card transition-colors',
        active ? 'border-transparent' : 'border-border active:bg-muted',
        soon && 'opacity-60',
      )}
      style={active ? { borderColor: NOVA, boxShadow: `0 0 0 1px ${NOVA}` } : undefined}
    >
      <span
        className="flex size-11 shrink-0 items-center justify-center rounded-xl"
        style={{ background: `${NOVA}1a`, color: NOVA }}
      >
        <Icon className="size-5 stroke-[1.5]" />
      </span>
      <span className="flex-1">
        <span className="flex items-center gap-2">
          <span className="text-sm font-bold text-foreground">{title}</span>
          {soon && (
            <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              <Lock className="size-2.5" />
              Bientôt
            </span>
          )}
        </span>
        <span className="block text-xs text-muted-foreground">{desc}</span>
      </span>
      {active && <Check className="size-5" style={{ color: NOVA }} />}
    </button>
  )
}

function FormatCard({
  active,
  onClick,
  icon: Icon,
  title,
  desc,
}: {
  active: boolean
  onClick: () => void
  icon: typeof User
  title: string
  desc: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-2xl border bg-surface p-4 text-left shadow-card transition-colors',
        active ? 'border-transparent' : 'border-border active:bg-muted',
      )}
      style={active ? { borderColor: NOVA, boxShadow: `0 0 0 1px ${NOVA}` } : undefined}
    >
      <span
        className="flex size-11 shrink-0 items-center justify-center rounded-xl"
        style={{ background: `${NOVA}1a`, color: NOVA }}
      >
        <Icon className="size-5 stroke-[1.5]" />
      </span>
      <span className="flex-1">
        <span className="block text-sm font-bold text-foreground">{title}</span>
        <span className="block text-xs text-muted-foreground">{desc}</span>
      </span>
      {active && <Check className="size-5" style={{ color: NOVA }} />}
    </button>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        placeholder={placeholder}
        className="w-full resize-none rounded-2xl border border-border bg-surface p-3 text-sm outline-none focus:ring-2"
        style={{ ['--tw-ring-color' as string]: NOVA }}
      />
    </label>
  )
}
