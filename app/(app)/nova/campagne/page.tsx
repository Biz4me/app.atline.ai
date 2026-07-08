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
  Camera,
  Globe,
  Music2,
  Wand2,
  Image as ImageIcon,
  AtSign,
  Link2,
  Grid3x3,
  MessageCircle,
  Filter,
  CalendarCheck,
  Handshake,
  RefreshCw,
  Target,
  Megaphone,
  Radio,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const NOVA = '#8B5CF6'

// Flow campagne complet (8 écrans). Écrans 4-8 = à venir (skeleton branché sur du réel pour 1-3).
const STEPS = ['Objectif', 'Persona', 'Réunion', 'Canaux', 'Profil', 'Contenu', 'Parcours', 'Récap']

type Goal = 'CLIENTS' | 'PARTENAIRES'
type MeetingFormat = 'TETE_A_TETE' | 'GROUPE'
type Platform = 'INSTAGRAM' | 'FACEBOOK'

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

  // Écran 4 — Canaux
  const [channels, setChannels] = useState<Platform[]>(['INSTAGRAM', 'FACEBOOK'])

  // Écran 5 — Optimise ton profil (checklist consultative, non persistée)
  const [checked, setChecked] = useState<Record<string, boolean>>({})

  // Écran 6 — Contenu
  const [contentMode, setContentMode] = useState<'FACE' | 'FACELESS'>('FACELESS')
  const [cadence, setCadence] = useState(5)

  function toggleChannel(p: Platform) {
    setChannels((c) => (c.includes(p) ? c.filter((x) => x !== p) : [...c, p]))
  }

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
      } else if (step === 3) {
        if (channels.length === 0) {
          toast.error('Choisis au moins un réseau')
          return false
        }
        await patch({ channels })
      } else if (step === 5) {
        await patch({ contentMode, cadence })
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
    if (step <= 5) {
      const ok = await persist()
      if (!ok) return
    }
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1)
      return
    }
    // Récap → lancer
    setSaving(true)
    try {
      await patch({ status: 'ACTIVE' })
      toast.success('Campagne lancée')
      router.push('/nova')
    } catch {
      toast.error('Lancement impossible, réessaie')
    } finally {
      setSaving(false)
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

        {/* Écran 4 — Canaux */}
        {step === 3 && (
          <Step
            title="Où veux-tu publier ?"
            subtitle="On démarre sur le duo qui capte le mieux les leads. Tu pourras en ajouter."
          >
            <div className="flex flex-col gap-3">
              <ChannelCard
                active={channels.includes('INSTAGRAM')}
                onClick={() => toggleChannel('INSTAGRAM')}
                icon={Camera}
                title="Instagram"
                desc="Reels et messages privés : le moteur de la capture."
              />
              <ChannelCard
                active={channels.includes('FACEBOOK')}
                onClick={() => toggleChannel('FACEBOOK')}
                icon={Globe}
                title="Facebook"
                desc="Ton réseau proche et les groupes de ta thématique."
              />
              <ChannelCard
                active={false}
                onClick={() => toast('TikTok — bientôt disponible')}
                icon={Music2}
                title="TikTok"
                desc="Portée à froid maximale."
                soon
              />
            </div>
          </Step>
        )}

        {/* Écran 5 — Optimise ton profil */}
        {step === 4 && (
          <Step
            title="Prépare tes profils"
            subtitle="Un visiteur qui clique doit comprendre en 3 secondes. Coche au fur et à mesure."
          >
            <div className="flex flex-col gap-2.5">
              {PROFILE_TIPS.map((tip) => (
                <ChecklistItem
                  key={tip.id}
                  icon={tip.icon}
                  title={tip.title}
                  desc={tip.desc}
                  done={!!checked[tip.id]}
                  onToggle={() => setChecked((c) => ({ ...c, [tip.id]: !c[tip.id] }))}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Facultatif — mais ça change tout sur le taux de clic. Tu peux y revenir plus tard.
            </p>
          </Step>
        )}

        {/* Écran 6 — Contenu */}
        {step === 5 && (
          <Step
            title="Comment tu crées ?"
            subtitle="Nova écrit tout. À toi de dire si tu apparais à l'écran ou non."
          >
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-3">
                <ModeCard
                  active={contentMode === 'FACELESS'}
                  onClick={() => setContentMode('FACELESS')}
                  icon={Wand2}
                  title="Sans te montrer"
                  desc="Nova génère visuels et textes. Publié tout seul, zéro effort."
                  badge="Automatique"
                />
                <ModeCard
                  active={contentMode === 'FACE'}
                  onClick={() => setContentMode('FACE')}
                  icon={Video}
                  title="Face caméra"
                  desc="Nova écrit ton script, tu te filmes. Atlas te rappelle de tourner."
                  badge="Plus de lien"
                />
              </div>

              <div>
                <p className="eyebrow mb-2">Rythme de publication</p>
                <div className="grid grid-cols-3 gap-2">
                  {CADENCES.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setCadence(c.value)}
                      className={cn(
                        'flex flex-col items-center gap-0.5 rounded-xl border bg-surface py-3 transition-colors',
                        cadence === c.value ? 'border-transparent' : 'border-border active:bg-muted',
                      )}
                      style={
                        cadence === c.value
                          ? { borderColor: NOVA, boxShadow: `0 0 0 1px ${NOVA}` }
                          : undefined
                      }
                    >
                      <span className="text-base font-bold text-foreground">{c.value}</span>
                      <span className="text-[10px] font-semibold text-muted-foreground">{c.label}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">Publications par semaine.</p>
              </div>

              <div>
                <p className="eyebrow mb-2">Ton mix de contenu</p>
                <div className="flex h-2.5 overflow-hidden rounded-full">
                  <span style={{ width: '70%', background: NOVA }} />
                  <span style={{ width: '20%', background: `${NOVA}8c` }} />
                  <span style={{ width: '10%', background: `${NOVA}45` }} />
                </div>
                <div className="mt-2 flex flex-col gap-1.5">
                  <MixRow op="" label="Attirer" pct="70%" desc="Du contenu qui capte les inconnus." />
                  <MixRow op="8c" label="Nourrir" pct="20%" desc="Tu crées le lien et la confiance." />
                  <MixRow op="45" label="Convertir" pct="10%" desc="Tu invites à la réunion." />
                </div>
              </div>
            </div>
          </Step>
        )}

        {/* Écran 7 — Parcours du lead */}
        {step === 6 && (
          <Step
            title="Ce qui se passe ensuite"
            subtitle="Atlas s'occupe de tout jusqu'à la réunion. Toi, tu animes et tu closes."
          >
            <div className="flex flex-col">
              {JOURNEY.map((s, i) => (
                <JourneyStep key={s.title} {...s} last={i === JOURNEY.length - 1} />
              ))}
            </div>
          </Step>
        )}

        {/* Écran 8 — Récap */}
        {step === 7 && (
          <Step
            title="Prêt à lancer ?"
            subtitle="Vérifie ta campagne. Tu pourras tout modifier ensuite."
          >
            <div className="flex flex-col gap-2.5">
              <RecapRow
                icon={Target}
                label="Objectif"
                value={goal === 'PARTENAIRES' ? 'Recruter des partenaires' : 'Trouver des clients'}
              />
              <RecapRow icon={Users} label="Cible" value={who || 'Non précisée'} />
              <RecapRow
                icon={CalendarCheck}
                label="Réunion"
                value={
                  meetingFormat === 'GROUPE'
                    ? `En groupe — ${day} à ${time}`
                    : meetingFormat === 'TETE_A_TETE'
                      ? 'En tête-à-tête — sur rendez-vous'
                      : 'Non définie'
                }
              />
              <RecapRow
                icon={Radio}
                label="Canaux"
                value={
                  channels.map((c) => (c === 'INSTAGRAM' ? 'Instagram' : 'Facebook')).join(' · ') || '—'
                }
              />
              <RecapRow
                icon={contentMode === 'FACELESS' ? Wand2 : Video}
                label="Contenu"
                value={`${contentMode === 'FACELESS' ? 'Sans te montrer' : 'Face caméra'} · ${cadence}/sem`}
              />
            </div>
            <div
              className="flex items-start gap-2.5 rounded-2xl border p-3.5"
              style={{ borderColor: `${NOVA}45`, background: `${NOVA}0f` }}
            >
              <Megaphone className="mt-0.5 size-4 shrink-0" style={{ color: NOVA }} />
              <p className="text-xs text-muted-foreground">
                En lançant, Nova commence à produire ton contenu et à publier au rythme choisi. Tu gardes
                la main sur chaque publication.
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
          {saving ? 'Enregistrement…' : step === STEPS.length - 1 ? 'Lancer la campagne' : 'Continuer'}
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

const PROFILE_TIPS: { id: string; icon: typeof ImageIcon; title: string; desc: string }[] = [
  { id: 'photo', icon: ImageIcon, title: 'Photo de profil nette', desc: 'Ton visage ou ton logo, lumineux et reconnaissable.' },
  { id: 'bio', icon: AtSign, title: 'Une bio qui parle à ta cible', desc: 'Qui tu aides, à quoi, en une ligne. Pas de jargon.' },
  { id: 'lien', icon: Link2, title: 'Le lien vers ta réunion en bio', desc: 'Le seul call-to-action : là où tout le trafic atterrit.' },
  { id: 'feed', icon: Grid3x3, title: 'Un feed cohérent', desc: 'Mêmes couleurs, même ton : on te reconnaît d\'un coup d\'œil.' },
  { id: 'epingle', icon: Sparkles, title: 'Un post épinglé qui présente ton offre', desc: 'Le premier réflexe d\'un curieux, c\'est de scroller ton profil.' },
]

function ChannelCard({
  active,
  onClick,
  icon: Icon,
  title,
  desc,
  soon,
}: {
  active: boolean
  onClick: () => void
  icon: typeof Camera
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

const CADENCES = [
  { value: 3, label: 'Tranquille' },
  { value: 5, label: 'Régulier' },
  { value: 7, label: 'Intense' },
]

const ATLAS = '#F97316'

const JOURNEY: { icon: typeof MessageCircle; title: string; desc: string; actor: 'Atlas' | 'Toi' }[] = [
  { icon: MessageCircle, title: 'Un curieux se manifeste', desc: 'Il commente ou t\'écrit — Atlas engage la conversation en privé.', actor: 'Atlas' },
  { icon: Filter, title: 'Atlas qualifie', desc: 'Il cerne son besoin et sa maturité, sans être insistant.', actor: 'Atlas' },
  { icon: CalendarCheck, title: 'Il s\'inscrit à la réunion', desc: 'Atlas l\'invite et le place sur ton créneau.', actor: 'Atlas' },
  { icon: Handshake, title: 'La réunion', desc: 'Tu présentes, tu réponds, tu closes en direct.', actor: 'Toi' },
  { icon: RefreshCw, title: 'Le suivi', desc: 'Tu notes le résultat ; Atlas relance ceux qui hésitent.', actor: 'Toi' },
]

function JourneyStep({
  icon: Icon,
  title,
  desc,
  actor,
  last,
}: {
  icon: typeof MessageCircle
  title: string
  desc: string
  actor: 'Atlas' | 'Toi'
  last: boolean
}) {
  const color = actor === 'Atlas' ? ATLAS : NOVA
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-full"
          style={{ background: `${color}1a`, color }}
        >
          <Icon className="size-4 stroke-[1.5]" />
        </span>
        {!last && <span className="my-1 w-px flex-1 bg-border" />}
      </div>
      <div className={cn('flex-1', !last && 'pb-4')}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-foreground">{title}</span>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ background: `${color}1a`, color }}
          >
            {actor}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  )
}

function RecapRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Target
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3.5">
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-lg"
        style={{ background: `${NOVA}1a`, color: NOVA }}
      >
        <Icon className="size-4 stroke-[1.5]" />
      </span>
      <div className="flex-1">
        <p className="eyebrow">{label}</p>
        <p className="text-sm font-semibold text-foreground line-clamp-2">{value}</p>
      </div>
    </div>
  )
}

function ModeCard({
  active,
  onClick,
  icon: Icon,
  title,
  desc,
  badge,
}: {
  active: boolean
  onClick: () => void
  icon: typeof Wand2
  title: string
  desc: string
  badge: string
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
        <span className="flex items-center gap-2">
          <span className="text-sm font-bold text-foreground">{title}</span>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ background: `${NOVA}1a`, color: NOVA }}
          >
            {badge}
          </span>
        </span>
        <span className="block text-xs text-muted-foreground">{desc}</span>
      </span>
      {active && <Check className="size-5" style={{ color: NOVA }} />}
    </button>
  )
}

function MixRow({ op, label, pct, desc }: { op: string; label: string; pct: string; desc: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="size-2.5 shrink-0 rounded-full" style={{ background: `${NOVA}${op}` }} />
      <span className="text-xs font-bold text-foreground">{label}</span>
      <span className="text-xs font-semibold" style={{ color: NOVA }}>
        {pct}
      </span>
      <span className="text-xs text-muted-foreground">— {desc}</span>
    </div>
  )
}

function ChecklistItem({
  icon: Icon,
  title,
  desc,
  done,
  onToggle,
}: {
  icon: typeof ImageIcon
  title: string
  desc: string
  done: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3.5 text-left transition-colors active:bg-muted"
    >
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-lg"
        style={{ background: `${NOVA}1a`, color: NOVA }}
      >
        <Icon className="size-4 stroke-[1.5]" />
      </span>
      <span className="flex-1">
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className="block text-xs text-muted-foreground">{desc}</span>
      </span>
      <span
        className="flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors"
        style={done ? { background: NOVA, borderColor: NOVA } : { borderColor: 'var(--border)' }}
      >
        {done && <Check className="size-4 text-white" />}
      </span>
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
