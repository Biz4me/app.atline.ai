'use client'

import type { ReactNode } from 'react'
import { ChevronDown, Check, type LucideIcon } from 'lucide-react'
import { Card } from '@/components/card'

// Rubrique pliante — source de vérité unique (profil, activité, nouvelle activité…) :
// en-tête icône + titre + compteur filled/total (✓ vert quand complet) + chevron.
export function CollapsibleSection({ icon: Icon, title, filled, total, open, onToggle, children }: {
  icon: LucideIcon
  title: string
  filled: number
  total: number
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  const done = total > 0 && filled >= total
  return (
    <Card className="overflow-hidden p-0">
      <button type="button" onClick={onToggle} className={`flex w-full items-center gap-2.5 px-4 py-3.5 ${open ? 'border-b border-border' : ''}`}>
        <Icon className="size-5 shrink-0 text-muted-foreground stroke-[1.5]" />
        <p className="flex-1 text-left text-lg font-semibold text-foreground">{title}</p>
        {done ? (
          <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#22C55E] text-white"><Check className="size-3.5" /></span>
        ) : (
          <span className="shrink-0 text-base font-semibold text-muted-foreground">{filled}/{total}</span>
        )}
        <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="space-y-4 p-4">{children}</div>}
    </Card>
  )
}
