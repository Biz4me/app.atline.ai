'use client'

import { cn } from '@/lib/utils'

const DOW3 = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
const MONTHS = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'aoû', 'sep', 'oct', 'nov', 'déc']
const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

// Liste d'heures (08:00 → 20:00, pas de 15 min)
const TIMES: string[] = []
for (let h = 8; h <= 20; h++) for (const m of [0, 15, 30, 45]) { if (h === 20 && m > 0) continue; TIMES.push(`${pad(h)}:${pad(m)}`) }

/**
 * Sélecteur date + heure ergonomique. value/onChange au format "YYYY-MM-DDTHH:mm".
 * Bande de jours (3 semaines) + grille d'heures + saisie précise en secours.
 */
export function WhenPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [datePart, timePartRaw] = (value || '').split('T')
  const timePart = timePartRaw && timePartRaw.length >= 4 ? timePartRaw.slice(0, 5) : '09:00'
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const base = datePart ? new Date(datePart + 'T00:00:00') : today
  const days = Array.from({ length: 21 }, (_, i) => { const d = new Date(today); d.setDate(d.getDate() + i); return d })
  const set = (dp: string, tp: string) => onChange(`${dp}T${tp}`)

  return (
    <div className="flex flex-col gap-3">
      {/* Jours */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {days.map((d, i) => {
          const sel = ymd(d) === ymd(base)
          return (
            <button key={i} type="button" onClick={() => set(ymd(d), timePart)}
              className={cn('flex min-w-[52px] shrink-0 flex-col items-center gap-0.5 rounded-xl border px-2 py-1.5',
                sel ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-surface text-foreground')}>
              <span className="text-[10px] font-bold uppercase opacity-80">{DOW3[d.getDay()]}</span>
              <span className="text-base font-bold leading-none">{d.getDate()}</span>
              <span className="text-[10px] opacity-80">{MONTHS[d.getMonth()]}</span>
            </button>
          )
        })}
      </div>

      {/* Heure (déroulant) */}
      <select value={timePart} onChange={(e) => set(ymd(base), e.target.value)}
        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none">
        {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
    </div>
  )
}
