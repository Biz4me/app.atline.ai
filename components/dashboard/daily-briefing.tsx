import { Card } from "@/components/ui/card"

interface DailyBriefingProps {
  userName: string
  message?: string
}

export function DailyBriefing({ userName, message }: DailyBriefingProps) {
  return (
    <Card className="relative overflow-hidden border-l-[3px] border-l-primary p-4">
      <div>
        <h2 className="font-heading text-base font-medium">
          Bonjour {userName} — voici ton plan du jour
        </h2>
        {message && (
          <p className="mt-1 text-sm text-muted-foreground">{message}</p>
        )}
      </div>
    </Card>
  )
}
