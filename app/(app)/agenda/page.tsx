'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, Plus, X, Check, Trash2, User, CalendarCheck, Share2, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { WhenPicker } from '@/components/when-picker'

/* ── Types & helpers ────────────────────────────────────────── */
type Appt = {
  id: string; title: string; startAt: string; type: string; done: boolean
  contactId: string | null; contactName: string | null; contactCity: string | null
}
type GEvent = { id: string; title: string; start: string; end: string; allDay: boolean }

const DOW1 = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const DOW3 = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const TYPE_LABEL: Record<string, string> = { CALL: 'Appel', VISIO: 'Visio', PRESENTIEL: 'Présentiel', WEBINAIRE: 'Webinaire', FORMATION: 'Formation', AUTRE: 'RDV' }
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
const TIMES: string[] = []
for (let h = 8; h <= 20; h++) for (const m of [0, 15, 30, 45]) { if (h === 20 && m > 0) continue; TIMES.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`) }

const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
const startOfWeek = (d: Date) => { const x = startOfDay(d); return addDays(x, -((x.getDay() + 6) % 7)) }
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
const pad2 = (n: number) => String(n).padStart(2, '0')
const toLocalInput = (iso: string) => { const dt = new Date(iso); return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}T${pad2(dt.getHours())}:${pad2(dt.getMinutes())}` }

type View = 'jour' | 'semaine' | 'mois'

/* ── Page (route) — wrapper mince ; la vue réutilisable est AgendaView ── */
export default function AgendaPage() { return <AgendaView /> }

export function AgendaView({ embedded = false, onClose }: { embedded?: boolean; onClose?: () => void }) {
  const router = useRouter()
  const today = startOfDay(new Date())
  const [view, setView] = useState<View>('jour')
  const [selected, setSelected] = useState<Date>(today)
  const [appts, setAppts] = useState<Appt[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [detail, setDetail] = useState<Appt | null>(null)
  const [calConnected, setCalConnected] = useState(true) // true par défaut → pas de flash de la bannière
  const [gevents, setGevents] = useState<GEvent[]>([])
  const [username, setUsername] = useState<string | null>(null)
  const search = useSearchParams()

  const load = useCallback(async () => {
    const [aRes, cRes] = await Promise.all([fetch('/api/appointments'), fetch('/api/calendar')])
    if (aRes.ok) setAppts(await aRes.json())
    if (cRes.ok) {
      const c = await cRes.json()
      setCalConnected(!!c.connected)
      setUsername(c.username ?? null)
      if (c.connected) {
        const eRes = await fetch('/api/calendar/events')
        if (eRes.ok) setGevents((await eRes.json()).events ?? [])
      } else setGevents([])
    }
  }, [])
  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (embedded) return
    const cal = search.get('cal')
    if (cal === 'ok') { toast.success('Google Agenda connecté'); router.replace('/agenda') }
    else if (cal === 'err') { toast.error('Connexion Google échouée'); router.replace('/agenda') }
  }, [search, router, embedded])

  const apptsOn = (d: Date) => appts.filter((a) => sameDay(new Date(a.startAt), d)).sort((a, b) => a.startAt.localeCompare(b.startAt))
  const daysWithAppt = new Set(appts.map((a) => startOfDay(new Date(a.startAt)).getTime()))

  return (
    <div className={embedded ? 'flex flex-col bg-background' : 'flex min-h-dvh flex-col bg-background'}>
      {/* Header — route uniquement (en panneau, la topbar reste visible au-dessus) */}
      {!embedded && (
        <header className="sticky top-0 z-30 flex items-center gap-3 bg-background/90 px-4 py-3 backdrop-blur lg:mx-auto lg:h-[68px] lg:w-full lg:max-w-6xl lg:py-0 lg:px-10" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
          {/* Gabarit desktop : titre centré discret (mobile : géré par la top-bar) */}
          <h1 className="hidden text-base font-semibold text-foreground lg:block lg:absolute lg:left-1/2 lg:-translate-x-1/2">Agenda</h1>
          <button type="button" onClick={() => setCreateOpen(true)} className="ml-auto flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm active:opacity-80"><Plus className="size-5 stroke-2" /></button>
        </header>
      )}

      {/* Tabs (+ bouton créer en mode panneau) */}
      <div className={cn('border-b border-border bg-background px-4 py-2 lg:mx-auto lg:w-full lg:max-w-6xl lg:px-10', !embedded && 'sticky top-[57px] z-20')}>
        <div className="flex items-center gap-2 lg:max-w-xs">
          <div className="grid flex-1 grid-cols-3 gap-1 rounded-xl bg-muted p-1">
            {(['jour', 'semaine', 'mois'] as View[]).map((v) => (
              <button key={v} type="button" onClick={() => setView(v)}
                className={cn('rounded-lg py-2 text-lg lg:text-sm font-semibold capitalize transition-all', view === v ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground')}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          {embedded && <button type="button" onClick={() => setCreateOpen(true)} className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm active:opacity-80"><Plus className="size-5 stroke-2" /></button>}
        </div>
      </div>

      <div className={cn('flex-1 px-4 pt-4 lg:px-10 lg:pt-6 lg:max-w-6xl lg:mx-auto lg:w-full', embedded ? 'pb-6' : 'pb-24')}>
        {/* ⚠️ PHASE 2 — À ACTIVER (config Google Cloud requise, sinon "Connecter" renvoie une erreur Google) :
            1) activer Google Calendar API  2) scope calendar.readonly au consent screen
            3) redirect URI https://app.atline.ai/api/calendar/callback  4) publishing "Production" (non vérifiée) ou testeur.
            Détails : atline.ai production/Application/Concept_Agenda_Calendrier.md */}
        {!calConnected && (
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-3.5">
            <CalendarCheck className="size-5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-lg lg:text-sm font-bold text-foreground">Connecte ton Google Agenda</p>
              <p className="text-lg lg:text-sm leading-snug text-muted-foreground">Pour voir tes vrais créneaux et éviter les conflits.</p>
            </div>
            <a href="/api/calendar/connect" className="shrink-0 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground">Connecter</a>
          </div>
        )}
        {username && (
          <button type="button"
            onClick={() => { navigator.clipboard?.writeText(`${location.origin}/rdv/${username}`); toast.success('Lien de réservation copié') }}
            className="mb-4 flex w-full items-center gap-2.5 rounded-2xl border border-border bg-surface px-4 py-3 text-left active:bg-muted">
            <Share2 className="size-4 shrink-0 text-primary" />
            <span className="min-w-0 flex-1 truncate text-lg lg:text-sm font-medium text-foreground">Mon lien de RDV — partage-le à tes prospects</span>
            <span className="shrink-0 text-xs font-bold text-primary">Copier</span>
          </button>
        )}
        {view === 'jour' && <JourView selected={selected} setSelected={setSelected} today={today} apptsOn={apptsOn} gevents={gevents} onTap={setDetail} onCreate={() => setCreateOpen(true)} />}
        {view === 'semaine' && <SemaineView selected={selected} setSelected={setSelected} today={today} appts={appts} gevents={gevents} onTap={setDetail} />}
        {view === 'mois' && <MoisView selected={selected} setSelected={(d) => { setSelected(d); setView('jour') }} today={today} daysWithAppt={daysWithAppt} />}
      </div>

      {createOpen && <CreateSheet day={selected} onClose={() => setCreateOpen(false)} onDone={load} />}
      {detail && <DetailSheet appt={detail} onClose={() => setDetail(null)} onChanged={load}
        onContact={(cid) => { setDetail(null); if (embedded) onClose?.(); router.push(`/contacts/${cid}`) }} />}
    </div>
  )
}

/* ── Vue Jour ───────────────────────────────────────────────── */
function JourView({ selected, setSelected, today, apptsOn, gevents, onTap, onCreate }: {
  selected: Date; setSelected: (d: Date) => void; today: Date
  apptsOn: (d: Date) => Appt[]; gevents: GEvent[]; onTap: (a: Appt) => void; onCreate: () => void
}) {
  const weekStart = startOfWeek(selected)
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const list = apptsOn(selected)
  const gday = gevents.filter((e) => sameDay(new Date(e.start), selected))
  const items = [
    ...list.map((a) => ({ t: a.startAt, rdv: a as Appt | null, g: null as GEvent | null })),
    ...gday.map((e) => ({ t: e.start, rdv: null as Appt | null, g: e as GEvent | null })),
  ].sort((x, y) => x.t.localeCompare(y.t))

  return (
    <div className="flex flex-col gap-4">
      {/* Bande semaine */}
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => setSelected(addDays(selected, -7))} className="flex size-8 items-center justify-center rounded-lg text-muted-foreground active:bg-muted"><ChevronLeft className="size-4" /></button>
        <div className="grid flex-1 grid-cols-7 gap-1">
          {days.map((d, i) => {
            const isSel = sameDay(d, selected); const isToday = sameDay(d, today)
            return (
              <button key={i} type="button" onClick={() => setSelected(d)} className="flex flex-col items-center gap-1 py-1">
                <span className="text-[10px] font-bold text-muted-foreground">{DOW1[i]}</span>
                <span className={cn('flex size-8 items-center justify-center rounded-full text-lg lg:text-sm font-bold',
                  isSel ? 'bg-primary text-primary-foreground' : isToday ? 'border-2 border-primary text-primary' : 'text-foreground')}>{d.getDate()}</span>
              </button>
            )
          })}
        </div>
        <button type="button" onClick={() => setSelected(addDays(selected, 7))} className="flex size-8 items-center justify-center rounded-lg text-muted-foreground active:bg-muted"><ChevronRight className="size-4" /></button>
      </div>

      <p className="text-lg font-bold capitalize text-foreground">{DOW3[(selected.getDay() + 6) % 7]} {selected.getDate()} {MONTHS[selected.getMonth()]}</p>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-8 text-center">
          <p className="text-lg text-muted-foreground">Aucun rendez-vous ce jour</p>
          <button type="button" onClick={onCreate} className="rounded-xl border border-border px-4 py-2 text-lg lg:text-sm font-semibold text-foreground active:bg-muted">+ Nouveau RDV</button>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {items.map((it) => it.rdv ? (
            <button key={it.rdv.id} type="button" onClick={() => onTap(it.rdv!)}
              className={cn('flex w-full items-center gap-3.5 rounded-2xl border border-border bg-surface p-4 text-left shadow-card active:bg-muted', it.rdv.done && 'opacity-60')}>
              <span className="font-display text-lg font-bold tabular-nums text-foreground shrink-0">{fmtTime(it.rdv.startAt)}</span>
              <div className="flex flex-1 flex-col gap-1.5 min-w-0">
                <span className="self-start rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">{TYPE_LABEL[it.rdv.type] ?? 'RDV'}</span>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={cn('truncate text-lg font-semibold text-foreground', it.rdv.done && 'line-through')}>{it.rdv.title}</span>
                  {it.rdv.contactName && <span className="shrink-0 text-xs text-muted-foreground">· {it.rdv.contactName}</span>}
                </div>
              </div>
              {it.rdv.done ? <Check className="size-4 shrink-0 text-success" /> : <ChevronRight className="size-4 shrink-0 stroke-[1.5] text-muted-foreground" />}
            </button>
          ) : (
            <div key={it.g!.id} className="flex w-full items-center gap-3.5 rounded-2xl border border-dashed border-border bg-muted/30 p-4">
              <span className="font-display text-lg font-bold tabular-nums text-muted-foreground shrink-0">{it.g!.allDay ? '—' : fmtTime(it.g!.start)}</span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="self-start rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Google</span>
                <span className="truncate text-lg lg:text-sm font-medium text-muted-foreground">{it.g!.title}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Vue Semaine ────────────────────────────────────────────── */
function SemaineView({ selected, setSelected, today, appts, gevents, onTap }: {
  selected: Date; setSelected: (d: Date) => void; today: Date; appts: Appt[]; gevents: GEvent[]; onTap: (a: Appt) => void
}) {
  const weekStart = startOfWeek(selected)
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setSelected(addDays(selected, -7))} className="flex size-8 items-center justify-center rounded-lg text-muted-foreground active:bg-muted"><ChevronLeft className="size-4" /></button>
        <p className="text-lg lg:text-sm font-bold capitalize text-foreground">{weekStart.getDate()}–{addDays(weekStart, 6).getDate()} {MONTHS[addDays(weekStart, 6).getMonth()]}</p>
        <button type="button" onClick={() => setSelected(addDays(selected, 7))} className="flex size-8 items-center justify-center rounded-lg text-muted-foreground active:bg-muted"><ChevronRight className="size-4" /></button>
      </div>
      <div className="flex">
        <div className="w-9 shrink-0" />
        {days.map((d, i) => (
          <button key={i} type="button" onClick={() => setSelected(d)} className="flex flex-1 flex-col items-center gap-0.5">
            <span className="text-[10px] font-bold text-muted-foreground">{DOW1[i]}</span>
            <span className={cn('flex size-6 items-center justify-center rounded-full text-lg lg:text-sm font-bold',
              sameDay(d, selected) ? 'bg-primary text-primary-foreground' : sameDay(d, today) ? 'border-2 border-primary text-primary' : 'text-foreground')}>{d.getDate()}</span>
          </button>
        ))}
      </div>
      <div className="overflow-hidden rounded-xl border border-border">
        {HOURS.map((h) => (
          <div key={h} className="flex border-t border-border first:border-t-0">
            <div className="flex w-9 shrink-0 items-start justify-end pr-1.5 pt-1"><span className="text-[10px] text-muted-foreground tabular-nums">{h}h</span></div>
            {days.map((d, di) => {
              const a = appts.find((x) => { const t = new Date(x.startAt); return sameDay(t, d) && t.getHours() === h })
              const g = !a && gevents.find((x) => { const t = new Date(x.start); return !x.allDay && sameDay(t, d) && t.getHours() === h })
              return (
                <button key={di} type="button" onClick={() => a && onTap(a)}
                  className={cn('flex flex-1 items-start border-l border-border p-0.5 min-h-[38px]', a ? 'active:opacity-80' : 'active:bg-muted/50')}>
                  {a ? <span className="w-full rounded bg-primary/10 px-1 py-0.5 text-[10px] font-bold leading-tight text-primary">{(a.contactName || a.title).split(' ')[0]}</span>
                    : g ? <span className="w-full truncate rounded bg-muted px-1 py-0.5 text-[10px] font-medium leading-tight text-muted-foreground">{g.title.split(' ')[0]}</span>
                    : null}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Vue Mois ───────────────────────────────────────────────── */
function MoisView({ selected, setSelected, today, daysWithAppt }: {
  selected: Date; setSelected: (d: Date) => void; today: Date; daysWithAppt: Set<number>
}) {
  const first = new Date(selected.getFullYear(), selected.getMonth(), 1)
  const offset = (first.getDay() + 6) % 7
  const nbDays = new Date(selected.getFullYear(), selected.getMonth() + 1, 0).getDate()
  const cells: (Date | null)[] = [...Array(offset).fill(null), ...Array.from({ length: nbDays }, (_, i) => new Date(selected.getFullYear(), selected.getMonth(), i + 1))]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setSelected(new Date(selected.getFullYear(), selected.getMonth() - 1, 1))} className="flex size-8 items-center justify-center rounded-lg text-muted-foreground active:bg-muted"><ChevronLeft className="size-4" /></button>
        <p className="text-lg font-bold capitalize text-foreground">{MONTHS[selected.getMonth()]} {selected.getFullYear()}</p>
        <button type="button" onClick={() => setSelected(new Date(selected.getFullYear(), selected.getMonth() + 1, 1))} className="flex size-8 items-center justify-center rounded-lg text-muted-foreground active:bg-muted"><ChevronRight className="size-4" /></button>
      </div>
      <div className="flex">{DOW1.map((d, i) => <div key={i} className="flex flex-1 justify-center"><span className="text-[10px] font-bold text-muted-foreground">{d}</span></div>)}</div>
      <div className="flex flex-wrap">
        {cells.map((d, i) => (
          <button key={i} type="button" onClick={() => d && setSelected(d)} className="flex flex-col items-center gap-0.5 py-1.5 active:bg-muted/50 rounded-lg" style={{ width: `${100 / 7}%` }}>
            {d && (
              <>
                <span className={cn('flex size-7 items-center justify-center rounded-full text-lg lg:text-sm font-semibold', sameDay(d, today) ? 'border-2 border-primary font-bold text-primary' : 'text-foreground')}>{d.getDate()}</span>
                <span className={cn('size-1.5 rounded-full', daysWithAppt.has(startOfDay(d).getTime()) ? 'bg-primary' : 'bg-transparent')} />
              </>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ── Création ───────────────────────────────────────────────── */
function CreateSheet({ day: initDay, onClose, onDone }: { day: Date; onClose: () => void; onDone: () => void }) {
  const [day, setDay] = useState(() => startOfDay(initDay))
  const [title, setTitle] = useState('')
  const [type, setType] = useState('AUTRE')
  const [time, setTime] = useState('09:00')
  const [busy, setBusy] = useState(false)
  const input = 'w-full rounded-xl border border-border bg-background px-4 py-3 text-lg lg:text-sm text-foreground outline-none placeholder:text-muted-foreground'
  const label = 'mb-1.5 block text-xs font-bold uppercase tracking-widest text-muted-foreground'

  async function submit() {
    setBusy(true)
    const startAt = new Date(`${day.getFullYear()}-${pad2(day.getMonth() + 1)}-${pad2(day.getDate())}T${time}`).toISOString()
    const res = await fetch('/api/appointments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: title.trim() || 'Rendez-vous', startAt, type }) })
    setBusy(false)
    if (res.ok) { toast.success('RDV ajouté'); onDone(); onClose() } else toast.error('Échec')
  }

  return (
    <div className="fixed inset-0 z-[80] flex flex-col">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="max-h-[92dvh] overflow-y-auto rounded-t-3xl bg-background pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto mb-3 mt-3 h-1 w-10 rounded-full bg-border" />
        <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-background px-4 pb-3">
          <button type="button" onClick={onClose} className="text-lg lg:text-sm font-medium text-muted-foreground">Annuler</button>
          <h2 className="flex-1 text-center text-lg lg:text-sm font-bold text-foreground">Nouveau RDV</h2>
          <button type="button" onClick={submit} disabled={busy} className="rounded-xl bg-primary px-4 py-1.5 text-lg lg:text-sm font-bold text-primary-foreground disabled:opacity-50">OK</button>
        </div>
        <div className="flex flex-col gap-4 px-4 py-5">
          {/* Jour (repris de l'agenda, ajustable) */}
          <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-2 py-1.5">
            <button type="button" onClick={() => setDay(addDays(day, -1))} className="flex size-8 items-center justify-center rounded-lg text-muted-foreground active:bg-muted"><ChevronLeft className="size-4" /></button>
            <span className="text-lg lg:text-sm font-bold capitalize text-foreground">{DOW3[(day.getDay() + 6) % 7]} {day.getDate()} {MONTHS[day.getMonth()]}</span>
            <button type="button" onClick={() => setDay(addDays(day, 1))} className="flex size-8 items-center justify-center rounded-lg text-muted-foreground active:bg-muted"><ChevronRight className="size-4" /></button>
          </div>
          <div><label className={label}>Objet</label><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Présentation, suivi…" className={input} /></div>
          <div><label className={label}>Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className={input}>
              {['CALL', 'VISIO', 'PRESENTIEL', 'WEBINAIRE', 'FORMATION', 'AUTRE'].map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Heure</label>
            <select value={time} onChange={(e) => setTime(e.target.value)} className={input}>
              {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Détail / actions ───────────────────────────────────────── */
function DetailSheet({ appt, onClose, onChanged, onContact }: { appt: Appt; onClose: () => void; onChanged: () => void; onContact: (cid: string) => void }) {
  const d = new Date(appt.startAt)
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(appt.title)
  const [type, setType] = useState(appt.type)
  const [when, setWhen] = useState(() => toLocalInput(appt.startAt))

  async function patch(body: Record<string, unknown>, msg: string) {
    const res = await fetch(`/api/appointments/${appt.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (res.ok) { toast.success(msg); onChanged(); onClose() } else toast.error('Échec')
  }
  async function remove() {
    const res = await fetch(`/api/appointments/${appt.id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('RDV annulé'); onChanged(); onClose() } else toast.error('Échec')
  }
  const row = 'flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 text-left text-lg lg:text-sm font-medium text-foreground active:bg-muted w-full'
  const input = 'w-full rounded-xl border border-border bg-background px-4 py-3 text-lg lg:text-sm text-foreground outline-none placeholder:text-muted-foreground'

  return (
    <div className="fixed inset-0 z-[80] flex flex-col">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="max-h-[92dvh] overflow-y-auto rounded-t-3xl bg-background pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto mb-3 mt-3 h-1 w-10 rounded-full bg-border" />
        <div className="flex items-start gap-3 px-5 pb-3">
          <div className="min-w-0 flex-1">
            <p className="text-lg lg:text-sm font-bold text-foreground">{editing ? 'Modifier le RDV' : appt.title}</p>
            {!editing && <p className="mt-0.5 text-xs text-muted-foreground">{DOW3[(d.getDay() + 6) % 7]} {d.getDate()} {MONTHS[d.getMonth()]} · {fmtTime(appt.startAt)} · {TYPE_LABEL[appt.type] ?? 'RDV'}{appt.contactName ? ` · ${appt.contactName}` : ''}</p>}
          </div>
          <button type="button" onClick={onClose}><X className="size-4 text-muted-foreground" /></button>
        </div>

        {editing ? (
          <div className="flex flex-col gap-4 px-5 py-3">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Objet" className={input} />
            <select value={type} onChange={(e) => setType(e.target.value)} className={input}>
              {['CALL', 'VISIO', 'PRESENTIEL', 'WEBINAIRE', 'FORMATION', 'AUTRE'].map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
            </select>
            <WhenPicker value={when} onChange={setWhen} />
            <div className="flex gap-2">
              <button type="button" onClick={() => setEditing(false)} className="flex-1 rounded-xl border border-border py-2.5 text-lg lg:text-sm font-medium text-muted-foreground active:bg-muted">Retour</button>
              <button type="button" onClick={() => patch({ title: title.trim() || 'Rendez-vous', type, startAt: new Date(when).toISOString() }, 'RDV modifié')} className="flex-1 rounded-xl bg-primary py-2.5 text-lg lg:text-sm font-bold text-primary-foreground">Enregistrer</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 px-5 py-2">
            {appt.contactId && <button type="button" onClick={() => onContact(appt.contactId!)} className={row}><User className="size-4 text-primary" />Voir la fiche de {appt.contactName ?? 'ce contact'}</button>}
            <button type="button" onClick={() => setEditing(true)} className={row}><Pencil className="size-4 text-primary" />Modifier le RDV</button>
            <button type="button" onClick={() => patch({ done: !appt.done }, appt.done ? 'Remis à faire' : 'Marqué fait')} className={row}><Check className="size-4 text-success" />{appt.done ? 'Remettre à faire' : 'Marquer comme fait'}</button>
            <button type="button" onClick={remove} className={cn(row, 'text-[#EF4444]')}><Trash2 className="size-4" />Annuler le RDV</button>
          </div>
        )}
      </div>
    </div>
  )
}
