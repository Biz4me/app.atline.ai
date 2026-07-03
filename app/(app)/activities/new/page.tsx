'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Calendar, ArrowLeft } from 'lucide-react'
import { useBusiness } from '@/components/business-provider'
import { Card } from '@/components/card'
import { cn } from '@/lib/utils'

const COMPANIES = [
  "Herbalife",
  "Forever Living",
  "Amway",
  "doTERRA",
  "Nu Skin",
  "Atomy",
  "4Life",
  "Modere",
]

export default function NewActivityPage() {
  const router = useRouter()
  const { all, addBusiness } = useBusiness()
  const [creating, setCreating] = useState(false)

  // Crée réellement l'activité (POST + refresh du contexte → apparaît dans le switcher), puis ouvre sa fiche.
  async function create() {
    const name = company.trim()
    if (!name || creating) return
    setCreating(true)
    await addBusiness(name)
    router.push('/activities')
  }

  const [company, setCompany] = useState('')
  const [showCompanyPicker, setShowCompanyPicker] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [nbDirect, setNbDirect] = useState('')
  const [nbTotal, setNbTotal] = useState('')
  const [nbClients, setNbClients] = useState('')
  const [sharedWith, setSharedWith] = useState<string[]>([])
  const [shareToggle, setShareToggle] = useState(false)

  const dateRef = useRef<HTMLInputElement>(null)

  function toggleShare(id: string) {
    setSharedWith(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const formattedDate = startDate
    ? new Date(startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const hasOtherBusinesses = all.length > 1

  return (
    <>
      {/* MOBILE */}
      <div className="lg:hidden px-4 py-6 flex flex-col gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-muted-foreground mb-2"
        >
          <ArrowLeft className="size-4" />
          Retour
        </button>
        <p className="text-lg font-semibold text-foreground">Nouvelle activité</p>
        <ActivityForm
          company={company} setCompany={setCompany}
          showCompanyPicker={showCompanyPicker} setShowCompanyPicker={setShowCompanyPicker}
          startDate={startDate} setStartDate={setStartDate}
          formattedDate={formattedDate} dateRef={dateRef}
          nbDirect={nbDirect} setNbDirect={setNbDirect}
          nbTotal={nbTotal} setNbTotal={setNbTotal}
          nbClients={nbClients} setNbClients={setNbClients}
          hasOtherBusinesses={hasOtherBusinesses} all={all}
          shareToggle={shareToggle} setShareToggle={setShareToggle}
          sharedWith={sharedWith} toggleShare={toggleShare}
          onSubmit={create}
        />
      </div>

      {/* DESKTOP */}
      <div className="hidden lg:block">
        <div className="max-w-2xl mx-auto px-6 py-10">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
            >
              <ArrowLeft className="size-4" />
            </button>
            <h1 className="text-lg font-semibold text-foreground">Nouvelle activité</h1>
          </div>

          {/* 2-col grid */}
          <div className="grid grid-cols-3 gap-5 items-start">
            {/* Left — 2/3 */}
            <div className="col-span-2 flex flex-col gap-4">
              <ActivityForm
                company={company} setCompany={setCompany}
                showCompanyPicker={showCompanyPicker} setShowCompanyPicker={setShowCompanyPicker}
                startDate={startDate} setStartDate={setStartDate}
                formattedDate={formattedDate} dateRef={dateRef}
                nbDirect={nbDirect} setNbDirect={setNbDirect}
                nbTotal={nbTotal} setNbTotal={setNbTotal}
                nbClients={nbClients} setNbClients={setNbClients}
                hasOtherBusinesses={hasOtherBusinesses} all={all}
                shareToggle={shareToggle} setShareToggle={setShareToggle}
                sharedWith={sharedWith} toggleShare={toggleShare}
              />
            </div>

            {/* Right — 1/3 sticky */}
            <div className="col-span-1 sticky top-20 flex flex-col gap-3">
              {/* Summary card */}
              <div className="rounded-2xl border border-border bg-surface shadow-card overflow-hidden">
                <div className="px-4 py-3.5 border-b border-border">
                  <p className="text-sm font-semibold text-foreground">Résumé</p>
                </div>
                <div className="px-4 py-5 flex flex-col items-center gap-3">
                  {company ? (
                    <>
                      <div
                        className="flex size-14 items-center justify-center rounded-full text-lg font-bold text-white"
                        style={{ backgroundColor: '#F97316' }}
                      >
                        {company.slice(0, 2).toUpperCase()}
                      </div>
                      <p className="text-sm font-semibold text-foreground text-center">{company}</p>
                    </>
                  ) : (
                    <div className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground text-lg font-bold">
                      ?
                    </div>
                  )}
                  {formattedDate ? (
                    <p className="text-xs text-muted-foreground text-center">depuis le {formattedDate}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground/50 text-center">Date non définie</p>
                  )}
                </div>
              </div>

              {/* CTA */}
              <button
                type="button"
                onClick={create}
                disabled={!company.trim() || creating}
                className="w-full rounded-2xl bg-primary py-4 text-base font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {"Créer l'activité"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

/* ── Shared form ── */
interface FormProps {
  company: string
  setCompany: (v: string) => void
  showCompanyPicker: boolean
  setShowCompanyPicker: (v: boolean | ((prev: boolean) => boolean)) => void
  startDate: string
  setStartDate: (v: string) => void
  formattedDate: string | null
  dateRef: React.RefObject<HTMLInputElement | null>
  nbDirect: string
  setNbDirect: (v: string) => void
  nbTotal: string
  setNbTotal: (v: string) => void
  nbClients: string
  setNbClients: (v: string) => void
  hasOtherBusinesses: boolean
  all: { id: string; name: string; initials: string; color: string }[]
  shareToggle: boolean
  setShareToggle: (v: boolean) => void
  sharedWith: string[]
  toggleShare: (id: string) => void
  onSubmit?: () => void
}

function ActivityForm({
  company, setCompany,
  showCompanyPicker, setShowCompanyPicker,
  startDate, setStartDate,
  formattedDate, dateRef,
  nbDirect, setNbDirect,
  nbTotal, setNbTotal,
  nbClients, setNbClients,
  hasOtherBusinesses, all,
  shareToggle, setShareToggle,
  sharedWith, toggleShare,
  onSubmit,
}: FormProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Activité */}
      <Card className="p-0 overflow-hidden">
        <div className="px-4 py-3.5 border-b border-border">
          <p className="text-sm font-semibold text-foreground">Activité</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCompanyPicker(v => !v)}
          className="flex w-full items-center justify-between px-4 py-3.5 border-b border-border"
        >
          <span className={cn('text-sm', company ? 'text-foreground font-medium' : 'text-muted-foreground')}>
            {company || "Choisir une entreprise…"}
          </span>
          <ChevronDown className={cn('size-4 text-muted-foreground transition-transform shrink-0', showCompanyPicker && 'rotate-180')} />
        </button>
        {showCompanyPicker && (
          <div className="max-h-44 overflow-y-auto border-b border-border">
            {COMPANIES.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => { setCompany(c); setShowCompanyPicker(false) }}
                className="flex w-full items-center justify-between px-4 py-3 text-sm text-foreground hover:bg-muted transition-colors"
              >
                {c}
                {company === c && <span className="size-2 rounded-full bg-primary" />}
              </button>
            ))}
          </div>
        )}
        <div className="relative">
          <button
            type="button"
            onClick={() => dateRef.current?.showPicker()}
            className="flex w-full items-center justify-between px-4 py-3.5"
          >
            <span className={cn('text-sm', startDate ? 'text-foreground font-medium' : 'text-muted-foreground')}>
              {formattedDate ?? "Date de démarrage"}
            </span>
            <Calendar className="size-4 text-muted-foreground shrink-0" />
          </button>
          <input
            ref={dateRef}
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="absolute inset-0 opacity-0 pointer-events-none"
          />
        </div>
      </Card>

      {/* Structure initiale */}
      <Card className="p-0 overflow-hidden">
        <div className="px-4 py-3.5 border-b border-border flex items-baseline gap-2">
          <p className="text-sm font-semibold text-foreground">Structure initiale</p>
          <span className="text-xs text-muted-foreground">— optionnel</span>
        </div>
        <div className="grid grid-cols-3 gap-2 px-4 py-3.5">
          {[
            { line1: 'Partenaires', line2: 'directs', value: nbDirect, set: setNbDirect },
            { line1: 'Organisation', line2: 'totale', value: nbTotal, set: setNbTotal },
            { line1: 'Clients', line2: 'directs', value: nbClients, set: setNbClients },
          ].map(({ line1, line2, value, set }) => (
            <div key={line1} className="flex flex-col items-center gap-0.5 rounded-xl bg-muted/50 px-2 py-2.5">
              <input
                type="number"
                min="0"
                value={value}
                onChange={e => set(e.target.value)}
                placeholder="0"
                className="w-full bg-transparent text-center text-lg font-bold text-foreground outline-none placeholder:text-muted-foreground/40 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
              />
              <p className="text-xs text-muted-foreground text-center leading-tight">{line1}<br />{line2}</p>
            </div>
          ))}
        </div>
      </Card>


      {/* Base de contacts */}
      {hasOtherBusinesses && (
        <Card className="p-0 overflow-hidden">
          <div className="px-4 py-3.5 border-b border-border">
            <p className="text-sm font-semibold text-foreground">Base de contacts</p>
          </div>
          <div className="max-h-52 overflow-y-auto">
            {all.map(b => (
              <button
                key={b.id}
                type="button"
                onClick={() => toggleShare(b.id)}
                className={cn(
                  'flex w-full items-center justify-between px-4 py-3.5 border-b border-border last:border-0 transition-colors',
                  sharedWith.includes(b.id) ? 'bg-primary/5' : ''
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: b.color }}
                  >
                    {b.initials}
                  </span>
                  <span className="text-sm font-medium text-foreground">{b.name}</span>
                </div>
                <div className={cn(
                  'size-5 rounded flex items-center justify-center border transition-colors',
                  sharedWith.includes(b.id) ? 'bg-primary border-primary' : 'border-border'
                )}>
                  {sharedWith.includes(b.id) && (
                    <svg viewBox="0 0 12 12" className="size-3 text-white fill-none stroke-current stroke-2">
                      <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* CTA — mobile uniquement */}
      {onSubmit && (
        <button
          type="button"
          onClick={onSubmit}
          className="w-full rounded-2xl bg-primary py-4 text-base font-semibold text-primary-foreground active:opacity-90 transition-opacity"
        >
          {"Créer l'activité"}
        </button>
      )}
    </div>
  )
}
