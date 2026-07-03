'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Loader2, Briefcase, Network, Minus, Plus } from 'lucide-react'
import { SelectMenu } from '@/components/select-menu'
import { CollapsibleSection } from '@/components/collapsible-section'
import { useBusiness } from '@/components/business-provider'
import { companyOptions, categoryForCompany, OTHER_COMPANY } from '@/lib/mlm-companies'
import { toast } from 'sonner'

// Même charte que la fiche activité (au détail près)
const inputCls =
  'w-full rounded-xl border border-border bg-background px-4 py-[7px] text-lg text-foreground outline-none placeholder:text-muted-foreground'

// Compteur : contenu « N label », steppers − / + à droite.
function Stepper({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const n = parseInt(value || '0', 10) || 0
  const set = (nv: number) => onChange(String(Math.max(0, nv)))
  return (
    <div className={`${inputCls} flex items-center justify-between py-1.5`}>
      <span className="text-lg text-foreground lg:text-sm"><span className="font-semibold">{n}</span> <span className="text-muted-foreground">{label}</span></span>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => set(n - 1)} disabled={n <= 0} className="flex size-7 items-center justify-center rounded-full bg-muted text-foreground active:bg-muted/70 disabled:opacity-40"><Minus className="size-4" /></button>
        <button type="button" onClick={() => set(n + 1)} className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground active:scale-95 transition-transform"><Plus className="size-4" /></button>
      </div>
    </div>
  )
}

const DATE_MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
  .map((m, i) => ({ value: String(i + 1).padStart(2, '0'), label: m }))
const DATE_YEARS = Array.from({ length: 21 }, (_, i) => { const y = new Date().getFullYear() - i; return { value: String(y), label: String(y) } })
const nf = (vals: string[]) => vals.filter((v) => v && v.trim()).length

export default function NewActivityPage() {
  const router = useRouter()
  const { refresh } = useBusiness()

  const [company, setCompany] = useState('')       // société choisie dans le déroulant (ou OTHER_COMPANY)
  const [customName, setCustomName] = useState('')  // nom saisi si « Autre société »
  const name = company === OTHER_COMPANY ? customName : company
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
          category: company === OTHER_COMPANY ? 'autre' : categoryForCompany(company),
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
          <CollapsibleSection icon={Briefcase} title="Ton business" filled={nf([name, rank, sponsorName, start.m && start.y ? 'x' : ''])} total={4} open={!!open.activite} onToggle={() => toggle('activite')}>
            <SelectMenu className={inputCls} placeholder="Sélectionne ta société" value={company} onChange={setCompany} options={companyOptions()} />
            {company === OTHER_COMPANY && (
              <input className={inputCls} value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Nom de ta société" autoFocus />
            )}
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
            <Stepper label="partenaires directs" value={directs} onChange={setDirects} />
            <Stepper label="organisation totale" value={total} onChange={setTotal} />
            <Stepper label="clients directs" value={clients} onChange={setClients} />
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
