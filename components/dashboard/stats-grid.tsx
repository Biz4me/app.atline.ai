import { cn } from "@/lib/utils"

interface StatCardProps {
  label: string
  value: string | number
  suffix?: string
  trend?: "up" | "down" | "neutral"
  accent?: boolean
}

export function StatCard({ label, value, suffix, accent = false }: StatCardProps) {
  return (
    <div className={cn(
      "rounded-[8px] border border-border bg-card p-4",
      accent && "border-l-2 border-l-primary"
    )}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-2xl font-semibold tracking-tight">
        {value}
        {suffix && (
          <span className="text-base text-muted-foreground">{suffix}</span>
        )}
      </p>
    </div>
  )
}

interface StatsGridProps {
  stats: StatCardProps[]
}

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </div>
  )
}
