'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, MessageSquare, Phone, Camera, Globe, Send } from 'lucide-react'
import { DiscAvatar } from '@/components/disc-avatar'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

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
    messages: [
      { from: 'them', text: 'Salut ! Tu peux me rappeler c\'est pour quoi exactement ?' },
      { from: 'me', text: 'Bonjour Thomas ! Je voulais te parler d\'une opportunité qui pourrait t\'intéresser.' },
      { from: 'them', text: 'Oui je suis disponible vendredi matin, ça marche pour moi !' },
    ],
  },
  {
    id: 'c7',
    firstName: 'Nadia', lastName: 'Benali', disc: 'I' as const,
    channel: 'instagram' as Channel,
    lastMessage: 'Énergie incroyable dans ton dernier vocal. Je suis partante pour en savoir plus !',
    time: 'Il y a 4 h', unread: 1,
    messages: [
      { from: 'them', text: 'Énergie incroyable dans ton dernier vocal. Je suis partante pour en savoir plus !' },
    ],
  },
  {
    id: 'c2',
    firstName: 'Camille', lastName: 'Dubois', disc: 'I' as const,
    channel: 'facebook' as Channel,
    lastMessage: 'Adore le côté communauté. À bientôt !',
    time: 'Hier', unread: 0,
    messages: [
      { from: 'me', text: 'Bonjour Camille, j\'ai vu que tu avais likée ma publication !' },
      { from: 'them', text: 'Adore le côté communauté. À bientôt !' },
    ],
  },
  {
    id: 'c4',
    firstName: 'Sophie', lastName: 'Lefèvre', disc: 'C' as const,
    channel: 'whatsapp' as Channel,
    lastMessage: "J'ai besoin des chiffres de volume pour ce mois. Tu peux m'envoyer ?",
    time: 'Hier', unread: 0,
    messages: [
      { from: 'them', text: "J'ai besoin des chiffres de volume pour ce mois. Tu peux m'envoyer ?" },
    ],
  },
  {
    id: 'c3',
    firstName: 'Karim', lastName: 'Haddad', disc: 'S' as const,
    channel: 'sms' as Channel,
    lastMessage: 'Merci pour le suivi, tout se passe bien de mon côté.',
    time: 'Il y a 3 j', unread: 0,
    messages: [
      { from: 'me', text: 'Salut Karim, comment ça se passe pour toi ce mois-ci ?' },
      { from: 'them', text: 'Merci pour le suivi, tout se passe bien de mon côté.' },
    ],
  },
  {
    id: 'c5',
    firstName: 'Lucas', lastName: 'Petit', disc: null as null,
    channel: 'instagram' as Channel,
    lastMessage: "Salut, c'est quoi exactement Atline ?",
    time: 'Il y a 5 j', unread: 0,
    messages: [
      { from: 'them', text: "Salut, c'est quoi exactement Atline ?" },
    ],
  },
]

export default function MessagesPage() {
  const router = useRouter()
  const [activeId, setActiveId] = useState<string | null>('c1')
  const [draft, setDraft] = useState('')

  const active = conversations.find((c) => c.id === activeId)

  return (
    <div className="flex h-dvh overflow-hidden">

      {/* ── Liste conversations ── */}
      <div className={cn(
        'flex flex-col bg-background border-r border-border',
        'w-full lg:w-72 xl:w-80 shrink-0',
        activeId ? 'hidden lg:flex' : 'flex',
      )}>
        {/* Header */}
        <header
          className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur"
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
        >
          <button
            type="button"
            onClick={() => router.back()}
            className="-ml-1 flex size-9 items-center justify-center rounded-full text-muted-foreground active:bg-muted lg:hidden"
          >
            <ChevronLeft className="size-5 stroke-[1.5]" />
          </button>
          <h1 className="flex-1 font-display text-lg font-bold text-foreground">Messagerie</h1>
        </header>

        {/* List */}
        <div className="flex flex-col gap-0 pt-2 pb-8 overflow-y-auto flex-1">
          {conversations.map((conv) => {
            const chan = channelConfig[conv.channel]
            const ChanIcon = chan.icon

            return (
              <button
                key={conv.id}
                type="button"
                onClick={() => setActiveId(conv.id)}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors',
                  conv.unread > 0 ? 'bg-primary/[0.03]' : '',
                  activeId === conv.id ? 'bg-muted' : 'hover:bg-muted/60 active:bg-muted',
                )}
              >
                <div className="relative shrink-0">
                  <DiscAvatar firstName={conv.firstName} lastName={conv.lastName} disc={conv.disc} />
                  <div className="absolute -bottom-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full border-2 border-background bg-background">
                    <ChanIcon className="size-2.5" style={{ color: chan.color }} strokeWidth={2.5} />
                  </div>
                </div>
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

      {/* ── Zone de conversation (desktop) ── */}
      {active ? (
        <div className={cn(
          'flex flex-col flex-1 min-w-0',
          activeId ? 'flex' : 'hidden lg:flex',
        )}>
          {/* Header conversation */}
          <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3">
            <button
              type="button"
              onClick={() => setActiveId(null)}
              className="lg:hidden flex size-9 items-center justify-center rounded-full text-muted-foreground active:bg-muted"
            >
              <ChevronLeft className="size-5 stroke-[1.5]" />
            </button>
            <DiscAvatar firstName={active.firstName} lastName={active.lastName} disc={active.disc} />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground">{active.firstName} {active.lastName}</p>
              <p className="text-xs text-muted-foreground capitalize">{active.channel}</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-5 lg:px-6">
            {active.messages.map((m, i) => (
              <div key={i} className={cn('flex', m.from === 'me' ? 'justify-end' : 'justify-start')}>
                <div className={cn(
                  'max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-[1.55]',
                  m.from === 'me'
                    ? 'rounded-br-md bg-primary text-primary-foreground'
                    : 'rounded-bl-md bg-muted text-foreground',
                )}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="shrink-0 border-t border-border px-4 py-3 lg:px-6">
            <div className="flex items-end gap-2 rounded-2xl border border-border bg-surface px-4 py-2">
              <textarea
                rows={1}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={`Répondre à ${active.firstName}…`}
                className="flex-1 resize-none bg-transparent text-sm leading-[1.4] text-foreground outline-none placeholder:text-muted-foreground"
                style={{ maxHeight: 120, paddingTop: 7, paddingBottom: 7 }}
              />
              <button
                type="button"
                onClick={() => { toast.success('Message envoyé'); setDraft('') }}
                className="mb-[5px] flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm hover:opacity-90 transition-opacity"
              >
                <Send className="size-[17px] stroke-[1.5]" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty state desktop */
        <div className="hidden lg:flex flex-1 items-center justify-center text-muted-foreground">
          <div className="text-center">
            <MessageSquare className="size-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Sélectionne une conversation</p>
          </div>
        </div>
      )}
    </div>
  )
}
