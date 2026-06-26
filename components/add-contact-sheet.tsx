'use client'

import { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const stages = [
  { id: 'nouveau', label: 'Nouveau' },
  { id: 'chaud', label: 'Chaud' },
  { id: 'prospect', label: 'Qualifié' },
  { id: 'client', label: 'Client' },
  { id: 'partenaire', label: 'Partenaire' },
]

const sources = ['Instagram', 'LinkedIn', 'Facebook', 'TikTok', 'Manuel']

export function AddContactSheet({
  open,
  onOpenChange,
  onAdded,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onAdded?: () => void
}) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [stage, setStage] = useState('nouveau')
  const [source, setSource] = useState('Manuel')
  const [loading, setLoading] = useState(false)

  const inputCls = 'w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/40 placeholder:text-muted-foreground'

  async function submit() {
    if (!name.trim()) {
      toast.error('Ajoute au moins un nom')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() || null, stage, source: source.toUpperCase() }),
      })
      if (!res.ok) throw new Error()
      toast.success(`${name.trim()} ajouté à ton CRM`)
      setName('')
      setPhone('')
      setStage('nouveau')
      setSource('Manuel')
      onOpenChange(false)
      onAdded?.()
    } catch {
      toast.error("Erreur lors de l'ajout")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-w-[480px] rounded-t-3xl">
        <SheetHeader className="text-left">
          <SheetTitle className="font-display text-lg">Nouveau contact</SheetTitle>
          <SheetDescription>Ajoute-le à ton CRM en quelques secondes.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4 pb-8">
          <div className="flex flex-col gap-1.5">
            <label className="eyebrow" htmlFor="contact-name">Nom complet</label>
            <input
              id="contact-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="Ex. Marie Dupont"
              className={inputCls}
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="eyebrow" htmlFor="contact-phone">Téléphone</label>
            <input
              id="contact-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+33 6 00 00 00 00"
              type="tel"
              className={inputCls}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="eyebrow">Étape</span>
            <div className="flex flex-wrap gap-2">
              {stages.map((s) => (
                <button key={s.id} type="button" onClick={() => setStage(s.id)}
                  className={cn('rounded-full px-4 py-1.5 text-sm font-semibold transition-colors',
                    stage === s.id ? 'bg-primary/10 text-primary' : 'border border-border bg-surface text-muted-foreground')}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="eyebrow">Source</span>
            <div className="flex flex-wrap gap-2">
              {sources.map((s) => (
                <button key={s} type="button" onClick={() => setSource(s)}
                  className={cn('rounded-full px-4 py-1.5 text-sm font-semibold transition-colors',
                    source === s ? 'bg-primary/10 text-primary' : 'border border-border bg-surface text-muted-foreground')}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <button type="button" onClick={submit} disabled={loading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-60">
            {loading && <Loader2 className="size-4 animate-spin" />}
            {loading ? 'Ajout...' : 'Ajouter au CRM'}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
