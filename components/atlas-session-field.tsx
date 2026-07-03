'use client'

import { Sparkles } from 'lucide-react'

// Modèle de carte UNIFIÉ pour tout champ défini en SESSION avec Atlas (pourquoi, rencontre, objectifs, audience, mindset…).
// Distingué par le FOND teinté (pas de bordure) + l'icône Atlas (Sparkles) à DROITE — ainsi les textes s'alignent
// avec les champs classiques. Vide → une ligne (déclencheur). Rempli → titre 18px gras + le contenu de la session.
export function AtlasSessionField({ title, filled, onOpen, children }: { title: string; filled: boolean; onOpen: () => void; children?: React.ReactNode }) {
  if (!filled) {
    return (
      <button type="button" onClick={onOpen} className="flex w-full items-center justify-between gap-2.5 rounded-xl bg-primary/5 px-4 py-[7px] text-left transition-colors active:bg-primary/10">
        <span className="min-w-0 flex-1 truncate text-lg text-muted-foreground lg:text-sm">{title}</span>
        <Sparkles className="size-4 shrink-0 text-primary" />
      </button>
    )
  }
  return (
    <div className="rounded-xl border border-border bg-background px-4 py-3">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-lg font-semibold text-foreground">{title}</span>
        <Sparkles className="size-4 shrink-0 text-primary" />
      </div>
      {children}
      <button type="button" onClick={onOpen} className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-primary">
        <Sparkles className="size-3.5" /> Retravailler avec Atlas
      </button>
    </div>
  )
}
