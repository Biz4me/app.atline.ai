'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

export type PlanItem = {
  contactId: string
  name: string
  prenom: string
  initials: string
  accent: string
  level: number
  action: string
  headline: string
  reason: string
  channel: string | null
  stage: string
}

// Rond sélectif — Atlas propose 2-3 choix guidés, l'utilisateur en sélectionne un (repris de l'onboarding `chatChoices`).
export function ChatChoices({ choices, onPick }: { choices: { label: string; value: string }[]; onPick: (value: string, label: string) => void }) {
  const [picked, setPicked] = useState<string | null>(null)
  return (
    <div className="flex w-full flex-col gap-0.5">
      {choices.map((c) => {
        const sel = picked === c.value
        return (
          <button
            key={c.value}
            type="button"
            disabled={picked !== null}
            onClick={() => { setPicked(c.value); setTimeout(() => onPick(c.value, c.label), 240) }}
            className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-opacity', picked !== null && !sel && 'opacity-30')}
          >
            <span className={cn('grid size-5 shrink-0 place-items-center rounded-full border-2 transition-colors', sel ? 'border-primary bg-primary text-white' : 'border-border')}>
              {sel && <Check className="size-3" strokeWidth={3} />}
            </span>
            <span className={cn('text-lg leading-snug lg:text-sm', sel ? 'font-bold text-foreground' : 'font-medium text-foreground')}>{c.label}</span>
          </button>
        )
      })}
    </div>
  )
}

// Carte brouillon régénérable — le livrable concret (message/script), reprise de `streamCard` (onboarding).
export function AtlasDraftCard({ contactId, prenom, channel }: { contactId: string; prenom: string; channel: string }) {
  const [msg, setMsg] = useState<string | null>(null)
  const [regensLeft, setRegensLeft] = useState(2)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    setBusy(true); setCopied(false)
    try {
      const r = await fetch(`/api/contacts/${contactId}/draft`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channel }) })
      const d = r.ok ? await r.json() : null
      setMsg(d?.message ?? "Je n'arrive pas à le rédiger là — réessaie dans un instant.")
    } catch { setMsg('Souci réseau — réessaie.') }
    finally { setBusy(false) }
  }, [contactId, channel])
  useEffect(() => { load() }, [load])

  const copy = () => { if (!msg) return; navigator.clipboard?.writeText(msg).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800) }).catch(() => {}) }

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="border-b border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground">Ton message pour {prenom}</div>
      <div className="min-h-[54px] whitespace-pre-wrap px-4 py-3 text-lg leading-relaxed text-foreground lg:text-sm">{busy ? 'Je rédige…' : (msg ?? '…')}</div>
      <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-2.5">
        {regensLeft > 0 ? (
          <button type="button" disabled={busy} onClick={() => { setRegensLeft((n) => n - 1); load() }} className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground disabled:opacity-40">
            <RefreshCw className={cn('size-3.5', busy && 'animate-spin')} /> Régénérer · {regensLeft}
          </button>
        ) : (
          <span className="text-xs text-muted-foreground">Dernière version</span>
        )}
        <button type="button" onClick={copy} disabled={busy || !msg} className="rounded-xl bg-primary px-4 py-1.5 text-sm font-bold text-primary-foreground disabled:opacity-50">{copied ? 'Copié ✓' : 'Copier'}</button>
      </div>
    </div>
  )
}
