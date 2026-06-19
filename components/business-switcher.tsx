'use client'

import { useRef, useState, useEffect } from 'react'
import { Check, ChevronDown, Plus } from 'lucide-react'
import { useBusiness } from '@/components/business-provider'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

interface Props {
  collapsed?: boolean
  variant?: 'sheet' | 'popover'
}

export function BusinessSwitcher({ collapsed, variant = 'sheet' }: Props) {
  const { current, all, setCurrent } = useBusiness()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (variant !== 'popover') return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [variant])

  const trigger = collapsed ? (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      className="flex size-9 items-center justify-center rounded-full transition-colors hover:ring-2 hover:ring-border"
      title={current.name}
    >
      <span
        className="flex size-9 items-center justify-center rounded-full text-[13px] font-bold text-white"
        style={{ backgroundColor: current.color }}
      >
        {current.initials}
      </span>
    </button>
  ) : (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      className={cn(
        'inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-bold transition-colors hover:bg-muted',
        variant === 'popover' && open && 'bg-muted',
      )}
    >
      <span
        className="flex size-6 items-center justify-center rounded-full text-[11px] font-bold text-white shrink-0"
        style={{ backgroundColor: current.color }}
      >
        {current.initials}
      </span>
      {current.name}
      <ChevronDown className={cn('size-3.5 text-muted-foreground transition-transform', open && 'rotate-180')} />
    </button>
  )

  /* ── Popover (desktop) ── */
  if (variant === 'popover') {
    return (
      <div ref={ref} className="relative">
        {trigger}
        {open && (
          <div className="absolute top-full left-0 mt-1 w-[220px] rounded-xl border border-border bg-surface shadow-lg z-[60] overflow-hidden py-1">
            {all.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => { setCurrent(b); setOpen(false) }}
                className="flex w-full items-center gap-2.5 px-3 py-2 hover:bg-muted transition-colors"
              >
                <span
                  className="flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ backgroundColor: b.color }}
                >
                  {b.initials}
                </span>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-foreground truncate">{b.name}</p>
                  {b.isAtline && (
                    <p className="text-[11px] text-muted-foreground">Licence Atline</p>
                  )}
                </div>
                {current.id === b.id && <Check className="size-3.5 shrink-0 text-primary" />}
              </button>
            ))}
            <div className="mx-2 my-1 h-px bg-border" />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2.5 px-3 py-2 hover:bg-muted transition-colors"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground">
                <Plus className="size-3" />
              </span>
              <p className="text-sm font-medium text-muted-foreground">Ajouter une activité</p>
            </button>
          </div>
        )}
      </div>
    )
  }

  /* ── Sheet (mobile, défaut) ── */
  return (
    <>
      {trigger}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="mx-auto max-w-[480px] rounded-t-3xl">
          <SheetHeader className="text-left">
            <SheetTitle className="font-display text-lg">Mes business</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-2 px-4 pb-6">
            {all.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => { setCurrent(b); setOpen(false) }}
                className={cn(
                  'flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors',
                  current.id === b.id ? 'border-primary bg-accent' : 'border-border bg-surface active:bg-muted',
                )}
              >
                <span
                  className="flex size-9 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: b.color }}
                >
                  {b.initials}
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-bold text-foreground">{b.name}</span>
                  {b.isAtline && (
                    <span className="block text-xs text-primary">Licence Atline</span>
                  )}
                </span>
                {current.id === b.id && <Check className="size-5 text-primary" />}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
