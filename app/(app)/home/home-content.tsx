'use client'

import { Card } from '@/components/card'
import { CalendarDays, Users, Mic, BookOpen, AlarmClock, Megaphone } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'

// Tableau de bord RÉEL (équivalent utilisateur de l'overview admin) : tout vient
// de /api/home/stats + /api/appointments. Plus aucune donnée fictive ici.

type Stats = {
  contacts: number
  ariaScore: number | null
  rdv: number
  simCount: number
  relancesDues: number
  rdvWeek: number
  contactsWeek: number
  tunnel: { nouveau: number; invitation: number; suivi: number; closing: number }
  formationPct: number
  nova: { campaigns: number; leads: number }
}
type Appt = { id: string; title: string; startAt: string; contactName: string | null }

const TUNNEL_COLORS: [keyof Stats['tunnel'], string, string][] = [
  ['nouveau', '#3B82F6', 'nouveaux'],
  ['invitation', '#F4B342', 'invités'],
  ['suivi', '#F97316', 'en suivi'],
  ['closing', '#22C55E', 'en closing'],
]

function useDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [today, setToday] = useState<Appt[]>([])
  useEffect(() => {
    fetch('/api/home/stats').then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) setStats(d) }).catch(() => {})
    fetch('/api/appointments').then((r) => (r.ok ? r.json() : [])).then((rows: Appt[]) => {
      const d = new Date().toDateString()
      setToday((Array.isArray(rows) ? rows : []).filter((a) => new Date(a.startAt).toDateString() === d).slice(0, 4))
    }).catch(() => {})
  }, [])
  return { stats, today }
}

// ── Briques partagées mobile/desktop ────────────────────────────────────────

function Kpis({ s }: { s: Stats | null }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3">
      {[
        { icon: Users, label: 'Contacts', value: s?.contacts, sub: s ? `+${s.contactsWeek} cette semaine` : '' },
        { icon: AlarmClock, label: 'Relances dues', value: s?.relancesDues, sub: "à traiter aujourd'hui", alert: (s?.relancesDues ?? 0) > 0 },
        { icon: CalendarDays, label: 'RDV à venir', value: s?.rdvWeek, sub: 'cette semaine' },
        { icon: BookOpen, label: 'Formation', value: s != null ? `${s.formationPct}%` : undefined, sub: 'du parcours' },
      ].map(({ icon: Icon, label, value, sub, alert }) => (
        <Card key={label} className="flex flex-col gap-0.5 px-3.5 py-3">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="size-3.5 stroke-[1.5]" />{label}</span>
          <span className={`font-display text-2xl font-bold tabular-nums ${alert ? 'text-[#EF4444]' : 'text-foreground'}`}>{value ?? '—'}</span>
          <span className="text-xs text-muted-foreground">{sub}</span>
        </Card>
      ))}
    </div>
  )
}

function TunnelCard({ s }: { s: Stats | null }) {
  const total = s ? Object.values(s.tunnel).reduce((a, b) => a + b, 0) : 0
  return (
    <Card className="flex flex-col gap-2.5 p-4">
      <span className="text-sm font-bold text-foreground">Ton tunnel</span>
      {total > 0 ? (
        <>
          <div className="flex h-2 gap-0.5 overflow-hidden rounded-full">
            {TUNNEL_COLORS.map(([k, color]) => (s!.tunnel[k] > 0 ? <span key={k} style={{ flex: s!.tunnel[k], background: color }} /> : null))}
          </div>
          <span className="text-xs text-muted-foreground">
            {TUNNEL_COLORS.filter(([k]) => s!.tunnel[k] > 0).map(([k, , label]) => `${s!.tunnel[k]} ${label}`).join(' · ')}
          </span>
        </>
      ) : (
        <span className="text-xs text-muted-foreground">Ajoute tes premiers contacts pour voir ton tunnel prendre vie.</span>
      )}
    </Card>
  )
}

function AgentCards({ s }: { s: Stats | null }) {
  return (
    <>
      <Link href="/aria">
        <Card className="flex items-center gap-3 p-4 transition-colors active:bg-muted/50 hover:bg-muted/40">
          <span className="w-1 self-stretch rounded-full bg-[#14B8A6]" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-foreground">{s?.ariaScore != null ? `Score d'entraînement : ${s.ariaScore}` : "Entraîne-toi à l'oral"}</span>
            <span className="block text-xs text-muted-foreground">{s?.simCount ? `${s.simCount} simulation${s.simCount > 1 ? 's' : ''} · moyenne 30 jours` : 'Lance ta première simulation'}</span>
          </span>
          <Mic className="size-4 shrink-0 text-[#14B8A6]" />
        </Card>
      </Link>
      <Link href="/nova">
        <Card className="flex items-center gap-3 p-4 transition-colors active:bg-muted/50 hover:bg-muted/40">
          <span className="w-1 self-stretch rounded-full bg-[#8B5CF6]" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-foreground">{s?.nova.campaigns ? `${s.nova.campaigns} campagne${s.nova.campaigns > 1 ? 's' : ''} · ${s.nova.leads} lead${s.nova.leads > 1 ? 's' : ''}` : 'Attire tes prochains contacts'}</span>
            <span className="block text-xs text-muted-foreground">{s?.nova.campaigns ? 'tes réseaux travaillent pour toi' : 'Crée ta première campagne'}</span>
          </span>
          <Megaphone className="size-4 shrink-0 text-[#8B5CF6]" />
        </Card>
      </Link>
    </>
  )
}

function AgendaCard({ today }: { today: Appt[] }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 stroke-[1.5] text-muted-foreground" />
          <span className="text-sm font-bold text-foreground">Agenda du jour</span>
        </div>
        <Link href="/agenda" className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">Voir tout →</Link>
      </div>
      {today.length > 0 ? (
        <div className="divide-y divide-border">
          {today.map((a) => (
            <div key={a.id} className="flex items-center gap-3 px-4 py-3.5">
              <span className="w-12 shrink-0 text-sm font-bold tabular-nums text-foreground">
                {new Date(a.startAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">{a.title}{a.contactName ? ` · ${a.contactName}` : ''}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="px-4 py-4 text-xs text-muted-foreground">Rien de prévu aujourd'hui.</p>
      )}
    </Card>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function HomeContent({ mantra }: { mantra: string }) {
  const { stats, today } = useDashboard()

  const Mantra = mantra ? (
    <div className="px-2 py-1 text-center leading-snug">
      <span className="text-base font-semibold text-primary">« </span>
      <span className="text-base font-semibold text-foreground">{mantra}</span>
      <span className="text-base font-semibold text-primary"> »</span>
    </div>
  ) : null

  return (
    <>
      {/* ══════════════ MOBILE ══════════════ */}
      <div className="lg:hidden px-4 pt-6 pb-8">
        <div className="flex flex-col gap-5">
          {Mantra}
          <Kpis s={stats} />
          <TunnelCard s={stats} />
          <AgendaCard today={today} />
          <AgentCards s={stats} />
        </div>
      </div>

      {/* ══════════════ DESKTOP ══════════════ */}
      <div className="hidden lg:block px-8 pt-8 pb-10 max-w-6xl mx-auto">
        {Mantra && <div className="mb-8">{Mantra}</div>}
        <div className="mb-6"><Kpis s={stats} /></div>
        <div className="grid grid-cols-2 items-start gap-6">
          <div className="flex flex-col gap-5">
            <TunnelCard s={stats} />
            <AgentCards s={stats} />
          </div>
          <div className="flex flex-col gap-5">
            <AgendaCard today={today} />
          </div>
        </div>
      </div>
    </>
  )
}
