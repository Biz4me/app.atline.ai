'use client'

import { use, useState } from 'react'
import { notFound, useRouter } from 'next/navigation'
import { contacts, discColors } from '@/lib/data'
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
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { cn } from '@/lib/utils'

/* ── Helpers ──────────────────────────────────────────────────── */
const stageLabel: Record<string, string> = {
  chaud: 'Chaud',
  prospect: 'Qualifié',
  client: 'Client',
  partenaire: 'Partenaire',
  nouveau: 'Nouveau',
}

const stagePill: Record<string, string> = {
  chaud: 'bg-red-100 text-red-600',
  prospect: 'bg-amber-100 text-amber-600',
  client: 'bg-green-100 text-green-700',
  partenaire: 'bg-blue-100 text-blue-700',
  nouveau: 'bg-gray-100 text-gray-600',
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

/* Personality names (V15 uses Rouge/Vert/Bleu/Jaune instead of D/I/S/C) */
const personalityName: Record<string, string> = {
  D: 'Rouge',
  I: 'Jaune',
  S: 'Vert',
  C: 'Bleu',
}

const personalityDesc: Record<string, string> = {
  D: 'Direct, orienté résultats — va droit au but.',
  I: 'Sociable, enthousiaste — guidé par l\'émotion.',
  S: 'Stable, relationnel — mise sur la confiance.',
  C: 'Analytique, prudent — veut des preuves.',
}

const personalityBg: Record<string, string> = {
  D: 'bg-red-500',
  I: 'bg-amber-400',
  S: 'bg-green-500',
  C: 'bg-blue-500',
}

const timelineIcons = {
  message: MessageSquare,
  call: PhoneCall,
  note: StickyNote,
  stage: Clock,
  meeting: CalendarPlus,
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

  const [showPersonalityGuide, setShowPersonalityGuide] = useState(false)

  const initials = `${contact.firstName[0]}${contact.lastName[0]}`
  const personality = contact.disc ? personalityName[contact.disc] : null
  const avatarBg = contact.disc ? personalityBg[contact.disc] : 'bg-zinc-400'

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Breadcrumb */}
      <div
        className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-background/90 px-4 py-3 backdrop-blur"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <button type="button" onClick={() => router.back()} className="-ml-1 flex size-9 items-center justify-center rounded-full text-muted-foreground active:bg-muted">
          <ChevronLeft className="size-5 stroke-[1.5]" />
        </button>
        <p className="text-xs text-muted-foreground">
          Contact · <span className="text-foreground">{contact.firstName} {contact.lastName}</span>
        </p>
      </div>

      <div className="flex flex-col gap-5 px-4 pt-6 pb-10">
        {/* Avatar + nom */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className={cn('flex size-20 items-center justify-center rounded-full text-2xl font-bold text-white', avatarBg)}>
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
              {contact.city && (
                <span className="text-sm text-muted-foreground">{contact.city}</span>
              )}
            </div>
          </div>
        </div>

        {/* 3 tiles actions */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: MessageSquare, label: 'Message', href: `/messages/${contact.id}` },
            { icon: PhoneCall, label: 'Appel', href: undefined, action: () => toast.success(`Appel vers ${contact.firstName}`) },
            { icon: CalendarPlus, label: 'RDV', href: '/nova' },
          ].map((tile) => {
            const Icon = tile.icon
            const cls = 'flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-surface py-4 text-center transition-colors active:bg-muted'
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

        {/* 2 boutons larges Simuler + Atlas */}
        <div className="grid grid-cols-2 gap-2">
          <Link
            href={`/aria?contact=${contact.id}`}
            className="flex items-center justify-center gap-2 rounded-2xl bg-primary/10 py-3 text-sm font-bold text-primary transition-colors active:bg-primary/20"
          >
            <Mic className="size-4 stroke-[1.5]" />
            Simuler
          </Link>
          <button
            type="button"
            onClick={() => toast.success('Atlas analyse ce contact…')}
            className="flex items-center justify-center gap-2 rounded-2xl bg-primary/10 py-3 text-sm font-bold text-primary transition-colors active:bg-primary/20"
          >
            <span className="font-display text-base font-bold">A</span>
            Atlas
          </button>
        </div>

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
                  <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white', personalityBg[contact.disc])}>
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
                    onClick={() => toast.info('Modifier le profil')}
                    className="shrink-0 text-xs font-semibold text-primary"
                  >
                    Modifier →
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/50 p-3">
                  <HelpCircle className="size-5 shrink-0 text-muted-foreground stroke-[1.5]" />
                  <span className="flex-1 text-sm text-muted-foreground">Profil de personnalité non défini</span>
                  <button
                    type="button"
                    onClick={() => toast.info('Définir le profil')}
                    className="shrink-0 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground"
                  >
                    Définir le profil
                  </button>
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
    </div>
  )
}
