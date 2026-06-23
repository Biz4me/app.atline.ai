'use client'

import { useState } from 'react'
import { Card } from '@/components/card'
import { DiscAvatar } from '@/components/disc-avatar'
import { PlatformBadge } from '@/components/pills'
import { inboxMessages, platformLabels } from '@/lib/data'
import type { Platform } from '@/lib/types'
import { Sparkles, UserPlus, MessageCircle, Send } from 'lucide-react'
import { toast } from 'sonner'

const platformFilters: { id: 'tous' | Platform; label: string }[] = [
  { id: 'tous', label: 'Tous' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'facebook', label: 'Facebook' },
]

export function NovaInbox() {
  const [filter, setFilter] = useState<'tous' | Platform>('tous')
  const [replyId, setReplyId] = useState<string | null>(null)

  const list = inboxMessages.filter((m) => (filter === 'tous' ? true : m.platform === filter))

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {platformFilters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              filter === f.id ? 'bg-primary/10 text-primary' : 'border border-border bg-surface text-fg-2'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">Aucun message sur ce réseau.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((m) => {
            const high = m.atlasScore >= 80
            return (
              <li key={m.id}>
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <DiscAvatar firstName={m.name.split(' ')[0]} lastName={m.name.split(' ')[1] ?? ''} disc={m.disc} />
                      <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-surface ring-2 ring-surface">
                        <PlatformBadge platform={m.platform} />
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-foreground">{m.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {platformLabels[m.platform]} · {m.time}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        high ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      Atlas {m.atlasScore}
                    </span>
                  </div>

                  <p className="mt-3 border-l-2 border-border pl-3 text-sm italic text-fg-2">
                    “{m.quote}”
                  </p>

                  <div className="mt-3 flex gap-2 rounded-xl border-l-2 border-primary bg-accent/60 p-3">
                    <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
                    <p className="text-xs leading-relaxed text-accent-foreground">{m.novaSuggestion}</p>
                  </div>

                  <div className="mt-3 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => toast.success(`${m.name} ajouté à tes contacts`)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm font-bold text-fg-2 transition-colors active:bg-muted"
                    >
                      <UserPlus className="size-4" />
                      Ajouter à mes contacts
                    </button>
                    {high && (
                      <button
                        type="button"
                        onClick={() => toast.success('Ouverture de WhatsApp')}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white transition-transform active:scale-[0.98]"
                        style={{ backgroundColor: '#25D366' }}
                      >
                        <MessageCircle className="size-4" />
                        Répondre sur WhatsApp
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setReplyId(replyId === m.id ? null : m.id)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground transition-transform active:scale-[0.98]"
                    >
                      Répondre
                    </button>
                  </div>

                  {replyId === m.id && (
                    <div className="mt-3 flex flex-col gap-2">
                      <textarea
                        rows={3}
                        placeholder="Écris ta réponse ou laisse Nova suggérer…"
                        className="w-full resize-none rounded-xl border border-border bg-surface p-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          toast.success('Réponse envoyée')
                          setReplyId(null)
                        }}
                        className="inline-flex items-center justify-center gap-2 self-end rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
                      >
                        <Send className="size-4" />
                        Envoyer
                      </button>
                    </div>
                  )}
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
