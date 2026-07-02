'use client'

import { useState } from 'react'
import { SelectMenu } from '@/components/select-menu'

type Me = { gender?: string; profession?: string; city?: string; socials?: Record<string, string>; coaching?: Record<string, string> } & Record<string, unknown>

type Field = { key: string; label: string; kind: 'top' | 'social' | 'coaching'; type: 'text' | 'select'; options?: { value: string; label: string }[] }

// Champs SIMPLES (self-serve) — remplis directement dans le chat, aucun aller-retour vers le profil.
const FIELDS: Field[] = [
  { key: 'gender', label: 'Genre', kind: 'top', type: 'select', options: [{ value: 'M', label: 'Homme' }, { value: 'F', label: 'Femme' }, { value: 'N', label: 'Neutre' }] },
  { key: 'profession', label: 'Ton métier', kind: 'top', type: 'text' },
  { key: 'city', label: 'Ta ville', kind: 'top', type: 'text' },
  { key: 'instagram', label: 'Instagram', kind: 'social', type: 'text' },
  { key: 'availability', label: 'Ta disponibilité', kind: 'coaching', type: 'select', options: ['Temps plein', 'Temps partiel', 'Quelques heures / semaine', 'Soirs & week-ends'].map((o) => ({ value: o, label: o })) },
  { key: 'level', label: 'Ton expérience en MLM', kind: 'coaching', type: 'select', options: ['Débutant', 'Intermédiaire', 'Confirmé', 'Expert'].map((o) => ({ value: o, label: o })) },
]

const inputCls = 'w-full rounded-xl border border-border bg-background px-4 py-[7px] text-lg text-foreground outline-none placeholder:text-muted-foreground lg:text-sm'

const currentVal = (me: Me, f: Field): string | undefined => {
  if (f.kind === 'social') return (me.socials ?? {})[f.key]
  if (f.kind === 'coaching') return (me.coaching ?? {})[f.key]
  return me[f.key] as string | undefined
}

// Carte mini-formulaire dans le chat : l'utilisateur remplit les champs simples manquants, Atlas enregistre tout d'un coup.
export function ProfileFormCard({ me, onSaved }: { me: Me; onSaved: (n: number) => void }) {
  const missing = FIELDS.filter((f) => !currentVal(me, f))
  const [vals, setVals] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  if (missing.length === 0) return <p className="text-lg text-muted-foreground lg:text-sm">Ton profil de base est déjà complet ✓</p>
  if (done) return <p className="text-lg text-foreground lg:text-sm">Complété ✓</p>

  const filled = missing.filter((f) => vals[f.key]?.trim())
  const save = async () => {
    if (filled.length === 0 || saving) return
    setSaving(true)
    const payload: Record<string, unknown> = {}
    const socials = { ...(me.socials ?? {}) }
    const coaching = { ...(me.coaching ?? {}) }
    let touchedSocial = false, touchedCoaching = false
    for (const f of filled) {
      const v = vals[f.key].trim()
      if (f.kind === 'top') payload[f.key] = v
      else if (f.kind === 'social') { socials[f.key] = v; touchedSocial = true }
      else { coaching[f.key] = v; touchedCoaching = true }
    }
    if (touchedSocial) payload.socials = socials
    if (touchedCoaching) payload.coaching = coaching
    try {
      const r = await fetch('/api/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (r.ok) {
        // La page profil garde un brouillon en sessionStorage qui masquerait ces changements → on l'invalide.
        try { sessionStorage.removeItem('profile_draft_v1') } catch { /* ignore */ }
        setDone(true); onSaved(filled.length)
      }
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="border-b border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground">Complète en 30 secondes</div>
      <div className="flex flex-col gap-2.5 px-4 py-3">
        {missing.map((f) => (
          f.type === 'select'
            ? <SelectMenu key={f.key} className={inputCls} placeholder={f.label} value={vals[f.key] ?? ''} onChange={(v) => setVals((s) => ({ ...s, [f.key]: v }))} options={f.options!} />
            : <input key={f.key} className={inputCls} value={vals[f.key] ?? ''} onChange={(e) => setVals((s) => ({ ...s, [f.key]: e.target.value }))} placeholder={f.label} />
        ))}
        <button type="button" onClick={save} disabled={saving || filled.length === 0} className="mt-1 rounded-2xl bg-primary py-2.5 text-sm font-bold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-50">
          {saving ? "J'enregistre…" : 'Enregistrer'}
        </button>
      </div>
    </div>
  )
}
