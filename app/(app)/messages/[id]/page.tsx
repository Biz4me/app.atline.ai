'use client'

import { use, useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Send, Mic, Sparkles, Phone, Video, MessageSquare, X } from 'lucide-react'
import { DiscAvatar } from '@/components/disc-avatar'
import { contacts } from '@/lib/data'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { toast } from 'sonner'

type Msg = { id: string; from: 'me' | 'them'; text: string; time: string }

const mockMessages: Record<string, Msg[]> = {
  c1: [
    { id: '1', from: 'them', text: 'Salut ! J\'ai vu ta story hier, c\'est exactement ce que je cherche.', time: '14:10' },
    { id: '2', from: 'me', text: 'Super Thomas ! Qu\'est-ce qui t\'a le plus intéressé ?', time: '14:12' },
    { id: '3', from: 'them', text: 'Le côté liberté financière. J\'en ai marre de mon boulot actuel.', time: '14:15' },
    { id: '4', from: 'me', text: 'Je comprends totalement. On pourrait se faire un appel de 20 min pour que je t\'explique tout ça ?', time: '14:18' },
    { id: '5', from: 'them', text: 'Oui je suis disponible vendredi matin, ça marche pour moi !', time: '14:20' },
  ],
  c7: [
    { id: '1', from: 'them', text: 'Hey ! Ton vocal de ce matin m\'a trop motivée !', time: '12:30' },
    { id: '2', from: 'me', text: 'Trop contente ! Tu veux qu\'on échange sur comment ça marche ?', time: '12:35' },
    { id: '3', from: 'them', text: 'Énergie incroyable dans ton dernier vocal. Je suis partante pour en savoir plus !', time: '12:40' },
  ],
}

const atlasSuggestions: Record<string, string> = {
  c1: 'Thomas est D — direct. Propose un RDV de 20 min avec un chiffre concret : "En 3 mois, j\'ai ajouté 400€/mois."',
  c7: 'Nadia est I — enthousiaste. Mise sur la communauté et le style de vie : "On se retrouve tous les jeudis en visio !"',
}

const platforms: { id: string; label: string; icon: string }[] = [
  { id: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { id: 'sms', label: 'SMS', icon: '📱' },
  { id: 'instagram', label: 'Instagram', icon: '📷' },
  { id: 'atline', label: 'Atline', icon: '⚡' },
]

export default function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const contact = contacts.find((c) => c.id === id)
  const [messages, setMessages] = useState<Msg[]>(mockMessages[id] ?? [])
  const [input, setInput] = useState('')
  const [showAtlas, setShowAtlas] = useState(false)
  const [platform, setPlatform] = useState('whatsapp')
  const [showPlatformSheet, setShowPlatformSheet] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (!contact) return null

  const handleSend = () => {
    if (!input.trim()) return
    setMessages((prev) => [
      ...prev,
      { id: String(Date.now()), from: 'me', text: input, time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) },
    ])
    setInput('')
    setShowAtlas(false)
  }

  const handleSendSuggestion = () => {
    if (!atlasSuggestions[id]) return
    const text = atlasSuggestions[id].split('"')[1] ?? atlasSuggestions[id].slice(0, 60)
    setMessages((prev) => [
      ...prev,
      { id: String(Date.now()), from: 'me', text, time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) },
    ])
    setShowAtlas(false)
  }

  const currentPlatform = platforms.find((p) => p.id === platform) ?? platforms[0]

  return (
    <div className="flex h-[100dvh] flex-col bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 bg-surface/95 px-4 py-3 backdrop-blur"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <button type="button" onClick={() => router.back()} className="-ml-1 flex size-9 items-center justify-center rounded-full text-fg-2 active:bg-muted lg:hidden">
          <ChevronLeft className="size-5 stroke-[1.5]" />
        </button>
        <Link href={`/contacts/${contact.id}`} className="flex flex-1 items-center gap-2.5 min-w-0">
          <DiscAvatar firstName={contact.firstName} lastName={contact.lastName} disc={contact.disc} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground">{contact.firstName} {contact.lastName}</p>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); setShowPlatformSheet(true) }}
              className="flex items-center gap-1 text-xs text-muted-foreground"
            >
              <span>{currentPlatform.icon}</span>
              <span>via {currentPlatform.label}</span>
              <span className="text-[10px] text-muted-foreground">›</span>
            </button>
          </div>
        </Link>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => toast.info('Appel')} className="flex size-9 items-center justify-center rounded-full text-fg-2 active:bg-muted">
            <Phone className="size-5 stroke-[1.5]" />
          </button>
          <button type="button" onClick={() => toast.info('Vidéo')} className="flex size-9 items-center justify-center rounded-full text-fg-2 active:bg-muted">
            <Video className="size-5 stroke-[1.5]" />
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-2">
          {messages.map((msg) => (
            <div key={msg.id} className={cn('flex', msg.from === 'me' ? 'justify-end' : 'justify-start')}>
              <div className={cn(
                'max-w-[80%] rounded-2xl px-3.5 py-2.5',
                msg.from === 'me'
                  ? 'rounded-br-sm bg-primary text-primary-foreground'
                  : 'rounded-bl-sm bg-surface shadow-card text-foreground'
              )}>
                <p className="text-sm leading-relaxed">{msg.text}</p>
                <p className={cn('mt-1 text-right text-[10px]', msg.from === 'me' ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                  {msg.time}
                </p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Atlas suggère overlay */}
      {showAtlas && atlasSuggestions[id] && (
        <div className="mx-4 mb-2 rounded-2xl border border-primary/30 bg-primary/5 p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary">
              <Sparkles className="size-3.5 stroke-[1.5] text-primary-foreground" />
            </span>
            <span className="text-xs font-bold text-primary">Atlas suggère</span>
            <button type="button" onClick={() => setShowAtlas(false)} className="ml-auto text-muted-foreground">
              <X className="size-3.5" />
            </button>
          </div>
          <p className="mb-3 text-xs text-foreground leading-relaxed">{atlasSuggestions[id]}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setInput(atlasSuggestions[id].split('"')[1] ?? '')
                setShowAtlas(false)
              }}
              className="flex-1 rounded-xl border border-primary/30 py-2 text-xs font-bold text-primary transition-colors active:bg-primary/10"
            >
              Modifier
            </button>
            <button
              type="button"
              onClick={handleSendSuggestion}
              className="flex-1 rounded-xl bg-primary py-2 text-xs font-bold text-primary-foreground transition-colors active:opacity-90"
            >
              Envoyer
            </button>
          </div>
        </div>
      )}

      {/* Compose */}
      <div className="border-t border-border bg-surface/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => setShowAtlas((v) => !v)}
            className={cn('flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors', showAtlas ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-surface text-muted-foreground')}
          >
            <Sparkles className="size-4 stroke-[1.5]" />
          </button>
          <div className="flex flex-1 items-end gap-2 rounded-2xl border border-border bg-muted px-3 py-2.5">
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
              }}
              placeholder="Message…"
              className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              style={{ maxHeight: 120 }}
            />
          </div>
          {input.trim() ? (
            <button
              type="button"
              onClick={handleSend}
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground active:scale-95 transition-transform"
            >
              <Send className="size-4 stroke-2" />
            </button>
          ) : (
            <button type="button" className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground">
              <Mic className="size-4 stroke-[1.5]" />
            </button>
          )}
        </div>
      </div>

      {/* Platform selector bottom sheet */}
      {showPlatformSheet && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowPlatformSheet(false)} />
          <div className="relative mx-auto w-full max-w-[480px] rounded-t-3xl bg-background p-6">
            <p className="mb-4 text-center text-sm font-bold text-foreground">Contacter via</p>
            <div className="flex flex-col gap-2">
              {platforms.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { setPlatform(p.id); setShowPlatformSheet(false) }}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-colors',
                    platform === p.id ? 'border-primary bg-primary/5' : 'border-border bg-surface'
                  )}
                >
                  <span className="text-xl">{p.icon}</span>
                  <span className="text-sm font-semibold text-foreground">{p.label}</span>
                  {platform === p.id && <span className="ml-auto text-xs font-bold text-primary">Actif</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
