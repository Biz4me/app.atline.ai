'use client'

import { use, useState } from 'react'
import { notFound, useRouter } from 'next/navigation'
import { contacts } from '@/lib/data'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  ChevronLeft,
  MessageSquare,
  PhoneCall,
  CalendarPlus,
  Mic,
  Phone,
  Clock,
  Link2,
  StickyNote,
  HelpCircle,
  Pencil,
  Mail,
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { ContactStage } from '@/lib/types'

/* ── Helpers ──────────────────────────────────────────────────── */
const stageLabel: Record<string, string> = {
  chaud: 'Chaud',
  prospect: 'Qualifié',
  client: 'Client',
  partenaire: 'Partenaire',
  nouveau: 'Nouveau',
}

const stagePill: Record<string, string> = {
  chaud:      'bg-primary/10 text-primary',
  prospect:   'bg-info/10 text-info',
  client:     'bg-success/10 text-success',
  partenaire: 'bg-violet/10 text-violet',
  nouveau:    'bg-muted text-muted-foreground',
}

/* Statut = catégorie affichée dans le header */
function getStatut(stage: string): 'Prospect' | 'Client' | 'Partenaire' {
  if (stage === 'client') return 'Client'
  if (stage === 'partenaire') return 'Partenaire'
  return 'Prospect'
}

const sourceColors: Record<string, string> = {
  instagram: 'text-[#E1306C]',
  linkedin: 'text-[#0077B5]',
  facebook: 'text-[#1877F2]',
  recommandation: 'text-success',
  événement: 'text-violet-600',
}
function sourceColor(s: string) {
  return sourceColors[s.toLowerCase()] ?? 'text-muted-foreground'
}

const personalityName: Record<string, string> = { D: 'Rouge', I: 'Jaune', S: 'Vert', C: 'Bleu' }
const personalityDesc: Record<string, string> = {
  D: 'Direct, orienté résultats — va droit au but.',
  I: 'Sociable, enthousiaste — guidé par l\'émotion.',
  S: 'Stable, relationnel — mise sur la confiance.',
  C: 'Analytique, prudent — veut des preuves.',
}
const personalityBg: Record<string, string> = {
  D: '#dc2626',
  I: '#f59e0b',
  S: '#22c55e',
  C: '#3b82f6',
}

const timelineIcons = {
  message: MessageSquare,
  call: PhoneCall,
  note: StickyNote,
  stage: Clock,
  meeting: CalendarPlus,
}

/* ── Edit Sheet ───────────────────────────────────────────────── */
const discOptions = [
  { key: 'D', label: 'Rouge', color: '#DC2626' },
  { key: 'S', label: 'Vert', color: '#22C55E' },
  { key: 'C', label: 'Bleu', color: '#3B82F6' },
  { key: 'I', label: 'Jaune', color: '#F59E0B' },
]

const statutOptions = ['Prospect', 'Client', 'Partenaire'] as const
type Statut = typeof statutOptions[number]

const stagesByStatut: Record<Statut, { id: ContactStage; label: string; color: string }[]> = {
  Prospect: [
    { id: 'chaud', label: 'Chaud', color: 'bg-red-100 text-red-600 border-red-200' },
    { id: 'prospect', label: 'Qualifié', color: 'bg-amber-100 text-amber-600 border-amber-200' },
    { id: 'nouveau', label: 'Contacté', color: 'bg-blue-100 text-blue-600 border-blue-200' },
    { id: 'nouveau', label: 'Nouveau', color: 'bg-gray-100 text-gray-600 border-gray-200' },
  ],
  Client: [{ id: 'client', label: 'Client', color: 'bg-green-100 text-green-700 border-green-200' }],
  Partenaire: [{ id: 'partenaire', label: 'Partenaire', color: 'bg-blue-100 text-blue-700 border-blue-200' }],
}

function EditSheet({
  contact,
  onClose,
}: {
  contact: ReturnType<typeof contacts.find> & {}
  onClose: () => void
}) {
  const [firstName, setFirstName] = useState(contact!.firstName)
  const [lastName, setLastName] = useState(contact!.lastName)
  const [statut, setStatut] = useState<Statut>(getStatut(contact!.stage))
  const [stage, setStage] = useState(contact!.stage)
  const [city, setCity] = useState(contact!.city ?? '')
  const [phone, setPhone] = useState(contact!.phone ?? '')
  const [email, setEmail] = useState(contact!.email ?? '')
  const [source, setSource] = useState(contact!.source ?? '')
  const [disc, setDisc] = useState<string>(contact!.disc ?? '')
  const [note, setNote] = useState(contact!.notes ?? '')

  const handleSave = () => {
    toast.success('Contact mis à jour')
    onClose()
  }

  const inputCls = 'w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/40 placeholder:text-muted-foreground'
  const labelCls = 'mb-1.5 block text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground'

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40" onClick={onClose} />

      {/* Sheet */}
      <div className="max-h-[92dvh] overflow-y-auto rounded-t-3xl bg-background">
        {/* Handle */}
        <div className="sticky top-0 z-10 bg-background pt-3 pb-0">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-border px-4 pb-3">
            <button
              type="button"
              onClick={onClose}
              className="text-sm font-semibold text-muted-foreground"
            >
              Annuler
            </button>
            <h2 className="flex-1 text-center text-sm font-bold text-foreground">
              Modifier le contact
            </h2>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-xl bg-primary px-4 py-1.5 text-sm font-bold text-primary-foreground"
            >
              Enregistrer
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-5 px-4 py-5 pb-10">
          {/* Prénom + Nom */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Prénom</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Nom</label>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Statut */}
          <div>
            <label className={labelCls}>Statut</label>
            <div className="flex gap-2">
              {statutOptions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatut(s)}
                  className={cn(
                    'flex-1 rounded-xl py-2.5 text-sm font-bold transition-colors',
                    statut === s
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border bg-surface text-foreground'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Stage */}
          <div>
            <label className={labelCls}>Stage</label>
            <div className="flex flex-wrap gap-2">
              {stagesByStatut[statut].map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => setStage(s.id)}
                  className={cn(
                    'rounded-xl border px-4 py-2 text-sm font-bold transition-colors',
                    stage === s.id && stagesByStatut[statut].find(x => x.id === stage)?.label === s.label
                      ? s.color
                      : 'border-border bg-surface text-foreground'
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Ville */}
          <div>
            <label className={labelCls}>Ville</label>
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Paris" className={inputCls} />
          </div>

          {/* Téléphone */}
          <div>
            <label className={labelCls}>Téléphone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" placeholder="+33 6 00 00 00 00" className={inputCls} />
          </div>

          {/* Email */}
          <div>
            <label className={labelCls}>Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="contact@email.fr" className={inputCls} />
          </div>

          {/* Source */}
          <div>
            <label className={labelCls}>Source</label>
            <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Instagram, LinkedIn…" className={inputCls} />
          </div>

          {/* Profil DISC */}
          <div>
            <label className={labelCls}>Profil DISC</label>
            <div className="flex gap-2">
              {discOptions.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setDisc(disc === d.key ? '' : d.key)}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-bold transition-all',
                    disc === d.key
                      ? 'border-foreground bg-surface text-foreground shadow-sm'
                      : 'border-border bg-surface text-foreground'
                  )}
                >
                  <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Note libre */}
          <div>
            <label className={labelCls}>Note libre</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note libre..."
              rows={4}
              className={cn(inputCls, 'resize-none')}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Page ──────────────────────────────────────────────────────── */
export default function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const contact = contacts.find((c) => c.id === id)
  if (!contact) notFound()

  const [editOpen, setEditOpen] = useState(false)

  const initials = `${contact.firstName[0]}${contact.lastName[0]}`
  const personality = contact.disc ? personalityName[contact.disc] : null
  const avatarBg = contact.disc ? personalityBg[contact.disc] : undefined
  const statut = getStatut(contact.stage)

  /* shared blocks rendered in both mobile and desktop columns */
  const actionTiles = [
    { icon: MessageSquare, label: 'Message', href: `/messages/${contact.id}` },
    { icon: PhoneCall,    label: 'Appel',   href: undefined, action: () => toast.success(`Appel vers ${contact.firstName}`) },
    { icon: CalendarPlus, label: 'RDV',     href: '/nova' },
  ]

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Header mobile only */}
      <div
        className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-background/90 px-4 py-3 backdrop-blur lg:hidden"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <button
          type="button"
          onClick={() => router.back()}
          className="-ml-1 flex size-9 items-center justify-center rounded-full text-muted-foreground active:bg-muted"
        >
          <ChevronLeft className="size-5 stroke-[1.5]" />
        </button>
        <p className="flex-1 text-center text-sm font-semibold text-muted-foreground">{statut}</p>
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="flex size-9 items-center justify-center rounded-full text-muted-foreground active:bg-muted"
        >
          <Pencil className="size-4 stroke-[1.5]" />
        </button>
      </div>

      {/* ── Desktop header ── */}
      <div className="hidden lg:flex items-center gap-3 border-b border-border px-8 py-4">
        <button type="button" onClick={() => router.back()} className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors">
          <ChevronLeft className="size-4 stroke-[1.5]" />
        </button>
        <h1 className="font-display text-[22px] font-bold text-foreground flex-1">
          {contact.firstName} {contact.lastName}
        </h1>
        <span className={cn('rounded-full px-3 py-1 text-xs font-bold', stagePill[contact.stage] ?? 'bg-muted text-muted-foreground')}>
          {stageLabel[contact.stage] ?? contact.stage}
        </span>
        <button type="button" onClick={() => setEditOpen(true)}
          className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-colors">
          <Pencil className="size-4 stroke-[1.5]" />
          Modifier
        </button>
      </div>

      {/* ── Layout : mobile = 1 col / desktop = 2 cols ── */}
      <div className="flex flex-col gap-5 px-4 pt-6 pb-10 lg:grid lg:grid-cols-[300px_1fr] lg:gap-0 lg:px-0 lg:pt-0 lg:pb-0 lg:items-start lg:min-h-0 lg:flex-1">

        {/* ── Colonne gauche (profil + actions) ── */}
        <div className="flex flex-col gap-5 lg:border-r lg:border-border lg:px-8 lg:py-8 lg:sticky lg:top-0 lg:h-[calc(100dvh-73px)] lg:overflow-y-auto">
          {/* Avatar + nom (mobile only — desktop has header) */}
          <div className="flex flex-col items-center gap-3 text-center lg:hidden">
            <div className="flex size-20 items-center justify-center rounded-full text-2xl font-bold text-white bg-muted" style={avatarBg ? { backgroundColor: avatarBg } : undefined}>
              {initials}
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground">
                {contact.firstName} {contact.lastName}
              </h2>
              <div className="mt-1.5 flex items-center justify-center gap-2">
                <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold', stagePill[contact.stage] ?? 'bg-muted text-muted-foreground')}>
                  {stageLabel[contact.stage] ?? contact.stage}
                </span>
                {contact.city && <span className="text-sm text-muted-foreground">{contact.city}</span>}
              </div>
            </div>
          </div>

          {/* Avatar desktop centré */}
          <div className="hidden lg:flex flex-col items-center gap-4 text-center">
            <div className="flex size-24 items-center justify-center rounded-full text-3xl font-bold text-white bg-muted" style={avatarBg ? { backgroundColor: avatarBg } : undefined}>
              {initials}
            </div>
            {contact.city && <span className="text-sm text-muted-foreground">{contact.city}</span>}
          </div>

          {/* 3 tiles actions */}
          <div className="grid grid-cols-3 gap-2">
            {actionTiles.map((tile) => {
              const Icon = tile.icon
              const cls = 'flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-surface py-4 text-center transition-colors hover:bg-muted/40 active:bg-muted'
              if (tile.href) {
                return (
                  <Link key={tile.label} href={tile.href} className={cls}>
                    <Icon className="size-5 stroke-[1.5] text-primary" />
                    <span className="text-xs font-semibold text-foreground">{tile.label}</span>
                  </Link>
                )
              }
              return (
                <button key={tile.label} type="button" onClick={tile.action} className={cls}>
                  <Icon className="size-5 stroke-[1.5] text-primary" />
                  <span className="text-xs font-semibold text-foreground">{tile.label}</span>
                </button>
              )
            })}
          </div>

          {/* Simuler + Atlas */}
          <div className="grid grid-cols-2 gap-2">
            <Link href={`/aria?contact=${contact.id}`}
              className="flex items-center justify-center gap-2 rounded-2xl bg-primary/10 py-3 text-sm font-bold text-primary transition-colors hover:bg-primary/15 active:bg-primary/20">
              <Mic className="size-4 stroke-[1.5]" />
              Simuler
            </Link>
            <button type="button" onClick={() => toast.success('Atlas analyse ce contact…')}
              className="flex items-center justify-center gap-2 rounded-2xl bg-primary/10 py-3 text-sm font-bold text-primary transition-colors hover:bg-primary/15 active:bg-primary/20">
              <span className="font-display text-base font-bold">A</span>
              Atlas
            </button>
          </div>

          {/* Coordonnées desktop (dans la colonne gauche) */}
          <div className="hidden lg:flex flex-col divide-y divide-border rounded-2xl border border-border bg-surface overflow-hidden">
            {contact.phone && (
              <div className="flex items-center gap-3 px-4 py-3">
                <Phone className="size-4 shrink-0 stroke-[1.5] text-muted-foreground" />
                <a href={`tel:${contact.phone}`} className="text-sm font-semibold text-primary">{contact.phone}</a>
              </div>
            )}
            {contact.email && (
              <div className="flex items-center gap-3 px-4 py-3">
                <Mail className="size-4 shrink-0 stroke-[1.5] text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{contact.email}</span>
              </div>
            )}
            {contact.source && (
              <div className="flex items-center gap-3 px-4 py-3">
                <Link2 className="size-4 shrink-0 stroke-[1.5] text-muted-foreground" />
                <span className={cn('text-sm font-semibold', sourceColor(contact.source))}>
                  Source : {contact.source}
                </span>
              </div>
            )}
            <div className="flex items-center gap-3 px-4 py-3">
              <Clock className="size-4 shrink-0 stroke-[1.5] text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Dernier contact · <span className="font-semibold text-foreground">{contact.lastInteraction}</span>
              </span>
            </div>
          </div>
        </div>

        {/* ── Colonne droite (tabs) ── */}
        <div className="lg:px-8 lg:py-8 lg:overflow-y-auto lg:h-[calc(100dvh-73px)]">
        {/* Tabs */}
        <Tabs defaultValue="infos">
          <TabsList className="grid w-full grid-cols-3 rounded-xl bg-muted p-1">
            <TabsTrigger value="infos">Infos</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="historique">Historique</TabsTrigger>
          </TabsList>

          {/* ── Infos ── */}
          <TabsContent value="infos" className="mt-4 flex flex-col gap-0">
            {/* Personnalité */}
            <div className="border-b border-border pb-4 mb-0">
              <p className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-primary">Personnalité</p>
              {contact.disc ? (
                <div className="flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white" style={{ backgroundColor: personalityBg[contact.disc] }}>
                    {personalityName[contact.disc][0]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">{personalityName[contact.disc]}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {personalityDesc[contact.disc]}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditOpen(true)}
                    className="shrink-0 text-xs font-semibold text-primary"
                  >
                    Modifier →
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/50 p-3">
                  <HelpCircle className="size-5 shrink-0 text-muted-foreground stroke-[1.5]" />
                  <span className="flex-1 text-sm text-muted-foreground">Profil de personnalité non défini</span>
                  <Link
                    href={`/disc-quiz/${contact.id}`}
                    className="shrink-0 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground"
                  >
                    Définir le profil
                  </Link>
                </div>
              )}
            </div>

            {/* Coordonnées */}
            <div className="flex flex-col divide-y divide-border">
              {contact.phone && (
                <div className="flex items-center gap-3 py-3">
                  <Phone className="size-4 shrink-0 stroke-[1.5] text-muted-foreground" />
                  <a href={`tel:${contact.phone}`} className="text-sm font-semibold text-primary">
                    {contact.phone}
                  </a>
                </div>
              )}
              {contact.email && (
                <div className="flex items-center gap-3 py-3">
                  <Mail className="size-4 shrink-0 stroke-[1.5] text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{contact.email}</span>
                </div>
              )}
              {contact.source && (
                <div className="flex items-center gap-3 py-3">
                  <Link2 className="size-4 shrink-0 stroke-[1.5] text-muted-foreground" />
                  <span className={cn('text-sm font-semibold', sourceColor(contact.source))}>
                    Rencontré sur {contact.source}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-3 py-3">
                <Clock className="size-4 shrink-0 stroke-[1.5] text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Dernier contact · <span className="font-semibold text-foreground">{contact.lastInteraction}</span>
                </span>
              </div>
            </div>
          </TabsContent>

          {/* ── Notes ── */}
          <TabsContent value="notes" className="mt-4">
            {contact.notes ? (
              <div className="rounded-2xl border border-border bg-surface p-4">
                <p className="text-sm leading-relaxed text-muted-foreground">{contact.notes}</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border px-6 py-10 text-center">
                <p className="text-sm text-muted-foreground">Aucune note. Ajoute un contexte pour mieux le suivre.</p>
              </div>
            )}
          </TabsContent>

          {/* ── Historique ── */}
          <TabsContent value="historique" className="mt-4">
            {contact.timeline.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border px-6 py-10 text-center">
                <p className="text-sm text-muted-foreground">Aucune interaction pour le moment.</p>
              </div>
            ) : (
              <ol className="flex flex-col gap-4">
                {contact.timeline.map((ev) => {
                  const Icon = timelineIcons[ev.type]
                  return (
                    <li key={ev.id} className="flex gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <Icon className="size-4 stroke-[1.5]" />
                      </span>
                      <div className="flex-1 pt-1">
                        <p className="text-sm font-semibold text-foreground">{ev.label}</p>
                        <p className="text-xs text-muted-foreground">{ev.date}</p>
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </TabsContent>
        </Tabs>
        </div>
        {/* end right column */}
      </div>
      {/* end 2-col layout */}

      {/* Edit sheet */}
      {editOpen && <EditSheet contact={contact} onClose={() => setEditOpen(false)} />}
    </div>
  )
}
