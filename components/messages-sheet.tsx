'use client'

import { useRouter } from 'next/navigation'
import { X, MessageSquare, Phone, Camera, Globe } from 'lucide-react'
import { DiscAvatar } from '@/components/disc-avatar'
import { cn } from '@/lib/utils'

/* ── Data ───────────────────────────────────────────────────── */
type Channel = 'whatsapp' | 'sms' | 'instagram' | 'facebook'

const channelConfig: Record<Channel, { icon: typeof MessageSquare; color: string }> = {
  whatsapp:  { icon: MessageSquare, color: '#25D366' },
  sms:       { icon: Phone,         color: '#3B82F6' },
  instagram: { icon: Camera,        color: '#E1306C' },
  facebook:  { icon: Globe,         color: '#1877F2' },
}

const conversations = [
  {
    id: 'c1',
    firstName: 'Thomas', lastName: 'Bernard', disc: 'D' as const,
    channel: 'whatsapp' as Channel,
    lastMessage: 'Oui je suis disponible vendredi matin, ça marche pour moi !',
    time: 'Il y a 2 h', unread: 2,
  },
  {
    id: 'c7',
    firstName: 'Nadia', lastName: 'Benali', disc: 'I' as const,
    channel: 'instagram' as Channel,
    lastMessage: 'Énergie incroyable dans ton dernier vocal. Je suis partante pour en savoir plus !',
    time: 'Il y a 4 h', unread: 1,
  },
  {
    id: 'c2',
    firstName: 'Camille', lastName: 'Dubois', disc: 'I' as const,
    channel: 'facebook' as Channel,
    lastMessage: 'Adore le côté communauté. À bientôt !',
    time: 'Hier', unread: 0,
  },
  {
    id: 'c4',
    firstName: 'Sophie', lastName: 'Lefèvre', disc: 'C' as const,
    channel: 'whatsapp' as Channel,
    lastMessage: "J'ai besoin des chiffres de volume pour ce mois. Tu peux m'envoyer ?",
    time: 'Hier', unread: 0,
  },
  {
    id: 'c3',
    firstName: 'Karim', lastName: 'Haddad', disc: 'S' as const,
    channel: 'sms' as Channel,
    lastMessage: 'Merci pour le suivi, tout se passe bien de mon côté.',
    time: 'Il y a 3 j', unread: 0,
  },
  {
    id: 'c5',
    firstName: 'Lucas', lastName: 'Petit', disc: null as null,
    channel: 'instagram' as Channel,
    lastMessage: "Salut, c'est quoi exactement Atline ?",
    time: 'Il y a 5 j', unread: 0,
  },
]

/* ── Component ──────────────────────────────────────────────── */
interface MessagesSheetProps {
  open: boolean
  onClose: () => void
}

export function MessagesSheet({ open, onClose }: MessagesSheetProps) {
  const router = useRouter()
  if (!open) return null

  const openConv = (id: string) => {
    onClose()
    router.push(`/messages/${id}`)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[49] bg-black/40"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed inset-x-0 bottom-0 z-[50] mx-auto flex max-w-[480px] flex-col overflow-hidden rounded-t-[24px] bg-background"
        style={{ height: '80%', boxShadow: '0 -12px 40px rgba(0,0,0,0.25)' }}
      >
        {/* Drag handle */}
        <div className="flex shrink-0 justify-center pb-1 pt-2.5">
          <div className="h-[5px] w-[42px] rounded-full bg-muted opacity-50" />
        </div>

        {/* Header */}
        <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full text-foreground active:bg-muted"
          >
            <X className="size-[19px] stroke-[1.5]" />
          </button>
          <h2 className="flex-1 font-display text-lg font-bold text-foreground">Messagerie</h2>
          {/* Unread total badge */}
          <span className="flex min-w-[20px] h-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">
            3
          </span>
        </div>

        {/* List */}
        <div className="flex flex-1 flex-col overflow-y-auto">
          {conversations.map((conv) => {
            const chan = channelConfig[conv.channel]
            const ChanIcon = chan.icon

            return (
              <button
                key={conv.id}
                type="button"
                onClick={() => openConv(conv.id)}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-muted',
                  conv.unread > 0 && 'bg-primary/[0.03]'
                )}
              >
                {/* Avatar + canal badge */}
                <div className="relative shrink-0">
                  <DiscAvatar firstName={conv.firstName} lastName={conv.lastName} disc={conv.disc} />
                  <div className="absolute -bottom-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full border-2 border-background bg-background">
                    <ChanIcon className="size-2.5" style={{ color: chan.color }} strokeWidth={2.5} />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn('text-lg', conv.unread > 0 ? 'font-bold text-foreground' : 'font-semibold text-foreground')}>
                      {conv.firstName} {conv.lastName}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{conv.time}</span>
                  </div>
                  <p className={cn('mt-0.5 truncate text-xs', conv.unread > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                    {conv.lastMessage}
                  </p>
                </div>

                {/* Unread badge */}
                {conv.unread > 0 && (
                  <span className="ml-1 flex min-w-[20px] h-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">
                    {conv.unread}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
