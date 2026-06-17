'use client'

import { use } from 'react'
import { notFound } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { AppHeader } from '@/components/app-header'
import { DiscAvatar } from '@/components/disc-avatar'
import { StagePill } from '@/components/pills'
import { Card } from '@/components/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { contacts, discLabels, discColors } from '@/lib/data'
import {
  Phone,
  Mail,
  MessageSquare,
  PhoneCall,
  CalendarPlus,
  Mic,
  Sparkles,
  MapPin,
  Link2,
  CalendarClock,
  StickyNote,
} from 'lucide-react'
import { toast } from 'sonner'

const discDescriptions: Record<string, string> = {
  D: 'Direct, orienté résultats. Va droit au but, décide vite.',
  I: 'Enthousiaste, influent. Cherche le lien humain avant tout.',
  S: 'Stable, fiable. A besoin de temps et de confiance.',
  C: 'Analytique, précis. Veut les faits avant de décider.',
}

const timelineIcons = {
  message: MessageSquare,
  call: PhoneCall,
  note: StickyNote,
  stage: CalendarClock,
  meeting: CalendarPlus,
}

export default function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const contact = contacts.find((c) => c.id === id)
  if (!contact) notFound()

  return (
    <>
      <AppHeader title="Fiche contact" back showActions={false} />

      <div className="flex flex-col gap-5 px-4 pt-5 pb-8">
        {/* Header centré */}
        <div className="flex flex-col items-center gap-2 text-center">
          <DiscAvatar
            firstName={contact.firstName}
            lastName={contact.lastName}
            disc={contact.disc}
            size="xl"
          />
          <h2 className="font-display text-2xl font-semibold text-foreground">
            {contact.firstName} {contact.lastName}
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <StagePill stage={contact.stage} />
            {contact.city && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3" />
                {contact.city}
              </span>
            )}
          </div>
        </div>

        {/* 3 action tiles */}
        <div className="grid grid-cols-3 gap-2">
          <ActionTile
            icon={MessageSquare}
            label="Message"
            onClick={() => toast.success('Ouvrir messagerie')}
          />
          <ActionTile
            icon={PhoneCall}
            label="Appel"
            onClick={() => toast.success(`Appel vers ${contact.phone ?? contact.firstName}`)}
          />
          <ActionTile
            icon={CalendarPlus}
            label="RDV"
            onClick={() => toast.success('Planifier un rendez-vous')}
          />
        </div>

        {/* 2 boutons IA orange-soft */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => router.push('/aria')}
            className="flex items-center justify-center gap-2 rounded-2xl bg-primary/10 px-3 py-3 text-sm font-bold text-primary transition-colors active:bg-primary/20"
          >
            <Mic className="size-4 stroke-2" />
            Simuler ARIA
          </button>
          <button
            type="button"
            onClick={() => toast.success('Atlas analyse ce contact…')}
            className="flex items-center justify-center gap-2 rounded-2xl bg-primary/10 px-3 py-3 text-sm font-bold text-primary transition-colors active:bg-primary/20"
          >
            <Sparkles className="size-4 stroke-2" />
            Atlas
          </button>
        </div>

        {/* 3 tabs */}
        <Tabs defaultValue="infos">
          <TabsList className="grid w-full grid-cols-3 rounded-xl bg-muted p-1">
            <TabsTrigger value="infos">Infos</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="historique">Historique</TabsTrigger>
          </TabsList>

          {/* Infos */}
          <TabsContent value="infos" className="mt-4 flex flex-col gap-3">
            {contact.disc && (
              <Card className="p-4">
                <div className="flex items-start gap-3">
                  <span
                    className="flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
                    style={{ backgroundColor: discColors[contact.disc] }}
                  >
                    {contact.disc}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">
                      Profil {discLabels[contact.disc]}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                      {discDescriptions[contact.disc]}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 text-xs font-semibold text-primary"
                    onClick={() => toast.info('Modifier le profil DISC')}
                  >
                    Modifier
                  </button>
                </div>
              </Card>
            )}

            <Card className="divide-y divide-border">
              <InfoRow icon={Phone} label="Téléphone" value={contact.phone ?? '—'} />
              <InfoRow icon={Mail} label="Email" value={contact.email ?? '—'} />
              <InfoRow icon={Link2} label="Source" value={contact.source} />
              <InfoRow
                icon={CalendarClock}
                label="Dernier contact"
                value={contact.lastInteraction}
              />
            </Card>
          </TabsContent>

          {/* Notes */}
          <TabsContent value="notes" className="mt-4">
            {contact.notes ? (
              <Card className="p-4">
                <p className="text-sm leading-relaxed text-fg-2">{contact.notes}</p>
              </Card>
            ) : (
              <EmptyBlock text="Aucune note. Ajoute un contexte pour mieux le suivre." />
            )}
          </TabsContent>

          {/* Historique */}
          <TabsContent value="historique" className="mt-4">
            {contact.timeline.length === 0 ? (
              <EmptyBlock text="Aucune interaction pour le moment." />
            ) : (
              <ol className="flex flex-col gap-4">
                {contact.timeline.map((ev) => {
                  const Icon = timelineIcons[ev.type]
                  return (
                    <li key={ev.id} className="flex gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                        <Icon className="size-4 stroke-[1.5]" />
                      </span>
                      <div className="flex-1 pt-0.5">
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
    </>
  )
}

function ActionTile({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof MessageSquare
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-surface py-4 text-center shadow-card transition-colors active:bg-muted"
    >
      <Icon className="size-5 stroke-[1.5] text-muted-foreground" />
      <span className="text-xs font-semibold text-foreground">{label}</span>
    </button>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Phone
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3 p-4">
      <Icon className="size-4 shrink-0 stroke-[1.5] text-muted-foreground" />
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="ml-auto truncate text-sm font-semibold text-foreground">{value}</span>
    </div>
  )
}

function EmptyBlock({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-10 text-center">
      <p className="text-sm text-muted-foreground text-pretty">{text}</p>
    </div>
  )
}
