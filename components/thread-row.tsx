'use client'

import { cn } from '@/lib/utils'

// Rangée unique de la nav messagerie — agents épinglés, contacts, résultats de recherche :
// UN composant pour toutes les listes (règle des 7). Avatar lettré OU emoji (fond neutre).
export function ThreadRow({ avatarBg, avatarText, title, titlePill, line, lineOrange, time, count, endPill, dim, onClick }: {
  avatarBg: string; avatarText: string; title: string; titlePill?: { label: string; cls: string }
  line: string; lineOrange?: boolean; time?: string; count?: number
  endPill?: { label: string; cls: string }; dim?: boolean; onClick: () => void
}) {
  return (
    <button type="button" onClick={onClick} className={cn('flex w-full items-center gap-3 px-4 py-2.5 text-left active:bg-muted', dim && 'opacity-50')}>
      <span className="grid size-12 shrink-0 place-items-center rounded-full text-base font-bold text-white" style={{ backgroundColor: avatarBg }}>{avatarText}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          {title}
          {titlePill && <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', titlePill.cls)}>{titlePill.label}</span>}
        </span>
        <span className={cn('block truncate text-xs', lineOrange ? 'font-medium text-primary' : 'text-muted-foreground')}>{line}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        {time !== undefined && <span className="text-[10px] text-muted-foreground">{time}</span>}
        {count ? (
          <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">{count}</span>
        ) : endPill ? (
          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', endPill.cls)}>{endPill.label}</span>
        ) : null}
      </span>
    </button>
  )
}
