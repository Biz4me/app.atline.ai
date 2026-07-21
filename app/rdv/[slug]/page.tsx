'use client'

import { use, useState, useEffect, useCallback } from 'react'
import { CalendarCheck, Check, Loader2 } from 'lucide-react'

const DOW3 = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
const MONTHS = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'aoû', 'sep', 'oct', 'nov', 'déc']
const fmtSlot = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

export default function BookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [host, setHost] = useState<{ found: boolean; firstName?: string } | null>(null)
  const [days] = useState(() => Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + i); return d }))
  const [selected, setSelected] = useState<Date>(days[0])
  const [slots, setSlots] = useState<string[] | null>(null)
  const [chosen, setChosen] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => { fetch(`/api/booking/${slug}`).then((r) => r.json()).then(setHost).catch(() => setHost({ found: false })) }, [slug])

  const loadSlots = useCallback(async (d: Date) => {
    setSlots(null); setChosen(null)
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const r = await fetch(`/api/booking/${slug}/slots?date=${date}`)
    setSlots(r.ok ? (await r.json()).slots ?? [] : [])
  }, [slug])

  useEffect(() => { loadSlots(selected) }, [selected, loadSlots])

  async function book() {
    if (!chosen || !name.trim()) return
    setBusy(true)
    const r = await fetch(`/api/booking/${slug}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim(), email: email.trim(), slot: chosen }) })
    setBusy(false)
    if (r.ok) setDone(true)
    else if (r.status === 409) { alert('Ce créneau vient d\'être pris, choisis-en un autre.'); loadSlots(selected) }
    else alert('Échec de la réservation.')
  }

  if (host && !host.found) return <Centered><p className="text-sm text-muted-foreground">Lien de réservation introuvable.</p></Centered>

  if (done) return (
    <Centered>
      <div className="flex size-14 items-center justify-center rounded-full bg-success/10"><Check className="size-7 text-success" /></div>
      <h1 className="text-xl font-bold text-foreground">RDV confirmé !</h1>
      <p className="text-sm text-muted-foreground">{DOW3[selected.getDay()]} {selected.getDate()} {MONTHS[selected.getMonth()]} à {chosen && fmtSlot(chosen)} avec {host?.firstName}.</p>
    </Centered>
  )

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background px-4 py-8">
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10"><CalendarCheck className="size-6 text-primary" /></div>
        <h1 className="text-xl font-bold text-foreground">Réserver avec {host?.firstName ?? '…'}</h1>
        <p className="text-xs text-muted-foreground">Choisis un créneau qui te convient.</p>
      </div>

      {/* Jours */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {days.map((d, i) => {
          const sel = d.toDateString() === selected.toDateString()
          return (
            <button key={i} type="button" onClick={() => setSelected(d)}
              className={`flex min-w-[52px] shrink-0 flex-col items-center gap-0.5 rounded-xl border px-2 py-2 ${sel ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-surface text-foreground'}`}>
              <span className="text-2xs font-bold uppercase opacity-80">{DOW3[d.getDay()]}</span>
              <span className="text-base font-bold">{d.getDate()}</span>
              <span className="text-2xs opacity-80">{MONTHS[d.getMonth()]}</span>
            </button>
          )
        })}
      </div>

      {/* Créneaux */}
      {slots === null ? (
        <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
      ) : slots.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Aucun créneau ce jour.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {slots.map((s) => (
            <button key={s} type="button" onClick={() => setChosen(s)}
              className={`rounded-xl border py-2.5 text-sm font-bold ${chosen === s ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-surface text-foreground active:bg-muted'}`}>{fmtSlot(s)}</button>
          ))}
        </div>
      )}

      {/* Formulaire */}
      {chosen && (
        <div className="mt-6 flex flex-col gap-3 border-t border-border pt-5">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ton prénom et nom"
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Ton email (optionnel)"
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground" />
          <button type="button" onClick={book} disabled={busy || !name.trim()}
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-primary py-3 text-base font-semibold text-primary-foreground disabled:opacity-50">
            {busy && <Loader2 className="size-4 animate-spin" />}Confirmer le {fmtSlot(chosen)}
          </button>
        </div>
      )}
    </div>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background px-6 text-center">{children}</div>
}
