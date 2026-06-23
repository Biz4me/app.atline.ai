'use client'

import { AppHeader } from '@/components/app-header'
import { Card } from '@/components/card'
import { DiscAvatar } from '@/components/disc-avatar'
import { Bell, UserPlus, MessageCircle, TrendingUp, Award, Mic, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Notif = {
  id: string
  type: 'contact' | 'message' | 'commission' | 'achievement' | 'aria' | 'atlas'
  title: string
  body: string
  time: string
  read: boolean
  avatar?: { first: string; last: string; disc: 'D' | 'I' | 'S' | 'C' | null }
  icon?: typeof Bell
  iconColor?: string
}

const notifications: Notif[] = [
  {
    id: 'n1',
    type: 'contact',
    title: 'Julie Fontaine a répondu',
    body: "Coucou ! J'ai vu ta story sur ta routine, ça m'intéresse trop.",
    time: 'Il y a 15 min',
    read: false,
    avatar: { first: 'Julie', last: 'Fontaine', disc: 'I' },
  },
  {
    id: 'n2',
    type: 'atlas',
    title: 'Atlas · Rappel',
    body: "Tu as 3 contacts chauds sans relance depuis 2 jours. C'est le bon moment.",
    time: 'Il y a 1 h',
    read: false,
    icon: Bell,
    iconColor: 'bg-primary/10 text-primary',
  },
  {
    id: 'n3',
    type: 'contact',
    title: "Marc Lemaire s'est inscrit",
    body: 'Marc a rejoint via ton lien de parrainage. Prends contact rapidement !',
    time: 'Il y a 2 h',
    read: false,
    avatar: { first: 'Marc', last: 'Lemaire', disc: 'C' },
    icon: UserPlus,
  },
  {
    id: 'n4',
    type: 'commission',
    title: 'Nouvelle commission N1',
    body: 'Sophie Lefèvre a généré 180 pts de volume ce mois. +27 € sur ton compte.',
    time: 'Hier · 18:30',
    read: true,
    icon: TrendingUp,
    iconColor: 'bg-success/10 text-success',
  },
  {
    id: 'n5',
    type: 'achievement',
    title: 'Objectif atteint !',
    body: 'Tu as complété le module "Méthode DISC" à 60%. Continue sur ta lancée !',
    time: 'Hier · 14:00',
    read: true,
    icon: Award,
    iconColor: 'bg-amber-50 text-amber-500',
  },
  {
    id: 'n6',
    type: 'aria',
    title: 'ARIA · Entraînement disponible',
    body: "Tu n'as pas simulé d'appel depuis 3 jours. Prépare ta prochaine conversation.",
    time: 'Il y a 2 j',
    read: true,
    icon: Mic,
    iconColor: 'bg-violet-50 text-violet-600',
  },
  {
    id: 'n7',
    type: 'contact',
    title: 'Nadia Benali',
    body: 'Énergie incroyable dans ton dernier vocal. Je suis partante pour en savoir plus !',
    time: 'Il y a 2 j',
    read: true,
    avatar: { first: 'Nadia', last: 'Benali', disc: 'I' },
  },
  {
    id: 'n8',
    type: 'commission',
    title: 'Fast Start validé',
    body: 'Marc Lemaire a atteint son premier palier. Bonus Fast Start de 200 € crédité.',
    time: 'Il y a 3 j',
    read: true,
    icon: CheckCircle2,
    iconColor: 'bg-success/10 text-success',
  },
]

function NotifList({ unreadCount }: { unreadCount: number }) {
  return (
    <div className="flex flex-col gap-4">
      {unreadCount > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">{unreadCount} non lues</p>
          <button type="button" className="text-xs font-semibold text-primary">
            Tout marquer comme lu
          </button>
        </div>
      )}

      <Card className="divide-y divide-border p-0">
        {notifications.map((notif) => (
          <button
            key={notif.id}
            type="button"
            className={cn(
              'flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors active:bg-muted',
              !notif.read && 'bg-primary/[0.03]'
            )}
          >
            {notif.avatar ? (
              <div className="relative shrink-0">
                <DiscAvatar firstName={notif.avatar.first} lastName={notif.avatar.last} disc={notif.avatar.disc} size="sm" />
                {notif.icon && (
                  <span className={cn('absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full ring-2 ring-background', notif.iconColor ?? 'bg-muted text-muted-foreground')}>
                    <notif.icon className="size-3 stroke-2" />
                  </span>
                )}
              </div>
            ) : (
              <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl', notif.iconColor ?? 'bg-muted text-muted-foreground')}>
                {notif.icon && <notif.icon className="size-5 stroke-[1.5]" />}
              </span>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className={cn('text-sm', !notif.read ? 'font-bold text-foreground' : 'font-semibold text-foreground')}>
                  {notif.title}
                </p>
                {!notif.read && (
                  <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground text-pretty line-clamp-2">{notif.body}</p>
              <p className="mt-1 text-xs text-muted-foreground">{notif.time}</p>
            </div>
          </button>
        ))}
      </Card>
    </div>
  )
}

export default function NotificationsPage() {
  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <>
      {/* ── MOBILE ONLY ── */}
      <div className="lg:hidden">
        <AppHeader title="Notifications" back showActions={false} />
        <div className="px-4 pt-4 pb-8">
          <NotifList unreadCount={unreadCount} />
        </div>
      </div>

      {/* ── DESKTOP ONLY ── */}
      <div className="hidden lg:block">
        <div className="px-8 pt-8 pb-8 max-w-2xl mx-auto">
          <NotifList unreadCount={unreadCount} />
        </div>
      </div>
    </>
  )
}
