'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Briefcase, Network, Minus, Plus } from 'lucide-react'
import { SubHeader } from '@/components/page-shell'
import { SelectMenu } from '@/components/select-menu'
import { CollapsibleSection } from '@/components/collapsible-section'
import { useBusiness } from '@/components/business-provider'
import { companyOptions, categoryForCompany, OTHER_COMPANY } from '@/lib/mlm-companies'
import { toast } from 'sonner'

// Même charte que la fiche activité (au détail près)
const inputCls =
  'w-full rounded-xl border border-border bg-background px-4 py-[7px] text-lg text-foreground outline-none placeholder:text-muted-foreground'

// Compteur : contenu « N label », steppers − / + à droite (neutres).
function Stepper({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const n = parseInt(value || '0', 10) || 0
  const active = n > 0
  const set = (nv: number) => onChange(String(Math.max(0, nv)))
  return (
    <div className={`${inputCls} flex items-center justify-between py-1.5`}>
      <span className={`text-lg lg:text-sm ${active ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{n} {label}</span>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => set(n - 1)} disabled={n <= 0} className="flex size-7 items-center justify-center rounded-full bg-muted text-foreground active:bg-muted/70 disabled:opacity-40"><Minus className="size-4" /></button>
        <button type="button" onClick={() => set(n + 1)} className="flex size-7 items-center justify-center rounded-full bg-muted text-foreground active:bg-muted/70"><Plus className="size-4" /></button>
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
  // Création : les 2 cartes ouvertes d'emblée (voir tous les champs) + toggle indépendant (pas d'accordéon).
  const [open, setOpen] = useState<Record<string, boolean>>({ activite: true, structure: true })
  const toggle = (k: string) => setOpen((o) => ({ ...o, [k]: !o[k] }))
  const category = company === OTHER_COMPANY ? 'autre' : company ? categoryForCompany(company) : ''

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
      <SubHeader title="Nouvelle activité" onBack={() => router.back()} />

      <div className="space-y-5 px-4 pb-28 pt-4">
        <div className="flex flex-col gap-2">
          <CollapsibleSection icon={Briefcase} title="Ton business" filled={nf([name, rank, sponsorName, start.m && start.y ? 'x' : ''])} total={4} open={!!open.activite} onToggle={() => toggle('activite')}>
            <SelectMenu className={inputCls} placeholder="Sélectionne ta société" value={company} onChange={setCompany} options={companyOptions()} />
            {company === OTHER_COMPANY && (
              <input className={inputCls} value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Nom de ta société" autoFocus />
            )}
            {/* Catégorie — dérivée de la société (lecture seule) */}
            <div className={`${inputCls} ${category ? 'text-foreground' : 'text-muted-foreground'}`}>{category ? category.charAt(0).toUpperCase() + category.slice(1) : 'Catégorie'}</div>
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
