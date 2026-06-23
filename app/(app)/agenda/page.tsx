'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Plus, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

/* ── Data ───────────────────────────────────────────────────── */
type Appt = {
  id: string
  time: string
  hour: number
  type: string
  typeColor: string
  name: string
  city: string
  dayIndex: number // 0=lun, day of week in current week
}

const appts: Appt[] = [
  { id: 'a1', time: '09:00', hour: 9, type: 'Découverte', typeColor: 'bg-blue-100 text-blue-700', name: 'Thomas Bernard', city: 'Lyon', dayIndex: 0 },
  { id: 'a2', time: '14:00', hour: 14, type: 'Closing', typeColor: 'bg-red-100 text-red-600', name: 'Sophie Laurent', city: 'Paris', dayIndex: 3 },
  { id: 'a3', time: '16:30', hour: 16, type: 'Découverte', typeColor: 'bg-blue-100 text-blue-700', name: 'Julie Moreau', city: 'Paris', dayIndex: 3 },
  { id: 'a4', time: '11:00', hour: 11, type: 'Suivi', typeColor: 'bg-amber-100 text-amber-700', name: 'Karim Haddad', city: 'Marseille', dayIndex: 4 },
]

/* Today = 2026-06-18, jeudi (dayIndex 3 in Mon-based week) */
const TODAY_DOM = 18
const TODAY_DOW = 3 // 0=lun

const DOW_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const DOW_FULL = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTH_LABEL = 'juin 2026'
const DAY_LABEL = 'jeudi 18 juin'

/* Week header: dom 15→21 June 2026 */
const WEEK_START_DOM = 15
const weekDoms = DOW_LABELS.map((_, i) => WEEK_START_DOM + i)

/* Month grid for June 2026 (starts on Monday) */
const JUNE_START_DOW = 0 // Monday=0, June 1 is Monday
const JUNE_DAYS = 30
const monthCells: (number | null)[] = [
  ...Array(JUNE_START_DOW).fill(null),
  ...Array.from({ length: JUNE_DAYS }, (_, i) => i + 1),
]
while (monthCells.length % 7 !== 0) monthCells.push(null)

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]

/* ── Component ──────────────────────────────────────────────── */
type View = 'jour' | 'semaine' | 'mois'

export default function AgendaPage() {
  const router = useRouter()
  const [view, setView] = useState<View>('jour')

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Header */}
      <header
        className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur lg:px-8"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <button
          type="button"
          onClick={() => router.back()}
          className="-ml-1 flex size-9 items-center justify-center rounded-full text-muted-foreground active:bg-muted lg:hidden"
        >
          <ChevronLeft className="size-5 stroke-[1.5]" />
        </button>
        <h1 className="flex-1 font-display text-lg font-bold text-foreground lg:text-2xl">Agenda</h1>
      </header>

      {/* View tabs */}
      <div className="sticky top-[57px] z-20 border-b border-border bg-background px-4 py-2 lg:px-8">
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1 lg:max-w-xs">
          {(['jour', 'semaine', 'mois'] as View[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={cn(
                'rounded-lg py-2 text-sm font-semibold capitalize transition-all',
                view === v ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground'
              )}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-4 pt-4 pb-8 lg:px-8 lg:pt-6 lg:max-w-5xl lg:mx-auto lg:w-full">
        {view === 'jour' && <JourView />}
        {view === 'semaine' && <SemaineView />}
        {view === 'mois' && <MoisView />}
      </div>
    </div>
  )
}

/* ── Jour ───────────────────────────────────────────────────── */
function JourView() {
  const dayAppts = appts.filter((a) => a.dayIndex === TODAY_DOW)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center">
        <p className="flex-1 text-lg font-bold capitalize text-foreground">{DAY_LABEL}</p>
        <button
          type="button"
          onClick={() => toast.info('Nouveau rendez-vous')}
          className="flex size-9 items-center justify-center rounded-xl bg-primary shadow-sm active:opacity-80"
        >
          <Plus className="size-5 stroke-2 text-primary-foreground" />
        </button>
      </div>

      {dayAppts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">Aucun rendez-vous aujourd'hui</p>
          <button
            type="button"
            onClick={() => toast.info('Nouveau rendez-vous')}
            className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground active:bg-muted"
          >
            + Nouveau RDV
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {dayAppts.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => toast.info(a.name)}
              className="flex w-full items-center gap-3.5 rounded-2xl border border-border bg-surface p-4 text-left shadow-card active:bg-muted"
            >
              <span className="font-display text-lg font-bold tabular-nums text-foreground shrink-0">{a.time}</span>
              <div className="flex flex-1 flex-col gap-1.5 min-w-0">
                <span className={cn('self-start rounded-full px-2.5 py-0.5 text-xs font-bold', a.typeColor)}>
                  {a.type}
                </span>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-sm font-semibold text-foreground">{a.name}</span>
                  <span className="text-xs text-muted-foreground">· {a.city}</span>
                </div>
              </div>
              <ChevronRight className="size-4 shrink-0 stroke-[1.5] text-muted-foreground" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Semaine ────────────────────────────────────────────────── */
function SemaineView() {
  return (
    <div className="flex flex-col gap-3">
      {/* Week header */}
      <div className="flex">
        <div className="w-10 shrink-0" />
        {DOW_FULL.map((d, i) => {
          const dom = weekDoms[i]
          const isToday = dom === TODAY_DOM
          return (
            <div key={d} className="flex flex-1 flex-col items-center gap-0.5">
              <span className="text-[10px] font-bold text-muted-foreground">{d}</span>
              <span className={cn(
                'flex size-6 items-center justify-center rounded-full text-sm font-bold',
                isToday ? 'border-2 border-primary text-primary' : 'text-foreground'
              )}>
                {dom}
              </span>
            </div>
          )
        })}
      </div>

      {/* Grid */}
      <div className="overflow-hidden rounded-xl border border-border">
        {HOURS.map((h) => (
          <div key={h} className="flex border-t border-border first:border-t-0">
            <div className="flex w-10 shrink-0 items-start justify-end pr-2 pt-1 lg:w-14">
              <span className="text-[10px] text-muted-foreground tabular-nums lg:text-xs">{h}h</span>
            </div>
            {DOW_FULL.map((_, di) => {
              const appt = appts.find((a) => a.dayIndex === di && a.hour === h)
              return (
                <button
                  key={di}
                  type="button"
                  onClick={() => appt && toast.info(appt.name)}
                  className={cn(
                    'flex flex-1 items-start border-l border-border p-0.5 min-h-[36px] lg:min-h-[56px] transition-colors',
                    appt ? 'active:opacity-80' : 'active:bg-muted/50'
                  )}
                >
                  {appt && (
                    <span className={cn('w-full rounded px-1 py-0.5 text-[10px] font-bold leading-tight lg:text-xs lg:px-2 lg:py-1', appt.typeColor)}>
                      <span className="block">{appt.name.split(' ')[0]}</span>
                      <span className="hidden lg:block font-normal opacity-80">{appt.time}</span>
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Mois ───────────────────────────────────────────────────── */
function MoisView() {
  const apptDoms = new Set(appts.map((a) => WEEK_START_DOM - TODAY_DOW + a.dayIndex))

  return (
    <div className="flex flex-col gap-3">
      <p className="text-center text-lg font-bold capitalize text-foreground">{MONTH_LABEL}</p>

      {/* DOW header */}
      <div className="flex">
        {DOW_LABELS.map((d, i) => (
          <div key={i} className="flex flex-1 justify-center">
            <span className="text-[10px] font-bold text-muted-foreground">{d}</span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex flex-wrap">
        {monthCells.map((dom, i) => {
          const isToday = dom === TODAY_DOM
          const hasAppt = dom !== null && apptDoms.has(dom)
          return (
            <button
              key={i}
              type="button"
              onClick={() => dom && toast.info(`${dom} juin`)}
              className={cn(
                'flex flex-col items-center gap-0.5 py-1.5',
                'transition-colors active:bg-muted/50 rounded-lg'
              )}
              style={{ width: `${100 / 7}%` }}
            >
              {dom !== null && (
                <>
                  <span className={cn(
                    'flex size-7 items-center justify-center rounded-full text-sm font-semibold',
                    isToday ? 'border-2 border-primary font-bold text-primary' : 'text-foreground'
                  )}>
                    {dom}
                  </span>
                  <span className={cn(
                    'size-1.5 rounded-full',
                    hasAppt ? 'bg-primary' : 'bg-transparent'
                  )} />
                </>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
