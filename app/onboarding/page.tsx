'use client'

import { Suspense, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import {
  ArrowRight, ArrowLeft, Check, Sparkles, Users, GitFork,
  Target, TrendingUp, BookOpen, MessageCircle, Brain,
  MessageSquare, Phone, Camera, Globe, ChevronRight,
  Link2, UserPlus, Trash2, AtSign, ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/* ── Types ─────────────────────────────────────────────────── */
type Plan = 'forfait' | 'licence'
type StepId =
  | 'splash'
  | 'atline_link'
  | 'other_mlm'
  | 'reseau'
  | 'objectifs'
  | 'agents'
  | 'messagerie'
  | 'atline_parrainage'
  | 'mlm_links'
  | 'contacts'
  | 'profil'

type Contact = {
  id: string
  firstName: string
  lastName: string
  phone: string
  heat: 'hot' | 'warm' | 'cold'
}

/* ── Step list computation ──────────────────────────────────── */
function computeStepList(plan: Plan, hasOtherMlm: boolean | null): StepId[] {
  if (plan === 'forfait') {
    return [
      'splash', 'reseau', 'objectifs', 'agents',
      'messagerie', 'atline_parrainage', 'mlm_links', 'contacts', 'profil',
    ]
  }
  const steps: StepId[] = ['splash', 'atline_link', 'other_mlm']
  if (hasOtherMlm !== false) {
    steps.push('reseau', 'mlm_links')
  }
  steps.push('objectifs', 'agents', 'messagerie', 'contacts', 'profil')
  return steps
}

/* ── Static data ────────────────────────────────────────────── */
const objectives = [
  { id: 'reseau',       label: 'Développer mon réseau',    icon: GitFork },
  { id: 'prospection',  label: 'Améliorer ma prospection', icon: Target },
  { id: 'ventes',       label: 'Augmenter mes ventes',     icon: TrendingUp },
  { id: 'coaching',     label: 'Coacher mon équipe',       icon: Users },
  { id: 'formation',    label: 'Progresser en formation',  icon: BookOpen },
  { id: 'contenu',      label: 'Créer du contenu',         icon: MessageCircle },
]

const agents = [
  {
    name: 'Atlas', role: 'Coach principal',
    desc: 'Analyse tes contacts, qualifie tes prospects et te guide chaque jour vers tes objectifs.',
    color: '#F97316', bg: 'bg-orange-50',
  },
  {
    name: 'ARIA', role: 'Simulateur de conversations',
    desc: 'Entraîne-toi à chaque phase de prospection grâce à des jeux de rôle IA adaptés à ton profil.',
    color: '#8B5CF6', bg: 'bg-violet-50',
  },
  {
    name: 'Nova', role: 'Stratège de contenu',
    desc: 'Planifie et optimise ton contenu social selon la règle 70/20/10 pour attirer des prospects.',
    color: '#3B82F6', bg: 'bg-blue-50',
  },
]

const channels = [
  { id: 'whatsapp',  label: 'WhatsApp',  icon: MessageSquare, color: '#25D366' },
  { id: 'sms',       label: 'SMS',       icon: Phone,         color: '#3B82F6' },
  { id: 'instagram', label: 'Instagram', icon: Camera,        color: '#E1306C' },
  { id: 'facebook',  label: 'Facebook',  icon: Globe,         color: '#1877F2' },
]

const mlmNetworks = ['Herbalife', 'Forever Living', 'Amway', 'Oriflame', 'NHT Global', 'Autre']

const heatConfig: Record<Contact['heat'], { label: string; style: string }> = {
  hot:  { label: 'Chaud', style: 'border-orange-200 bg-orange-50 text-orange-700' },
  warm: { label: 'Tiède', style: 'border-amber-200 bg-amber-50 text-amber-700' },
  cold: { label: 'Froid', style: 'border-blue-100 bg-blue-50 text-blue-700' },
}

function newContact(): Contact {
  return { id: Math.random().toString(36).slice(2), firstName: '', lastName: '', phone: '', heat: 'warm' }
}

/* ── Shared UI atoms ────────────────────────────────────────── */
function NextBtn({ onClick, disabled, label = 'Suivant' }: {
  onClick: () => void; disabled?: boolean; label?: string
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-[15px] font-bold text-primary-foreground shadow-md transition-all active:scale-[0.98] disabled:opacity-40">
      {label}<ArrowRight className="size-4" />
    </button>
  )
}

function SkipBtn({ onClick, label = 'Passer cette étape' }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" onClick={onClick}
      className="flex w-full items-center justify-center gap-1 py-2 text-sm font-medium text-muted-foreground">
      {label}<ChevronRight className="size-3.5" />
    </button>
  )
}

function AtlasCard({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary font-display text-base font-bold text-primary-foreground">A</div>
      <div>
        <p className="text-xs font-bold text-primary">Atlas</p>
        <p className="mt-0.5 text-xs leading-relaxed text-foreground">{text}</p>
      </div>
    </div>
  )
}

function UrlInput({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{label}</label>
      <div className="flex items-center overflow-hidden rounded-xl border border-border bg-background focus-within:ring-2 focus-within:ring-primary/30">
        <span className="flex items-center pl-3 text-muted-foreground"><ExternalLink className="size-3.5" /></span>
        <input type="url" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className="flex-1 bg-transparent px-3 py-3.5 text-sm text-foreground outline-none placeholder:text-muted-foreground" />
      </div>
    </div>
  )
}

/* ── Main component ─────────────────────────────────────────── */
function OnboardingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const plan: Plan = searchParams.get('plan') === 'licence' ? 'licence' : 'forfait'

  const [stepIndex, setStepIndex] = useState(0)
  const [hasOtherMlm, setHasOtherMlm] = useState<boolean | null>(null)

  const [network, setNetwork] = useState('')
  const [networkOther, setNetworkOther] = useState('')
  const [selectedObjectives, setSelectedObjectives] = useState<string[]>([])
  const [connectedChannels, setConnectedChannels] = useState<string[]>([])
  const [username, setUsername] = useState('')
  const usernameSlug = username.toLowerCase().replace(/[^a-z0-9_-]/g, '')
  const usernameValid = usernameSlug.length >= 3
  const [mlmLinkOpportunity, setMlmLinkOpportunity] = useState('')
  const [mlmLinkClient, setMlmLinkClient] = useState('')
  const [contacts, setContacts] = useState<Contact[]>([newContact()])
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  const stepList = useMemo(() => computeStepList(plan, hasOtherMlm), [plan, hasOtherMlm])
  const currentStep = stepList[stepIndex]
  const totalSteps = stepList.length

  const goNext = () => {
    if (stepIndex < totalSteps - 1) setStepIndex((i) => i + 1)
    else router.push('/home')
  }
  const goBack = () => setStepIndex((i) => Math.max(0, i - 1))

  const toggleObjective = (id: string) =>
    setSelectedObjectives((p) => p.includes(id) ? p.filter((o) => o !== id) : [...p, id])
  const toggleChannel = (id: string) =>
    setConnectedChannels((p) => p.includes(id) ? p.filter((c) => c !== id) : [...p, id])
  const addContact = () => setContacts((p) => [...p, newContact()])
  const removeContact = (id: string) =>
    setContacts((p) => p.length > 1 ? p.filter((c) => c.id !== id) : p)
  const updateContact = (id: string, field: keyof Contact, value: string) =>
    setContacts((p) => p.map((c) => c.id === id ? { ...c, [field]: value } : c))

  const networkName = network === 'Autre' ? networkOther : network
  const validContacts = contacts.filter((c) => c.firstName.trim())
  const hotContacts = validContacts.filter((c) => c.heat === 'hot')

  return (
    <div className="flex min-h-dvh flex-col bg-background" style={{ paddingTop: 'max(0px, env(safe-area-inset-top))' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-2">
        {stepIndex > 0
          ? <button type="button" onClick={goBack} className="flex size-9 items-center justify-center rounded-full text-foreground active:bg-muted"><ArrowLeft className="size-5 stroke-[1.5]" /></button>
          : <Image src="/brand/atline-icon.png" alt="Atline" width={32} height={32} className="rounded-lg" />
        }
        {stepIndex < totalSteps - 1 && (
          <button type="button" onClick={() => router.push('/home')} className="text-sm font-medium text-muted-foreground active:text-foreground">Passer</button>
        )}
      </div>

      {/* Progress */}
      {stepIndex > 0 && (
        <div className="flex items-center justify-center gap-1.5 pb-2 pt-1">
          {stepList.map((_, i) => (
            <span key={i} className={cn('h-1.5 rounded-full transition-all duration-300',
              i === stepIndex ? 'w-6 bg-primary' : i < stepIndex ? 'w-1.5 bg-primary/50' : 'w-1.5 bg-border'
            )} />
          ))}
        </div>
      )}

      <div className="flex flex-1 flex-col px-5 pb-8">

        {/* ── splash ── */}
        {currentStep === 'splash' && (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="mb-6 flex size-[88px] items-center justify-center rounded-[28px] bg-primary font-display text-[42px] font-extrabold text-primary-foreground shadow-lg">A</div>
            <h1 className="font-display text-[28px] font-extrabold leading-tight tracking-tight text-foreground">Bienvenue dans Atline</h1>
            <p className="mt-2 text-[15px] text-muted-foreground">
              {plan === 'licence' ? 'Configure ton activité et tes outils.' : 'Ton assistant IA pour le MLM.'}
            </p>
            <div className="mt-8 w-full max-w-sm space-y-3 text-left">
              {[
                { icon: Brain, label: 'Atlas qualifie tes prospects', color: 'text-primary', bg: 'bg-orange-50' },
                { icon: Users, label: 'ARIA entraîne tes conversations', color: 'text-violet-600', bg: 'bg-violet-50' },
                { icon: Sparkles, label: 'Nova optimise ton contenu', color: 'text-blue-600', bg: 'bg-blue-50' },
              ].map(({ icon: Icon, label, color, bg }) => (
                <div key={label} className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 shadow-card">
                  <div className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl', bg)}>
                    <Icon className={cn('size-4 stroke-[1.5]', color)} />
                  </div>
                  <span className="text-[14px] font-semibold text-foreground">{label}</span>
                </div>
              ))}
            </div>
            <button type="button" onClick={goNext}
              className="mt-8 flex w-full max-w-sm items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-[15px] font-bold text-primary-foreground shadow-md transition-transform active:scale-[0.98]">
              Commencer<ArrowRight className="size-4" />
            </button>
          </div>
        )}

        {/* ── atline_link (licence only) ── */}
        {currentStep === 'atline_link' && (
          <div className="flex flex-1 flex-col">
            <h2 className="mb-1 mt-4 font-display text-[24px] font-extrabold text-foreground">Tes liens Atline</h2>
            <p className="mb-6 text-sm text-muted-foreground">
              Ton identifiant Atline génère tes liens pour recruter de nouveaux licenciés et référer des clients.
            </p>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Ton identifiant</label>
              <div className="flex items-center overflow-hidden rounded-xl border border-border bg-background focus-within:ring-2 focus-within:ring-primary/30">
                <span className="flex items-center pl-4 pr-2 text-muted-foreground"><AtSign className="size-4" /></span>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                  placeholder="lea-moreau" autoComplete="off" autoCapitalize="none" spellCheck={false}
                  className="flex-1 bg-transparent py-3.5 pr-4 text-sm text-foreground outline-none placeholder:text-muted-foreground" />
                {usernameValid && (
                  <div className="mr-3 flex size-6 items-center justify-center rounded-full bg-green-500">
                    <Check className="size-3 text-white" strokeWidth={3} />
                  </div>
                )}
              </div>
              {username && !usernameValid && (
                <p className="text-xs text-destructive">Minimum 3 caractères (lettres, chiffres, tirets)</p>
              )}
            </div>

            {usernameValid && (
              <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
                <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-orange-50">
                    <GitFork className="size-4 stroke-[1.5] text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Lien licencié</p>
                    <p className="mt-0.5 font-mono text-sm font-semibold text-foreground truncate">
                      atline.ai/<span className="text-primary">{usernameSlug}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-green-50">
                    <Users className="size-4 stroke-[1.5] text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Lien client Atline</p>
                    <p className="mt-0.5 font-mono text-sm font-semibold text-foreground truncate">
                      atline.ai/<span className="text-green-600">{usernameSlug}</span>/client
                    </p>
                  </div>
                </div>
              </div>
            )}

            {usernameValid && (
              <div className="mt-4">
                <AtlasCard text={`Tes liens Atline sont prêts. Ils sont distincts de tes liens MLM externe si tu en as un.`} />
              </div>
            )}

            <div className="mt-auto pt-6 flex flex-col gap-3">
              <NextBtn onClick={goNext} disabled={!usernameValid} label="Confirmer mon identifiant" />
              <SkipBtn onClick={goNext} label="Choisir plus tard" />
            </div>
          </div>
        )}

        {/* ── other_mlm (licence only) ── */}
        {currentStep === 'other_mlm' && (
          <div className="flex flex-1 flex-col">
            <h2 className="mb-1 mt-4 font-display text-[24px] font-extrabold text-foreground">Un autre business MLM ?</h2>
            <p className="mb-6 text-sm text-muted-foreground">
              En plus de ton activité Atline, développes-tu un autre réseau MLM (Herbalife, Amway…) ?
            </p>

            <div className="flex flex-col gap-3">
              {([
                { value: true,  label: 'Oui',  desc: 'Je développe un autre réseau MLM en parallèle' },
                { value: false, label: 'Non',  desc: 'Atline est mon unique activité' },
              ] as const).map(({ value, label, desc }) => (
                <button key={label} type="button" onClick={() => setHasOtherMlm(value)}
                  className={cn(
                    'flex items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all active:scale-[0.99]',
                    hasOtherMlm === value ? 'border-primary bg-primary/5' : 'border-border bg-surface shadow-card'
                  )}>
                  <div className="flex-1 min-w-0">
                    <p className={cn('font-bold', hasOtherMlm === value ? 'text-primary' : 'text-foreground')}>{label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground leading-snug">{desc}</p>
                  </div>
                  {hasOtherMlm === value && (
                    <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary">
                      <Check className="size-3 text-primary-foreground" strokeWidth={3} />
                    </div>
                  )}
                </button>
              ))}
            </div>

            {hasOtherMlm === true && (
              <div className="mt-4">
                <div className="rounded-2xl border border-border bg-surface p-4 shadow-card">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Cloisonnement des activités</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Tes deux activités seront entièrement séparées — contacts, commissions, réseau et historique. Tu pourras basculer entre elles depuis le sélecteur en haut de l'app.
                  </p>
                </div>
              </div>
            )}

            <div className="mt-auto pt-6">
              <NextBtn onClick={goNext} disabled={hasOtherMlm === null} label="Suivant" />
            </div>
          </div>
        )}

        {/* ── reseau ── */}
        {currentStep === 'reseau' && (
          <div className="flex flex-1 flex-col">
            <h2 className="mb-1 mt-4 font-display text-[24px] font-extrabold text-foreground">
              {plan === 'licence' ? 'Ton autre réseau MLM' : 'Ton réseau MLM'}
            </h2>
            <p className="mb-6 text-sm text-muted-foreground">Avec quelle marque travailles-tu ?</p>
            <div className="grid grid-cols-2 gap-2.5">
              {mlmNetworks.map((n) => (
                <button key={n} type="button" onClick={() => setNetwork(n)}
                  className={cn(
                    'rounded-2xl border-2 px-4 py-3.5 text-left text-sm font-semibold transition-all',
                    network === n ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-surface text-foreground shadow-card'
                  )}>
                  {n === network && <Check className="mb-1 size-3.5 text-primary" strokeWidth={3} />}
                  {n}
                </button>
              ))}
            </div>
            {network === 'Autre' && (
              <input type="text" value={networkOther} onChange={(e) => setNetworkOther(e.target.value)}
                placeholder="Nom de ton réseau"
                className="mt-3 rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30" />
            )}
            <div className="mt-auto pt-6">
              <NextBtn onClick={goNext} label={network ? 'Suivant' : 'Passer cette étape'} />
            </div>
          </div>
        )}

        {/* ── objectifs ── */}
        {currentStep === 'objectifs' && (
          <div className="flex flex-1 flex-col">
            <h2 className="mb-1 mt-4 font-display text-[24px] font-extrabold text-foreground">Tes objectifs</h2>
            <p className="mb-6 text-sm text-muted-foreground">Atlas adapte ses recommandations. Sélectionne tout ce qui s'applique.</p>
            <div className="grid grid-cols-2 gap-2.5">
              {objectives.map(({ id, label, icon: Icon }) => {
                const active = selectedObjectives.includes(id)
                return (
                  <button key={id} type="button" onClick={() => toggleObjective(id)}
                    className={cn(
                      'flex flex-col items-start gap-2.5 rounded-2xl border-2 p-4 text-left transition-all active:scale-[0.98]',
                      active ? 'border-primary bg-primary/5' : 'border-border bg-surface shadow-card'
                    )}>
                    <div className={cn('flex size-9 items-center justify-center rounded-xl', active ? 'bg-primary/10' : 'bg-muted')}>
                      <Icon className={cn('size-4 stroke-[1.5]', active ? 'text-primary' : 'text-muted-foreground')} />
                    </div>
                    <span className={cn('text-xs font-semibold leading-snug', active ? 'text-primary' : 'text-foreground')}>{label}</span>
                  </button>
                )
              })}
            </div>
            <div className="mt-auto pt-6">
              <NextBtn onClick={goNext} label={selectedObjectives.length > 0 ? 'Suivant' : 'Passer cette étape'} />
            </div>
          </div>
        )}

        {/* ── agents ── */}
        {currentStep === 'agents' && (
          <div className="flex flex-1 flex-col">
            <h2 className="mb-1 mt-4 font-display text-[24px] font-extrabold text-foreground">3 agents IA travaillent pour toi</h2>
            <p className="mb-6 text-sm text-muted-foreground">Ensemble, ils couvrent tout ton parcours.</p>
            <div className="flex flex-col gap-3">
              {agents.map(({ name, role, desc, color, bg }) => (
                <div key={name} className="flex items-start gap-4 rounded-2xl border border-border bg-surface p-4 shadow-card">
                  <div className={cn('flex size-12 shrink-0 items-center justify-center rounded-[14px]', bg)}>
                    <span className="font-display text-[20px] font-extrabold" style={{ color }}>{name[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground">{name}</p>
                    <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color }}>{role}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-auto pt-6">
              <NextBtn onClick={goNext} label="Suivant" />
            </div>
          </div>
        )}

        {/* ── messagerie ── */}
        {currentStep === 'messagerie' && (
          <div className="flex flex-1 flex-col">
            <h2 className="mb-1 mt-4 font-display text-[24px] font-extrabold text-foreground">Connecte ta messagerie</h2>
            <p className="mb-6 text-sm text-muted-foreground">Centralise tes conversations dans Atline.</p>
            {(() => {
              const wa = channels[0]; const Icon = wa.icon; const active = connectedChannels.includes(wa.id)
              return (
                <button type="button" onClick={() => toggleChannel(wa.id)}
                  className={cn('mb-3 flex items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all',
                    active ? 'border-primary bg-primary/5' : 'border-border bg-surface shadow-card')}>
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-[#25D366]/15">
                    <Icon className="size-5" style={{ color: '#25D366' }} strokeWidth={2} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-foreground">WhatsApp</p>
                    <p className="text-xs text-muted-foreground">Canal principal pour la prospection MLM</p>
                  </div>
                  <div className={cn('flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-all',
                    active ? 'border-primary bg-primary' : 'border-border')}>
                    {active && <Check className="size-3 text-primary-foreground" strokeWidth={3} />}
                  </div>
                </button>
              )
            })()}
            <div className="grid grid-cols-3 gap-2.5">
              {channels.slice(1).map(({ id, label, icon: Icon, color }) => {
                const active = connectedChannels.includes(id)
                return (
                  <button key={id} type="button" onClick={() => toggleChannel(id)}
                    className={cn('flex flex-col items-center gap-2 rounded-2xl border-2 px-3 py-4 transition-all',
                      active ? 'border-primary bg-primary/5' : 'border-border bg-surface shadow-card')}>
                    <Icon className="size-5" style={{ color }} strokeWidth={2} />
                    <span className={cn('text-xs font-semibold', active ? 'text-primary' : 'text-foreground')}>{label}</span>
                  </button>
                )
              })}
            </div>
            <div className="mt-auto pt-6 flex flex-col gap-3">
              <NextBtn onClick={goNext} disabled={connectedChannels.length === 0} label="Connecter" />
              <SkipBtn onClick={goNext} label="Passer pour l'instant" />
            </div>
          </div>
        )}

        {/* ── atline_parrainage (forfait only) ── */}
        {currentStep === 'atline_parrainage' && (
          <div className="flex flex-1 flex-col">
            <h2 className="mb-1 mt-4 font-display text-[24px] font-extrabold text-foreground">Ton lien de parrainage Atline</h2>
            <p className="mb-6 text-sm text-muted-foreground">
              Invite tes proches à utiliser l'app Atline. Ce lien est distinct de tes liens {networkName || 'MLM'}.
            </p>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Ton identifiant</label>
              <div className="flex items-center overflow-hidden rounded-xl border border-border bg-background focus-within:ring-2 focus-within:ring-primary/30">
                <span className="flex items-center pl-4 pr-2 text-muted-foreground"><AtSign className="size-4" /></span>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                  placeholder="lea-moreau" autoComplete="off" autoCapitalize="none" spellCheck={false}
                  className="flex-1 bg-transparent py-3.5 pr-4 text-sm text-foreground outline-none placeholder:text-muted-foreground" />
                {usernameValid && (
                  <div className="mr-3 flex size-6 items-center justify-center rounded-full bg-green-500">
                    <Check className="size-3 text-white" strokeWidth={3} />
                  </div>
                )}
              </div>
              {username && !usernameValid && (
                <p className="text-xs text-destructive">Minimum 3 caractères (lettres, chiffres, tirets)</p>
              )}
            </div>
            {usernameValid && (
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Link2 className="size-4 stroke-[1.5] text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Ton lien parrainage</p>
                  <p className="mt-0.5 font-mono text-sm font-semibold text-foreground truncate">
                    atline.ai/<span className="text-primary">{usernameSlug}</span>
                  </p>
                </div>
              </div>
            )}
            <div className="mt-auto pt-6 flex flex-col gap-3">
              <NextBtn onClick={goNext} disabled={!usernameValid} label="Confirmer mon identifiant" />
              <SkipBtn onClick={goNext} label="Choisir plus tard" />
            </div>
          </div>
        )}

        {/* ── mlm_links ── */}
        {currentStep === 'mlm_links' && (
          <div className="flex flex-1 flex-col">
            <h2 className="mb-1 mt-4 font-display text-[24px] font-extrabold text-foreground">
              Tes liens {networkName || 'MLM'}
            </h2>
            <p className="mb-5 text-sm text-muted-foreground">
              Atlas les utilisera dans tes scripts et messages pour chaque conversation.
            </p>
            <div className="mb-5 grid grid-cols-1 gap-2.5">
              <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3.5 shadow-card">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-orange-50">
                  <GitFork className="size-4 stroke-[1.5] text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground">Lien opportunité</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">Pour inviter quelqu'un à rejoindre ton réseau {networkName || 'MLM'} comme distributeur</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3.5 shadow-card">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-green-50">
                  <Users className="size-4 stroke-[1.5] text-green-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground">Lien client</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">Pour diriger quelqu'un vers ta boutique {networkName || 'MLM'} pour acheter les produits</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <UrlInput label={`Lien opportunité ${networkName || 'MLM'}`} value={mlmLinkOpportunity}
                onChange={setMlmLinkOpportunity} placeholder="herbalife.com/ton-lien" />
              <UrlInput label={`Lien client ${networkName || 'MLM'}`} value={mlmLinkClient}
                onChange={setMlmLinkClient} placeholder="ma-boutique.herbalife.com" />
            </div>
            {(mlmLinkOpportunity || mlmLinkClient) && (
              <div className="mt-4">
                <AtlasCard text={`Tes liens ${networkName || 'MLM'} sont enregistrés. Je les intégrerai dans les messages et scripts que je préparerai pour toi.`} />
              </div>
            )}
            <div className="mt-auto pt-6 flex flex-col gap-3">
              <NextBtn onClick={goNext} disabled={!mlmLinkOpportunity && !mlmLinkClient} label="Enregistrer mes liens" />
              <SkipBtn onClick={goNext} label="Ajouter plus tard" />
            </div>
          </div>
        )}

        {/* ── contacts ── */}
        {currentStep === 'contacts' && (
          <div className="flex flex-1 flex-col">
            <h2 className="mb-1 mt-4 font-display text-[24px] font-extrabold text-foreground">Tes premiers contacts</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Qui comptes-tu contacter en premier ?
            </p>
            <div className="mb-5">
              <AtlasCard text="Je préparerai un plan d'action personnalisé pour chacun dès ton arrivée dans l'app. Les contacts chauds seront traités en priorité." />
            </div>
            <div className="flex flex-col gap-3 overflow-y-auto">
              {contacts.map((c, i) => (
                <div key={c.id} className="rounded-2xl border border-border bg-surface p-4 shadow-card">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Contact {i + 1}</span>
                    {contacts.length > 1 && (
                      <button type="button" onClick={() => removeContact(c.id)}
                        className="flex size-7 items-center justify-center rounded-full text-muted-foreground active:bg-muted">
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <input type="text" value={c.firstName} onChange={(e) => updateContact(c.id, 'firstName', e.target.value)}
                      placeholder="Prénom *"
                      className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30" />
                    <input type="text" value={c.lastName} onChange={(e) => updateContact(c.id, 'lastName', e.target.value)}
                      placeholder="Nom"
                      className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <input type="tel" value={c.phone} onChange={(e) => updateContact(c.id, 'phone', e.target.value)}
                    placeholder="Téléphone (optionnel)"
                    className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30" />
                  <div className="mt-3 flex gap-2">
                    {(['hot', 'warm', 'cold'] as const).map((heat) => (
                      <button key={heat} type="button" onClick={() => updateContact(c.id, 'heat', heat)}
                        className={cn(
                          'flex-1 rounded-xl border px-2 py-1.5 text-[11px] font-semibold transition-all',
                          c.heat === heat ? heatConfig[heat].style : 'border-border bg-background text-muted-foreground'
                        )}>
                        {heatConfig[heat].label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {contacts.length < 5 && (
              <button type="button" onClick={addContact}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border py-3.5 text-sm font-semibold text-muted-foreground transition-colors active:bg-muted">
                <UserPlus className="size-4" />
                Ajouter un contact
              </button>
            )}
            <div className="mt-auto pt-5 flex flex-col gap-3">
              <NextBtn
                onClick={goNext}
                disabled={validContacts.length === 0}
                label={validContacts.length > 0
                  ? `Ajouter ${validContacts.length} contact${validContacts.length > 1 ? 's' : ''}${hotContacts.length > 0 ? ` (${hotContacts.length} chaud${hotContacts.length > 1 ? 's' : ''})` : ''}`
                  : 'Ajouter au moins un contact'}
              />
              <SkipBtn onClick={goNext} label="Passer pour l'instant" />
            </div>
          </div>
        )}

        {/* ── profil ── */}
        {currentStep === 'profil' && (
          <div className="flex flex-1 flex-col">
            <h2 className="mb-1 mt-4 font-display text-[24px] font-extrabold text-foreground">Dernière étape</h2>
            <p className="mb-8 text-sm text-muted-foreground">Atlas a besoin de ton prénom pour personnaliser ton coaching.</p>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Prénom</label>
                <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Léa" autoComplete="given-name" autoFocus
                  className="rounded-xl border border-border bg-background px-4 py-3.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Nom</label>
                <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
                  placeholder="Moreau" autoComplete="family-name"
                  className="rounded-xl border border-border bg-background px-4 py-3.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>
            <div className="mt-6">
              <AtlasCard text={
                firstName
                  ? `Bonjour ${firstName} !${hotContacts.length > 0
                      ? ` J'ai ${hotContacts.length} contact${hotContacts.length > 1 ? 's' : ''} chaud${hotContacts.length > 1 ? 's' : ''} à traiter en priorité. On commence ?`
                      : validContacts.length > 0
                      ? ` J'ai préparé un plan d'action pour tes ${validContacts.length} contact${validContacts.length > 1 ? 's' : ''}. On commence ?`
                      : " Je suis prêt. On commence ?"}`
                  : "Renseigne ton prénom pour que je puisse personnaliser ton coaching."
              } />
            </div>
            <div className="mt-auto pt-6">
              <button type="button" onClick={() => router.push('/home')}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-[15px] font-bold text-primary-foreground shadow-md transition-all active:scale-[0.98]">
                {firstName ? `C'est parti, ${firstName}` : 'Commencer'}
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingContent />
    </Suspense>
  )
}
