'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'

// Carte de VALIDATION du pourquoi (non régénérable) — n'apparaît QUE lorsqu'Atlas et l'utilisateur
// ont validé ensemble la formulation. « Je valide » → enregistrement dans le profil.
// Si l'utilisateur continue à écrire au lieu de valider, la carte est marquée « dépassée » (Atlas affine).
export function WhyValidateCard({ text, title = 'Ton pourquoi', superseded, done, onValidate }: { text: string; title?: string; superseded?: boolean; done?: boolean; onValidate: () => Promise<boolean> }) {
  const [saving, setSaving] = useState(false)
  const [localDone, setLocalDone] = useState(false)
  const finished = done || localDone

  // Proposition dépassée : l'utilisateur a préféré continuer à parler → Atlas affine dans la suite.
  if (superseded && !finished) {
    return (
      <div className="w-full rounded-2xl border border-border/60 bg-surface/40 px-4 py-3 opacity-60">
        <p className="mb-1 text-xs font-medium text-muted-foreground">Première formulation — on l’a affinée ensuite</p>
        <p className="whitespace-pre-wrap text-sm italic leading-relaxed text-muted-foreground line-through decoration-1">{text}</p>
      </div>
    )
  }

  const validate = async () => {
    if (saving || finished) return
    setSaving(true)
    const ok = await onValidate()
    setSaving(false)
    if (ok) setLocalDone(true)
  }

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="border-b border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground">{title}</div>
      <div className="whitespace-pre-wrap px-4 py-3 text-lg italic leading-relaxed text-foreground lg:text-sm">{text}</div>
      {finished ? (
        <div className="flex items-center gap-1.5 border-t border-border px-4 py-3 text-sm font-semibold text-primary">
          <Check className="size-4" strokeWidth={3} /> Enregistré dans ton profil
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 border-t border-border px-4 py-2.5">
          <button
            type="button"
            onClick={validate}
            disabled={saving}
            className="rounded-2xl bg-primary py-2.5 text-sm font-bold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? "J'enregistre…" : 'Je valide'}
          </button>
          <span className="text-center text-xs text-muted-foreground">…ou continue à m’en dire plus, je l’affinerai</span>
        </div>
      )}
    </div>
  )
}
