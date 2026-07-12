import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/card'

// Carte KPI UNIQUE (design validé du tableau de bord) : icône + label optionnels,
// chiffre héros en Clash Display, sous-texte. Réutilisée partout (tableau de bord, contacts…)
// → un seul endroit à changer, alignement garanti entre les pages.
export function KpiCard({
  icon: Icon, label, value, sub, alert = false,
}: {
  icon?: LucideIcon
  label: string
  value: string | number | undefined
  sub?: string
  alert?: boolean
}) {
  return (
    <Card className="flex flex-col gap-0.5 px-3.5 py-3">
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground lg:text-xs">
        {Icon && <Icon className="size-3.5 stroke-[1.5]" />}
        {label}
      </span>
      <span className={`font-display text-2xl font-bold tabular-nums ${alert ? 'text-[#EF4444]' : 'text-foreground'}`}>
        {value ?? '—'}
      </span>
      {sub && <span className="text-sm text-muted-foreground lg:text-xs">{sub}</span>}
    </Card>
  )
}
