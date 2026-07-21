'use client'

import { cn } from '@/lib/utils'

// Rangée unique de la nav messagerie — agents épinglés, contacts, résultats de recherche :
// UN composant pour toutes les listes (règle des 7). Avatar lettré OU emoji (fond neutre).
export function ThreadRow({ avatarBg, avatarText, avatarSrc, title, titlePill, line, time, count, endPill, dim, online, big, onClick }: {
  avatarBg: string; avatarText: string; avatarSrc?: string; title: string; titlePill?: { label: string; cls: string }
  line: string; time?: string; count?: number
  endPill?: { label: string; cls: string }; dim?: boolean; online?: boolean; big?: boolean; onClick: () => void
}) {
  // big (page /chats) : avatars agrandis + nom ET descriptif en 18px. La hiérarchie tient au POIDS + COULEUR.
  return (
    <button type="button" onClick={onClick} className={cn('flex w-full items-center gap-3 px-4 py-2.5 text-left active:bg-muted', dim && 'opacity-50')}>
      <span className={cn('relative grid shrink-0 place-items-center rounded-full font-bold text-white', big ? 'size-14 text-lg' : 'size-12 text-base')} style={{ backgroundColor: avatarBg }}>
        {avatarSrc ? <img src={avatarSrc} alt="" className="size-full rounded-full object-cover" /> : avatarText}
        {/* présence : les agents sont toujours là (point vert façon messagerie) */}
        {online && <span className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-background bg-[#22C55E]" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('flex items-center gap-1.5 font-semibold text-foreground', big ? 'text-lg' : 'text-sm')}>
          {title}
          {titlePill && <span className={cn('rounded-full px-2 py-0.5 text-2xs font-semibold', titlePill.cls)}>{titlePill.label}</span>}
        </span>
        <span className={cn('block truncate text-muted-foreground', big ? 'text-lg' : 'text-xs')}>{line}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        {time !== undefined && <span className="text-2xs text-muted-foreground">{time}</span>}
        {count ? (
          <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-primary px-1.5 text-2xs font-bold text-primary-foreground">{count}</span>
        ) : endPill ? (
          <span className={cn('rounded-full px-2 py-0.5 text-2xs font-medium', endPill.cls)}>{endPill.label}</span>
        ) : null}
      </span>
    </button>
  )
}
