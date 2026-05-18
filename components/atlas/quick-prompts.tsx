"use client"

import { Button } from "@/components/ui/button"

interface QuickPromptsProps {
  onSelect: (prompt: string) => void
}

const prompts = [
  "Générer un script WhatsApp",
  "Plan d'action semaine",
  "Analyser mon pitch",
]

export function QuickPrompts({ onSelect }: QuickPromptsProps) {
  return (
    <div className="w-full overflow-hidden">
      <div 
        className="flex w-full max-w-full gap-2 overflow-x-scroll px-4 pb-2 scrollbar-none lg:justify-center lg:overflow-visible lg:px-6"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {prompts.map((prompt) => (
          <Button
            key={prompt}
            variant="ghost"
            size="sm"
            onClick={() => onSelect(prompt)}
            className="shrink-0 whitespace-nowrap rounded-full border border-border bg-transparent px-4 text-sm text-muted-foreground hover:border-primary hover:text-primary"
          >
            {prompt}
          </Button>
        ))}
      </div>
    </div>
  )
}
