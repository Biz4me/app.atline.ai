'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Send, Sparkles, RotateCcw } from 'lucide-react'
import { contacts } from '@/lib/data'
import { DiscAvatar } from '@/components/disc-avatar'
import { DiscBadge } from '@/components/pills'
import { cn } from '@/lib/utils'
import type { DiscType } from '@/lib/types'

type Msg = { id: string; role: 'me' | 'them'; text: string }

const discReplies: Record<DiscType, { tone: string; replies: string[] }> = {
  D: {
    tone: 'Direct, orienté résultat. Va droit au but, déteste perdre du temps.',
    replies: [
      'Concrètement, ça me rapporte quoi ?',
      "OK, mais je n'ai pas 30 minutes. En deux phrases.",
      'Envoie-moi les chiffres et on en reparle.',
    ],
  },
  I: {
    tone: 'Enthousiaste, relationnel. Aime les histoires et la reconnaissance.',
    replies: [
      "Ah génial, ça m'a l'air super intéressant ! Raconte-moi.",
      "J'adore l'idée ! On en parle autour d'un café ?",
      'Tu connais qui d’autre dans le réseau qui fait ça ?',
    ],
  },
  S: {
    tone: 'Posé, prudent. Cherche la confiance et déteste la pression.',
    replies: [
      'Je comprends, laisse-moi y réfléchir tranquillement.',
      "C'est gentil de penser à moi. On peut prendre le temps ?",
      'Et si ça ne me convient pas, je peux revenir en arrière ?',
    ],
  },
  C: {
    tone: 'Analytique, factuel. Veut des données, des preuves, des détails.',
    replies: [
      'Tu as une étude ou des données sur ce point précis ?',
      'Quelle est la méthodologie exacte derrière ce résultat ?',
      'Je préfère vérifier les détails avant de me décider.',
    ],
  },
}

export default function AriaPage() {
  const router = useRouter()
  const [target, setTarget] = useState(contacts[0])
  const [messages, setMessages] = useState<Msg[]>([])
  const [draft, setDraft] = useState('')

  const disc = target.disc ?? 'D'
  const profile = discReplies[disc]

  function send() {
    if (!draft.trim()) return
    const mine: Msg = { id: crypto.randomUUID(), role: 'me', text: draft.trim() }
    const reply: Msg = {
      id: crypto.randomUUID(),
      role: 'them',
      text: profile.replies[messages.length % profile.replies.length],
    }
    setMessages((m) => [...m, mine, reply])
    setDraft('')
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[#0F0F0F] text-white">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/10 bg-[#0F0F0F]/95 px-4 py-3 backdrop-blur">
        <button
          onClick={() => router.back()}
          aria-label="Retour"
          className="grid size-9 place-items-center rounded-full text-white/50 transition-colors hover:bg-white/10"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div className="flex items-center gap-1.5">
          <Sparkles className="size-4 text-[#F97316]" />
          <h1 className="font-display text-lg font-semibold text-white">ARIA</h1>
        </div>
        <button
          onClick={() => setMessages([])}
          aria-label="Réinitialiser la conversation"
          className="ml-auto grid size-9 place-items-center rounded-full text-white/50 transition-colors hover:bg-white/10"
        >
          <RotateCcw className="size-4" />
        </button>
      </header>

      <div className="border-b border-white/10 bg-[#141414] px-4 py-3">
        <p className="mb-2 text-xs font-medium text-white/40">Simuler une conversation avec</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {contacts.slice(0, 6).map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setTarget(c)
                setMessages([])
              }}
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-full border py-1 pl-1 pr-3 transition-colors',
                c.id === target.id
                  ? 'border-[#F97316] bg-[#F97316]/10'
                  : 'border-white/10 bg-[#0F0F0F] hover:bg-white/5',
              )}
            >
              <DiscAvatar firstName={c.firstName} lastName={c.lastName} disc={c.disc} size="sm" />
              <span className="text-sm font-medium text-white">{c.firstName}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-2 bg-white/5 px-4 py-3">
        <DiscBadge disc={disc} />
        <p className="text-pretty text-xs leading-relaxed text-white/50">{profile.tone}</p>
      </div>

      <div className="flex-1 space-y-3 px-4 py-4">
        {messages.length === 0 && (
          <div className="mt-10 text-center">
            <div className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-[#F97316]/10">
              <Sparkles className="size-6 text-[#F97316]" />
            </div>
            <p className="text-pretty text-sm text-white/40">
              Entraîne-toi à pitcher {target.firstName}. ARIA répondra selon son profil
              DISC <span className="font-semibold text-white">{disc}</span>.
            </p>
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn('flex', m.role === 'me' ? 'justify-end' : 'justify-start')}
          >
            <div
              className={cn(
                'max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                m.role === 'me'
                  ? 'rounded-br-md bg-[#F97316] text-white'
                  : 'rounded-bl-md bg-white/10 text-white/90',
              )}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>

      <div className="sticky bottom-0 flex items-end gap-2 border-t border-white/10 bg-[#0F0F0F]/95 px-4 py-3 backdrop-blur">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          rows={1}
          placeholder={`Écris ton message à ${target.firstName}...`}
          className="max-h-28 flex-1 resize-none rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/40 focus:border-[#F97316]"
        />
        <button
          onClick={send}
          disabled={!draft.trim()}
          aria-label="Envoyer"
          className="grid size-11 shrink-0 place-items-center rounded-full bg-[#F97316] text-white transition-opacity disabled:opacity-40"
        >
          <Send className="size-5" />
        </button>
      </div>
    </div>
  )
}
