import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

export function Card({
  children,
  className,
  accent = false,
}: {
  children: ReactNode
  className?: string
  accent?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-surface',
        accent && 'border-l-4 border-l-primary',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function SectionTitle({
  children,
  action,
}: {
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="eyebrow">{children}</h2>
      {action}
    </div>
  )
}
