import { Button } from "@/components/ui/button"
import { ChevronRight, Phone } from "lucide-react"

interface Prospect {
  id: string
  name: string
  score: number
  lastActivity: string
}

interface ProspectCardProps {
  prospect: Prospect
}

export function ProspectCard({ prospect }: ProspectCardProps) {
  return (
    <div className="rounded-lg border border-border border-l-2 border-l-accent bg-card p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-accent/20 to-primary/20">
            <span className="text-sm font-medium">{prospect.name.charAt(0)}</span>
          </div>
          <div>
            <p className="font-medium">{prospect.name}</p>
            <p className="text-sm text-muted-foreground">
              {prospect.lastActivity}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-[4px] bg-accent px-2 py-0.5 font-mono text-xs font-medium text-white">
            {prospect.score}/10
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground hover:text-accent"
        >
          <Phone className="mr-1.5 h-3 w-3" />
          Appeler maintenant
        </Button>
      </div>
    </div>
  )
}

interface HotProspectsProps {
  prospects: Prospect[]
}

export function HotProspects({ prospects }: HotProspectsProps) {
  return (
    <section>
      <h3 className="mb-3 font-heading text-base font-medium">
        Prospects chauds
      </h3>
      <div className="space-y-3">
        {prospects.map((prospect) => (
          <ProspectCard key={prospect.id} prospect={prospect} />
        ))}
      </div>
    </section>
  )
}
