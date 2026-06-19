import { cn } from '@/lib/utils'
import type { ContactStage, Platform, DiscType } from '@/lib/types'
import { stageLabels, platformLabels, discLabels } from '@/lib/data'
import { Camera, Briefcase, Globe, MessageCircle } from 'lucide-react'

const stageStyles: Record<ContactStage, string> = {
  nouveau:    'bg-muted text-muted-foreground',
  chaud:      'bg-[#dc2626]/10 text-[#dc2626]',
  prospect:   'bg-info/10 text-info',
  client:     'bg-success/10 text-success',
  partenaire: 'bg-[#14B8A6]/10 text-[#14B8A6]',
}

export function StagePill({ stage, className }: { stage: ContactStage; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium',
        stageStyles[stage],
        className,
      )}
    >
      {stageLabels[stage]}
    </span>
  )
}

const platformIcons: Record<Platform, typeof Camera> = {
  instagram: Camera,
  linkedin: Briefcase,
  facebook: Globe,
  whatsapp: MessageCircle,
}

const platformColors: Record<Platform, string> = {
  instagram: '#E1306C',
  linkedin: '#0A66C2',
  facebook: '#1877F2',
  whatsapp: '#25D366',
}

export function PlatformBadge({
  platform,
  withLabel = false,
  className,
}: {
  platform: Platform
  withLabel?: boolean
  className?: string
}) {
  const Icon = platformIcons[platform]
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <Icon className="size-4 stroke-[1.5]" style={{ color: platformColors[platform] }} aria-hidden />
      {withLabel && <span className="text-xs font-medium text-fg-2">{platformLabels[platform]}</span>}
    </span>
  )
}

const discHex: Record<DiscType, string> = {
  D: '#dc2626',
  I: '#f59e0b',
  S: '#22c55e',
  C: '#3b82f6',
}

export function DiscBadge({ disc, className }: { disc: DiscType; className?: string }) {
  const color = discHex[disc]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold',
        className,
      )}
      style={{ backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
    >
      <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
      {disc} · {discLabels[disc]}
    </span>
  )
}
