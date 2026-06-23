'use client'

import { use, useState } from 'react'
import { notFound, useRouter } from 'next/navigation'
import { contacts } from '@/lib/data'
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
  MapPin,
  Tag,
  Star,
  TrendingUp,
  Users,
  BookOpen,
  Zap,
  ShoppingBag,
  RefreshCw,
  ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { ContactStage } from '@/lib/types'
import { Card } from '@/components/card'

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
  D: "Direct, orienté résultats — va droit au but.",
  I: "Sociable, enthousiaste — guidé par l'émotion.",
  S: "Stable, relationnel — mise sur la confiance.",
  C: "Analytique, prudent — veut des preuves.",
}
const personalityApproach: Record<string, string> = {
  D: "Sois direct, présente les résultats chiffrés. Évite les détails inutiles.",
  I: "Mise sur l'enthousiasme et la vision. Raconte des histoires inspirantes.",
  S: "Prends le temps de créer la confiance. Sois constant et rassurant.",
  C: "Apporte des preuves, des données, des témoignages. Anticipe ses questions.",
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
  const labelCls = 'mb-1.5 block text-xs font-bold uppercase tracking-widest text-muted-foreground'

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="max-h-[92dvh] overflow-y-auto rounded-t-3xl bg-background">
        <div className="sticky top-0 z-10 bg-background pt-3 pb-0">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
          <div className="flex items-center gap-2 border-b border-border px-4 pb-3">
            <button type="button" onClick={onClose} className="text-sm font-medium text-muted-foreground">Annuler</button>
            <h2 className="flex-1 text-center text-sm font-bold text-foreground">Modifier le contact</h2>
            <button type="button" onClick={handleSave} className="rounded-xl bg-primary px-4 py-1.5 text-sm font-bold text-primary-foreground">Enregistrer</button>
          </div>
        </div>
        <div className="flex flex-col gap-5 px-4 py-5 pb-10">
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
          <div>
            <label className={labelCls}>Statut</label>
            <div className="flex gap-2">
              {statutOptions.map((s) => (
                <button key={s} type="button" onClick={() => setStatut(s)}
                  className={cn('flex-1 rounded-xl py-2.5 text-sm font-bold transition-colors',
                    statut === s ? 'bg-primary text-primary-foreground' : 'border border-border bg-surface text-foreground')}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls}>Stage</label>
            <div className="flex flex-wrap gap-2">
              {stagesByStatut[statut].map((s) => (
                <button key={s.label} type="button" onClick={() => setStage(s.id)}
                  className={cn('rounded-xl border px-4 py-2 text-sm font-bold transition-colors',
                    stage === s.id && stagesByStatut[statut].find(x => x.id === stage)?.label === s.label ? s.color : 'border-border bg-surface text-foreground')}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div><label className={labelCls}>Ville</label><input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Paris" className={inputCls} /></div>
          <div><label className={labelCls}>Téléphone</label><input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" placeholder="+33 6 00 00 00 00" className={inputCls} /></div>
          <div><label className={labelCls}>Email</label><input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="contact@email.fr" className={inputCls} /></div>
          <div><label className={labelCls}>Source</label><input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Instagram, LinkedIn…" className={inputCls} /></div>
          <div>
            <label className={labelCls}>Profil DISC</label>
            <div className="flex gap-2">
              {discOptions.map((d) => (
                <button key={d.key} type="button" onClick={() => setDisc(disc === d.key ? '' : d.key)}
                  className={cn('flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-bold transition-all',
                    disc === d.key ? 'border-foreground bg-surface text-foreground shadow-sm' : 'border-border bg-surface text-foreground')}>
                  <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls}>Note libre</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note libre..." rows={4} className={cn(inputCls, 'resize-none')} />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Section card ─────────────────────────────────────────────── */
function SectionCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="flex flex-col overflow-hidden shrink-0">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <p className="text-xs font-bold text-foreground">{title}</p>
        {action}
      </div>
      <div className="px-5 py-4">{children}</div>
    </Card>
  )
}

/* ── Page ──────────────────────────────────────────────────────── */
export default function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const contact = contacts.find((c) => c.id === id)
  if (!contact) notFound()

  const [editOpen, setEditOpen] = useState(false)
  const [notesEditing, setNotesEditing] = useState(false)
  const [notesValue, setNotesValue] = useState(contact.notes ?? '')

  const initials = `${contact.firstName[0]}${contact.lastName[0]}`
  const avatarBg = contact.disc ? personalityBg[contact.disc] : undefined
  const statut = getStatut(contact.stage)

  const actionTiles = [
    { icon: MessageSquare, label: 'Message', href: `/messages/${contact.id}` },
    { icon: PhoneCall,    label: 'Appel',   href: undefined, action: () => toast.success(`Appel vers ${contact.firstName}`) },
    { icon: CalendarPlus, label: 'RDV',     href: undefined, action: () => toast.success('Planifier un RDV') },
  ]

  const mockAppointments = [
    { id: '1', title: "Présentation de l'opportunité", date: '24 juin 2026 · 14h00', type: 'VISIO', done: false },
    { id: '2', title: 'Suivi post-présentation', date: '18 juin 2026 · 10h30', type: 'CALL', done: true, outcome: 'POSITIF' },
  ]
  const mockAtlasSessions = [
    { id: '1', title: "Stratégie d'approche DISC Jaune", date: "Auj. · 09:12", summary: "Atlas a analysé le profil et suggéré une approche émotionnelle." },
    { id: '2', title: 'Script invitation personnalisé', date: 'Hier · 16:45', summary: "Préparation du message d'invitation adapté au profil I." },
  ]
  const mockSimSessions = [
    { id: '1', phase: 'INVITATION', score: 8, date: 'Hier · 18:30', character: 'Sophie 34' },
  ]

  const isPartenaire = contact.stage === 'partenaire'
  const isClient = contact.stage === 'client'

  const mockPartnerExtra = {
    status: 'ENROUTE', onAtline: true, simSessions: 4, courseDone: 2, prospects: 12,
    volume: 340, scoreAtline: 72,
  }
  const mockClientExtra = {
    panier: 85, frequency: 'Mensuel', lastBuy: 'Il y a 3 semaines', reassortDue: true,
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">

      {/* ── MOBILE ONLY — ne jamais toucher ── */}
      <div className="lg:hidden">
        <div className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-background/90 px-4 py-3 backdrop-blur"
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
          <button type="button" onClick={() => router.back()} className="-ml-1 flex size-9 items-center justify-center rounded-full text-muted-foreground active:bg-muted">
            <ChevronLeft className="size-5 stroke-[1.5]" />
          </button>
          <p className="flex-1 text-center text-sm font-medium text-muted-foreground">{statut}</p>
          <button type="button" onClick={() => setEditOpen(true)} className="flex size-9 items-center justify-center rounded-full text-muted-foreground active:bg-muted">
            <Pencil className="size-4 stroke-[1.5]" />
          </button>
        </div>
        <div className="flex flex-col gap-5 px-4 pt-6 pb-10">
          <p className="text-center text-sm text-muted-foreground">Vue mobile — voir desktop pour la fiche complète.</p>
        </div>
      </div>

      {/* ── DESKTOP ONLY ── */}
      <div className="hidden lg:flex flex-col h-[calc(100dvh-56px)] overflow-hidden bg-muted/40 px-8 pt-8 pb-8 gap-4">

        {/* Header */}
        <div className="flex items-center gap-3 shrink-0">
          <button type="button" onClick={() => router.back()}
            className="flex size-8 items-center justify-center rounded-xl border border-border bg-surface text-muted-foreground hover:bg-muted transition-colors">
            <ChevronLeft className="size-4 stroke-[1.5]" />
          </button>
          <h1 className="text-sm font-bold text-foreground flex-1">{contact.firstName} {contact.lastName}</h1>
          <span className={cn('rounded-full px-3 py-1 text-xs font-bold', stagePill[contact.stage] ?? 'bg-muted text-muted-foreground')}>
            {stageLabel[contact.stage] ?? contact.stage}
          </span>
          <button type="button" onClick={() => setEditOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors">
            <Pencil className="size-3.5 stroke-[1.5]" />
            Modifier
          </button>
        </div>

        {/* Grid 2 colonnes */}
        <div className="grid grid-cols-[300px_1fr] gap-4 flex-1 min-h-0 overflow-hidden">

          {/* ── GAUCHE : identité ── */}
          <Card className="flex flex-col overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

            {/* Avatar */}
            <div className="flex flex-col items-center gap-2 px-5 pt-6 pb-5 shrink-0">
              <div className="flex size-16 items-center justify-center rounded-full text-xl font-bold text-white bg-muted"
                style={avatarBg ? { backgroundColor: avatarBg } : undefined}>
                {initials}
              </div>
              {contact.city && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="size-3 stroke-[1.5]" />
                  {contact.city}
                </div>
              )}
            </div>

            {/* Actions rapides */}
            <div className="grid grid-cols-3 gap-2 px-4 pb-4 shrink-0">
              {actionTiles.map((tile) => {
                const Icon = tile.icon
                const cls = 'flex flex-col items-center gap-1.5 rounded-xl border border-border bg-background py-3 text-center transition-colors hover:bg-muted/40'
                if (tile.href) return (
                  <Link key={tile.label} href={tile.href} className={cls}>
                    <Icon className="size-4 stroke-[1.5] text-primary" />
                    <span className="text-xs font-medium text-foreground">{tile.label}</span>
                  </Link>
                )
                return (
                  <button key={tile.label} type="button" onClick={tile.action} className={cls}>
                    <Icon className="size-4 stroke-[1.5] text-primary" />
                    <span className="text-xs font-medium text-foreground">{tile.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Simuler + Atlas */}
            <div className="grid grid-cols-2 gap-2 px-4 pb-4 shrink-0">
              <Link href={`/aria?contact=${contact.id}`}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-[#14B8A6]/10 py-2.5 text-xs font-bold text-[#14B8A6] transition-colors hover:bg-[#14B8A6]/15">
                <Mic className="size-3.5 stroke-[1.5]" />
                Simuler
              </Link>
              <button type="button" onClick={() => toast.success("Atlas analyse ce contact…")}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-primary/10 py-2.5 text-xs font-bold text-primary transition-colors hover:bg-primary/15">
                <span className="font-bold text-sm leading-none">A</span>
                Atlas
              </button>
            </div>

            {/* Coordonnées */}
            <div className="border-t border-border">
              <p className="px-5 pt-4 pb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Coordonnées</p>
              <div className="flex flex-col divide-y divide-border px-1 pb-2">
                {contact.phone && (
                  <div className="flex items-center gap-3 px-4 py-2.5">
                    <Phone className="size-3.5 shrink-0 stroke-[1.5] text-muted-foreground" />
                    <a href={`tel:${contact.phone}`} className="text-xs font-medium text-primary truncate">{contact.phone}</a>
                  </div>
                )}
                {contact.email && (
                  <div className="flex items-center gap-3 px-4 py-2.5">
                    <Mail className="size-3.5 shrink-0 stroke-[1.5] text-muted-foreground" />
                    <span className="text-xs text-muted-foreground truncate">{contact.email}</span>
                  </div>
                )}
                {contact.source && (
                  <div className="flex items-center gap-3 px-4 py-2.5">
                    <Link2 className="size-3.5 shrink-0 stroke-[1.5] text-muted-foreground" />
                    <span className={cn('text-xs font-medium truncate', sourceColor(contact.source))}>{contact.source}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 px-4 py-2.5">
                  <Clock className="size-3.5 shrink-0 stroke-[1.5] text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Dernier · <span className="font-medium text-foreground">{contact.lastInteraction}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* DISC */}
            <div className="border-t border-border">
              <p className="px-5 pt-4 pb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Personnalité</p>
              <div className="px-4 pb-4">
                {contact.disc ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
                        style={{ backgroundColor: personalityBg[contact.disc] }}>
                        {personalityName[contact.disc][0]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground">{personalityName[contact.disc]}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{personalityDesc[contact.disc]}</p>
                      </div>
                    </div>
                    <div className="rounded-xl bg-muted/50 px-3 py-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Comment approcher</p>
                      <p className="text-xs text-foreground leading-relaxed">{personalityApproach[contact.disc]}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 rounded-xl border border-dashed border-border p-3">
                    <HelpCircle className="size-4 shrink-0 text-muted-foreground stroke-[1.5]" />
                    <Link href={`/disc-quiz/${contact.id}`} className="flex-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                      Définir le profil DISC →
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Score + Tags */}
            <div className="border-t border-border">
              <p className="px-5 pt-4 pb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Profil</p>
              <div className="px-4 pb-5 flex flex-col gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs text-muted-foreground">Score de chaleur</p>
                    <p className="text-xs font-bold text-foreground">72 / 100</p>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: '72%' }} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {['Motivé', 'Réseau social', 'Parent'].map((tag) => (
                    <span key={tag} className="rounded-lg bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">{tag}</span>
                  ))}
                  <button type="button" className="rounded-lg border border-dashed border-border px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
                    + Tag
                  </button>
                </div>
              </div>
            </div>

          </Card>

          {/* ── DROITE : activité ── */}
          <div className="flex flex-col gap-4 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

            {/* 1. Notes */}
            <Card className="flex flex-col overflow-hidden shrink-0">
              <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                <p className="text-xs font-bold text-foreground">Notes</p>
                {notesEditing ? (
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setNotesEditing(false)} className="text-xs font-medium text-muted-foreground">Annuler</button>
                    <button type="button" onClick={() => { toast.success('Note enregistrée'); setNotesEditing(false) }}
                      className="rounded-lg bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">Enregistrer</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setNotesEditing(true)} className="text-xs font-medium text-primary">
                    <Pencil className="size-3 inline mr-1" />Modifier
                  </button>
                )}
              </div>
              <div className="px-5 py-4 min-h-[72px]">
                {notesEditing ? (
                  <textarea value={notesValue} onChange={(e) => setNotesValue(e.target.value)}
                    placeholder="Ajoute un contexte pour mieux suivre ce contact..."
                    rows={3}
                    className="w-full resize-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground leading-relaxed" autoFocus />
                ) : notesValue ? (
                  <p className="text-sm leading-relaxed text-muted-foreground">{notesValue}</p>
                ) : (
                  <button type="button" onClick={() => setNotesEditing(true)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    + Ajouter une note
                  </button>
                )}
              </div>
            </Card>

            {/* 2. Rendez-vous */}
            <SectionCard title="Rendez-vous" action={
              <button type="button" onClick={() => toast.success('Planifier un RDV')}
                className="rounded-lg bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                + Planifier
              </button>
            }>
              {mockAppointments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun rendez-vous planifié.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {mockAppointments.map((appt) => (
                    <div key={appt.id} className={cn('flex items-center gap-3 rounded-xl border px-4 py-3',
                      appt.done ? 'border-border bg-muted/30' : 'border-border bg-background')}>
                      <CalendarPlus className={cn('size-4 shrink-0 stroke-[1.5]', appt.done ? 'text-muted-foreground' : 'text-primary')} />
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm font-medium', appt.done ? 'text-muted-foreground line-through' : 'text-foreground')}>{appt.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{appt.date} · {appt.type}</p>
                      </div>
                      {appt.outcome && (
                        <span className="text-xs font-bold text-success">{appt.outcome}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* 3. Messagerie */}
            <SectionCard title="Messagerie" action={
              <Link href={`/messages/${contact.id}`} className="text-xs font-medium text-primary">Voir tout →</Link>
            }>
              <div className="flex flex-col gap-2">
                {contact.timeline.filter(e => e.type === 'message').length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun message échangé.</p>
                ) : (
                  contact.timeline.filter(e => e.type === 'message').slice(0, 3).map((ev) => (
                    <div key={ev.id} className="flex items-start gap-3 rounded-xl border border-border bg-background px-4 py-3">
                      <MessageSquare className="size-4 shrink-0 stroke-[1.5] text-muted-foreground mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground leading-relaxed">{ev.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{ev.date}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </SectionCard>

            {/* 4. Sessions Atlas */}
            <SectionCard title="Sessions Atlas" action={
              <Link href="/atlas" className="text-xs font-medium text-primary">Nouvelle session →</Link>
            }>
              <div className="flex flex-col gap-2">
                {mockAtlasSessions.map((session) => (
                  <div key={session.id} className="flex items-start gap-3 rounded-xl border border-border bg-background px-4 py-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">A</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{session.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{session.date}</p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* 5. Simulations ARIA */}
            <SectionCard title="Simulations ARIA" action={
              <Link href={`/aria?contact=${contact.id}`} className="text-xs font-medium text-[#14B8A6]">Simuler →</Link>
            }>
              {mockSimSessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune simulation réalisée avec ce contact.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {mockSimSessions.map((sim) => (
                    <div key={sim.id} className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3">
                      <Mic className="size-4 shrink-0 stroke-[1.5] text-[#14B8A6]" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">Phase {sim.phase} · {sim.character}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{sim.date}</p>
                      </div>
                      <span className="flex size-8 items-center justify-center rounded-full bg-success/10 text-xs font-bold text-success">{sim.score}</span>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* 6. Activité partenaire (si partenaire) */}
            {isPartenaire && (
              <SectionCard title="Activité partenaire">
                <div className="grid grid-cols-3 gap-3 mb-3">
                  {[
                    { icon: TrendingUp, label: 'Score Atline', value: String(mockPartnerExtra.scoreAtline) },
                    { icon: Users,      label: 'Prospects',   value: String(mockPartnerExtra.prospects) },
                    { icon: BookOpen,   label: 'Modules',     value: String(mockPartnerExtra.courseDone) },
                  ].map((kpi) => {
                    const Icon = kpi.icon
                    return (
                      <div key={kpi.label} className="rounded-xl border border-border bg-background px-3 py-3 text-center">
                        <Icon className="size-4 text-muted-foreground mx-auto mb-1 stroke-[1.5]" />
                        <p className="text-sm font-bold text-foreground">{kpi.value}</p>
                        <p className="text-xs text-muted-foreground">{kpi.label}</p>
                      </div>
                    )
                  })}
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Zap className="size-4 stroke-[1.5] text-primary" />
                    <span className="text-sm font-medium text-foreground">Statut</span>
                  </div>
                  <span className="text-xs font-bold text-primary">{mockPartnerExtra.status}</span>
                </div>
                <div className="mt-2 flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Star className="size-4 stroke-[1.5] text-primary" />
                    <span className="text-sm font-medium text-foreground">Sur Atline</span>
                  </div>
                  <span className={cn('text-xs font-bold', mockPartnerExtra.onAtline ? 'text-success' : 'text-muted-foreground')}>
                    {mockPartnerExtra.onAtline ? 'Oui' : 'Non'}
                  </span>
                </div>
              </SectionCard>
            )}

            {/* 7. Données client (si client) */}
            {isClient && (
              <SectionCard title="Données client">
                <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-background overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="size-4 shrink-0 stroke-[1.5] text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Panier moyen</span>
                    </div>
                    <span className="text-sm font-bold text-foreground">{mockClientExtra.panier} €</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="size-4 shrink-0 stroke-[1.5] text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Fréquence</span>
                    </div>
                    <span className="text-sm font-medium text-foreground">{mockClientExtra.frequency}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Clock className="size-4 shrink-0 stroke-[1.5] text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Dernier achat</span>
                    </div>
                    <span className="text-sm font-medium text-foreground">{mockClientExtra.lastBuy}</span>
                  </div>
                  {mockClientExtra.reassortDue && (
                    <div className="flex items-center gap-3 px-4 py-3 bg-primary/5">
                      <RefreshCw className="size-4 shrink-0 stroke-[1.5] text-primary" />
                      <span className="text-xs font-bold text-primary">Réassort à prévoir</span>
                    </div>
                  )}
                </div>
              </SectionCard>
            )}

            {/* 8. Historique */}
            <SectionCard title="Historique">
              {contact.timeline.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune interaction pour le moment.</p>
              ) : (
                <ol className="flex flex-col">
                  {contact.timeline.map((ev, i) => {
                    const Icon = timelineIcons[ev.type]
                    return (
                      <li key={ev.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                            <Icon className="size-3.5 stroke-[1.5]" />
                          </span>
                          {i < contact.timeline.length - 1 && <div className="w-px flex-1 bg-border mt-1 mb-1" />}
                        </div>
                        <div className="flex-1 pb-4 pt-1">
                          <p className="text-sm font-medium text-foreground">{ev.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{ev.date}</p>
                        </div>
                      </li>
                    )
                  })}
                </ol>
              )}
            </SectionCard>

          </div>
        </div>
      </div>

      {editOpen && <EditSheet contact={contact} onClose={() => setEditOpen(false)} />}
    </div>
  )
}
