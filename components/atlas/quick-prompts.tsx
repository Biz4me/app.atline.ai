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
    <div className="flex gap-2 overflow-x-auto px-4 py-2 scrollbar-none lg:px-6">
      {prompts.map((prompt) => (
        <Button
          key={prompt}
          variant="ghost"
          size="sm"
          onClick={() => onSelect(prompt)}
          className="shrink-0 rounded-full border border-border bg-transparent px-4 text-sm text-muted-foreground hover:border-primary hover:text-primary"
        >
          {prompt}
        </Button>
      ))}
    </div>
  )
}
