import { cn } from '@/lib/utils'
import type { DiscType } from '@/lib/types'
import { discColors } from '@/lib/data'

interface DiscAvatarProps {
  firstName: string
  lastName: string
  disc: DiscType | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizes = {
  sm: 'h-9 w-9 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-20 w-20 text-2xl',
}

export function DiscAvatar({
  firstName,
  lastName,
  disc,
  size = 'md',
  className,
}: DiscAvatarProps) {
  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase()
  const hasDisc = disc != null

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-extrabold leading-none',
        sizes[size],
        className,
      )}
      style={
        hasDisc
          ? { backgroundColor: discColors[disc], color: '#fff' }
          : { backgroundColor: '#e5e7eb', color: '#6b7280' }
      }
      aria-hidden
    >
      {initials}
    </div>
  )
}
