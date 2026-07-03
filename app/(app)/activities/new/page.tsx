'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Loader2, Briefcase, Network } from 'lucide-react'
import { SelectMenu } from '@/components/select-menu'
import { CollapsibleSection } from '@/components/collapsible-section'
import { useBusiness } from '@/components/business-provider'
import { toast } from 'sonner'

// Même charte que la fiche activité (au détail près)
const inputCls =
  'w-full rounded-xl border border-border bg-background px-4 py-[7px] text-lg text-foreground outline-none placeholder:text-muted-foreground'

const DATE_MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
  .map((m, i) => ({ value: String(i + 1).padStart(2, '0'), label: m }))
const DATE_YEARS = Array.from({ length: 21 }, (_, i) => { const y = new Date().getFullYear() - i; return { value: String(y), label: String(y) } })
const nf = (vals: string[]) => vals.filter((v) => v && v.trim()).length

export default function NewActivityPage() {
  const router = useRouter()
  const { refresh } = useBusiness()

  const [name, setName] = useState('')
  const [rank, setRank] = useState('')
  const [sponsorName, setSponsorName] = useState('')
  const [start, setStart] = useState({ m: '', y: '' })
  const [directs, setDirects] = useState('')
  const [total, setTotal] = useState('')
  const [clients, setClients] = useState('')
  const [creating, setCreating] = useState(false)
  const [open, setOpen] = useState<Record<string, boolean>>({ activite: true })
  const toggle = (k: string) => setOpen((o) => ({ [k]: !o[k] }))

  async function create() {
    if (!name.trim() || creating) return
    setCreating(true)
    const structure = (directs || total || clients) ? { directs, total, clients } : undefined
    try {
      const res = await fetch('/api/businesses', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(), rank, sponsorName,
          startDate: start.y || start.m ? `${start.y}-${start.m}` : '',
          structure,
        }),
      })
      if (!res.ok) throw new Error()
      await refresh()
      router.push('/activities')
    } catch {
      toast.error('Échec de la création')
      setCreating(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* Header — titre centré + retour à gauche (charte du hub compte) */}
      <div className="sticky top-0 z-10 flex items-center justify-center bg-background/90 px-4 py-3 backdrop-blur" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
        <button type="button" onClick={() => router.back()} aria-label="Retour" className="absolute left-2 flex size-9 items-center justify-center rounded-full text-foreground active:bg-muted">
          <ChevronLeft className="size-5 stroke-[1.5]" />
        </button>
        <h1 className="text-lg font-semibold text-foreground">Nouvelle activité</h1>
      </div>

      <div className="space-y-5 px-4 pb-28 pt-4">
        <div className="flex flex-col gap-2">
          <CollapsibleSection icon={Briefcase} title="L'activité" filled={nf([name, rank, sponsorName, start.m && start.y ? 'x' : ''])} total={4} open={!!open.activite} onToggle={() => toggle('activite')}>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom de ta société MLM" autoFocus />
            <input className={inputCls} value={rank} onChange={(e) => setRank(e.target.value)} placeholder="Rang dans ton MLM" />
            <input className={inputCls} value={sponsorName} onChange={(e) => setSponsorName(e.target.value)} placeholder="Prénom de ton parrain" />
            <div>
              <p className="mb-1.5 px-1 text-sm text-muted-foreground">Date de démarrage</p>
              <div className="grid grid-cols-2 gap-2">
                <SelectMenu className={inputCls} placeholder="Mois" value={start.m} onChange={(v) => setStart((s) => ({ ...s, m: v }))} options={DATE_MONTHS} />
                <SelectMenu className={inputCls} placeholder="Année" value={start.y} onChange={(v) => setStart((s) => ({ ...s, y: v }))} options={DATE_YEARS} />
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection icon={Network} title="Structure de départ" filled={nf([directs, total, clients])} total={3} open={!!open.structure} onToggle={() => toggle('structure')}>
            <input type="number" min="0" inputMode="numeric" className={`${inputCls} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none`} value={directs} onChange={(e) => setDirects(e.target.value)} placeholder="Partenaires directs" />
            <input type="number" min="0" inputMode="numeric" className={`${inputCls} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none`} value={total} onChange={(e) => setTotal(e.target.value)} placeholder="Organisation totale" />
            <input type="number" min="0" inputMode="numeric" className={`${inputCls} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none`} value={clients} onChange={(e) => setClients(e.target.value)} placeholder="Clients directs" />
          </CollapsibleSection>
        </div>
      </div>

      {/* Bouton flottant — identique à la fiche activité */}
      <div className="fixed inset-x-0 z-[48] px-4" style={{ bottom: 'max(20px, env(safe-area-inset-bottom))' }}>
        <button type="button" onClick={create} disabled={!name.trim() || creating} className="mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-base font-bold text-primary-foreground shadow-lg transition-transform active:scale-[0.98] disabled:opacity-50">
          {creating ? <Loader2 className="size-5 animate-spin" /> : "Créer l'activité"}
        </button>
      </div>
    </div>
  )
}
