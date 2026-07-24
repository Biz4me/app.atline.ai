'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, SendHorizontal } from 'lucide-react'
import type { PlanItem } from '@/components/atlas-plan-card'

// ═══ ACCUEIL (refonte nav, tranche 3) ═══
// Le tableau de bord-briefing : mantra + plan du jour + carte Formation + composeur-LANCEUR.
// Le composeur n'ouvre pas un chat ici : à l'envoi il pose le message dans `atlas_pending` et
// bascule dans le fil Atlas (fil UNIQUE et continu — même relais que le reste de l'app).

export function AccueilContent() {
  const router = useRouter()
  const [firstName, setFirstName] = useState('')
  const [mantra, setMantra] = useState('On avance ensemble ?')
  const [plan, setPlan] = useState<PlanItem[]>([])
  const [planObj, setPlanObj] = useState<{ mensuel: number; signed: number } | null>(null)
  const [formationPct, setFormationPct] = useState<number | null>(null)
  const [draft, setDraft] = useState('')

  useEffect(() => {
    fetch('/api/me').then((r) => (r.ok ? r.json() : null)).then((u) => { if (u?.firstName) setFirstName(u.firstName) }).catch(() => {})
    fetch('/api/mantras/random').then((r) => (r.ok ? r.json() : null)).then((d) => { if (d?.mantra) setMantra(d.mantra) }).catch(() => {})
    fetch('/api/plan/today').then((r) => (r.ok ? r.json() : null)).then((d) => { setPlan(d?.items?.slice(0, 4) ?? []); setPlanObj(d?.objectif ?? null) }).catch(() => {})
    fetch('/api/home/stats').then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) setFormationPct(d.formationPct) }).catch(() => {})
  }, [])

  // Lanceur : on continue TOUJOURS le fil Atlas existant (pas une 2e discussion).
  const launch = () => {
    const t = draft.trim()
    if (!t) return
    sessionStorage.setItem('atlas_pending', t)
    router.push('/atlas')
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col px-4 pb-6 pt-6 lg:pt-10">
      {/* Bonjour + mantra */}
      <p className="text-3xl font-bold leading-[1.2] tracking-[-0.025em] text-foreground">{firstName ? `Bonjour ${firstName}` : 'Bonjour'}</p>
      <p className="mt-1 text-lg leading-[1.4] text-muted-foreground">« {mantra} »</p>

      {/* Ton plan du jour */}
      <div className="mt-6 flex flex-col gap-2">
        <p className="px-1 text-xs font-extrabold uppercase tracking-widest text-primary">Ton plan du jour</p>
        {planObj && (
          <p className="px-1 text-xs text-muted-foreground">
            Objectif du mois : <span className="font-semibold tabular-nums text-foreground">{planObj.signed}/{planObj.mensuel}</span> partenaire{planObj.mensuel > 1 ? 's' : ''} signé{planObj.signed > 1 ? 's' : ''}{planObj.signed >= planObj.mensuel ? ' 🎯' : ''}
          </p>
        )}
        {plan.length === 0 ? (
          <p className="px-1 text-sm text-muted-foreground">Rien d&apos;urgent aujourd&apos;hui. Demande à Atlas ton prochain pas ci-dessous.</p>
        ) : (
          plan.map((it) => (
            <button
              key={`${it.action}-${it.contactId}`}
              type="button"
              onClick={() => router.push(it.contactId ? `/chats/${it.contactId}` : '/atlas')}
              className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface px-3.5 py-3 text-left transition-transform active:scale-[0.99]"
            >
              <span className="w-1 self-stretch rounded-full" style={{ background: it.contactId ? it.accent : '#F97316' }} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-foreground">{it.headline}</span>
                <span className="block truncate text-xs text-muted-foreground">{it.reason}</span>
              </span>
              <span className="shrink-0 text-xs font-bold text-primary">Go</span>
            </button>
          ))
        )}
      </div>

      {/* Ta formation — la carte, dans l'Accueil (jamais un onglet ni un menu) */}
      <p className="mt-6 px-1 text-xs font-extrabold uppercase tracking-widest text-primary">Ta formation</p>
      <Link
        href="/formation"
        className="mt-2 flex items-center gap-3 rounded-2xl border border-border bg-surface px-3.5 py-3 transition-transform active:scale-[0.99]"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#8B5CF6]/10 text-[#8B5CF6]">
          <BookOpen className="size-5 stroke-[1.75]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-foreground">Reprends ta formation</span>
          <span className="block text-xs text-muted-foreground">{formationPct != null ? `${formationPct}% du parcours` : 'Ta colonne vertébrale'}</span>
          {formationPct != null && (
            <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-muted">
              <span className="block h-full rounded-full bg-[#8B5CF6]" style={{ width: `${formationPct}%` }} />
            </span>
          )}
        </span>
      </Link>

      {/* Composeur-lanceur : à l'envoi → fil Atlas (continu). ☰ menu d'agent = tranche 5. */}
      <div className="mt-6 flex items-end gap-2 rounded-3xl border border-border bg-surface px-3 py-2">
        <textarea
          rows={1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); launch() } }}
          placeholder="Demande à Atlas…"
          className="flex-1 resize-none bg-transparent py-1.5 text-lg leading-[1.4] text-foreground outline-none placeholder:text-muted-foreground lg:text-sm"
          style={{ maxHeight: 120 }}
        />
        <button
          type="button"
          onClick={launch}
          disabled={!draft.trim()}
          aria-label="Envoyer à Atlas"
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-opacity hover:opacity-90 active:opacity-90 disabled:opacity-40"
        >
          <SendHorizontal className="size-6 stroke-[1.5]" />
        </button>
      </div>
    </div>
  )
}
