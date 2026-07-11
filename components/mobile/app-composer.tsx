'use client'

import { useRef, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Paperclip, Mic, SendHorizontal } from 'lucide-react'
import { AGENTS } from '@/components/mobile/nav-config'

// Composeur unique de l'app (mobile) — flottant fixe en bas, agent-aware.
// Source de vérité UI : la page Atlas le câble au chat ; le shell le câble au relais Atlas.
// Aujourd'hui pilote Atlas ; passer `agentLabel`/`accent` d'un autre agent le jour où
// Aria/Nova ont un backend conversationnel → zéro réécriture.
type Props = {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  onAttach?: () => void
  agentLabel?: string
  accent?: string
  disabled?: boolean
  autoFocus?: boolean
  children?: React.ReactNode // ex. input fichier caché
}

export function AppComposer({
  value, onChange, onSubmit, onAttach, agentLabel = 'Atlas', accent, disabled, autoFocus, children,
}: Props) {
  const taRef = useRef<HTMLTextAreaElement>(null)
  const pathname = usePathname()
  const router = useRouter()
  // Badge agent (@mention) : la pastille de l'agent courant ; tap → les 3 agents, accessibles partout
  const [agentMenu, setAgentMenu] = useState(false)
  const current = AGENTS.find((a) => pathname === a.href || pathname.startsWith(a.href + '/')) ?? AGENTS[0]

  // Grandit avec le contenu (jusqu'à 120px puis scroll)
  useEffect(() => {
    const el = taRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [value])

  useEffect(() => { if (autoFocus) taRef.current?.focus() }, [autoFocus])

  return (
    <div
      className="lg:hidden fixed inset-x-0 z-[48] px-4"
      style={{ bottom: 'max(20px, env(safe-area-inset-bottom))' }}
    >
      {/* Menu agents — les 3 pastilles au-dessus du composeur */}
      {agentMenu && (
        <div className="mx-auto mb-2 flex max-w-md flex-col gap-0.5 rounded-2xl border border-border bg-surface/95 p-1.5 shadow-[0_6px_24px_rgba(0,0,0,.12)] backdrop-blur-md">
          {AGENTS.map((a) => {
            const Icon = a.icon
            return (
              <button
                key={a.href}
                type="button"
                onClick={() => { setAgentMenu(false); if (a.href !== current.href) router.push(a.href) }}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left active:bg-muted"
              >
                <Icon className="size-5 shrink-0" style={{ color: a.color }} />
                <span className="flex-1 text-lg font-medium text-foreground lg:text-sm">{a.label}</span>
                <span className="text-xs text-muted-foreground">{a.sub}</span>
              </button>
            )
          })}
        </div>
      )}
      <div className="mx-auto flex max-w-md items-end gap-2 rounded-[26px] border border-border bg-surface/95 px-3 py-1.5 shadow-[0_6px_24px_rgba(0,0,0,.12)] backdrop-blur-md">
        <button
          type="button"
          onClick={() => setAgentMenu((o) => !o)}
          aria-label="Changer d'agent"
          className="my-1 grid size-7 shrink-0 place-items-center self-center rounded-full text-[11px] font-bold text-white active:opacity-80"
          style={{ background: current.color }}
        >
          {current.label[0]}
        </button>
        {onAttach && (
          <button
            type="button"
            onClick={onAttach}
            title="Joindre un fichier"
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground active:bg-muted transition-colors"
          >
            <Paperclip className="size-5 stroke-[1.5]" />
          </button>
        )}
        <textarea
          ref={taRef}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSubmit() }
          }}
          placeholder={`Écris à ${agentLabel}…`}
          className="flex-1 resize-none overflow-y-auto no-scrollbar bg-transparent text-lg leading-[1.4] text-foreground outline-none placeholder:text-muted-foreground lg:text-sm"
          style={{ maxHeight: 120, paddingTop: 7, paddingBottom: 7 }}
        />
        <button
          type="button"
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground active:bg-muted transition-colors"
          title="Dicter"
        >
          <Mic className="size-5 stroke-[1.5]" />
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled || !value.trim()}
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm active:opacity-90 transition-opacity disabled:opacity-40"
          style={accent ? { background: accent } : undefined}
        >
          <SendHorizontal className="size-[17px] stroke-[1.5]" />
        </button>
      </div>
      {children}
    </div>
  )
}
