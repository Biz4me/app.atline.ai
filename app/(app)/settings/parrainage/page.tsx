'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Share2, Users, Loader2, Gift, Sparkles } from 'lucide-react'
import { PageShell, SubHeader } from '@/components/page-shell'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { euro } from '@/lib/data'
import { planOf } from '@/lib/plans'

type Referral = { name: string; initials: string; photoUrl: string | null; plan: string; createdAt: string }
type Data = {
  code: string
  directCount: number
  commissionsMonth: number
  commissionsPending: number
  commissionsPaid: number
  referrals: Referral[]
}

function fmtDate(s: string) {
  const d = new Date(s)
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function ParrainagePage() {
  const router = useRouter()
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    fetch('/api/affiliation')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (active) { setData(d); setLoading(false) } })
      .catch(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const link = data?.code ? `https://app.atline.ai/r/${data.code}` : ''

  async function copy() {
    if (!link) return
    try { await navigator.clipboard.writeText(link); toast.success('Lien copié') } catch { toast.error('Copie impossible') }
  }
  async function share() {
    if (!link) return
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share({ title: 'Rejoins-moi sur Atline', url: link }) } catch {}
    } else {
      copy()
    }
  }

  const body = loading || !data ? (
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex flex-col gap-5 px-4 pb-10 pt-4 lg:px-0">
          {/* Lien d'affiliation */}
          <div className="rounded-2xl border border-border bg-surface p-4 shadow-card">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-full bg-primary/10">
                <Gift className="size-4 text-primary" />
              </span>
              <p className="text-lg lg:text-sm font-semibold text-foreground">Ton lien d&apos;affiliation</p>
            </div>
            <div className="mt-3 rounded-xl border border-border bg-background px-3.5 py-3">
              <p className="truncate text-lg lg:text-sm font-medium text-foreground">app.atline.ai/r/{data.code}</p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={copy}
                className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface py-3 text-lg lg:text-sm font-semibold text-foreground transition-transform active:scale-[0.98]"
              >
                <Copy className="size-4" /> Copier
              </button>
              <button
                type="button"
                onClick={share}
                className="flex items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-lg lg:text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98]"
              >
                <Share2 className="size-4" /> Partager
              </button>
            </div>
          </div>

          {/* Page de capture — Phase 2 (placeholder, à coder plus tard) */}
          <button
            type="button"
            onClick={() => toast.info('Page de capture « démo Atlas » — bientôt')}
            className="flex items-center gap-3 rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4 text-left transition-transform active:scale-[0.98]"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15">
              <Sparkles className="size-5 text-primary" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-lg lg:text-sm font-semibold text-foreground">Page de capture · démo Atlas</p>
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">Bientôt</span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">Offre une session Atlas gratuite à tes prospects — ils goûtent l&apos;IA avant de s&apos;inscrire.</p>
            </div>
          </button>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { value: String(data.directCount), label: 'Filleuls' },
              { value: euro(data.commissionsMonth), label: 'Ce mois' },
              { value: euro(data.commissionsPending), label: 'En attente' },
            ].map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-surface px-2 py-3.5 text-center shadow-card">
                <span className="font-display text-xl font-bold tabular-nums text-foreground">{s.value}</span>
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
            ))}
          </div>

          {/* Filleuls */}
          <div>
            <p className="mb-2 px-1 text-lg lg:text-sm font-semibold text-foreground">Tes filleuls</p>
            {data.referrals.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-surface px-6 py-10 text-center">
                <Users className="size-6 text-muted-foreground" />
                <p className="text-lg lg:text-sm font-medium text-foreground">Aucun filleul pour l&apos;instant</p>
                <p className="text-xs text-muted-foreground">Partage ton lien pour commencer à parrainer.</p>
              </div>
            ) : (
              <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
                {data.referrals.map((r, i) => {
                  const p = planOf(r.plan)
                  return (
                    <div key={i} className="flex items-center gap-3 px-4 py-3">
                      {r.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.photoUrl} alt="" className="size-9 shrink-0 rounded-full object-cover" />
                      ) : (
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">{r.initials || '?'}</span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-lg lg:text-sm font-medium text-foreground">{r.name || 'Filleul'}</p>
                        <p className="text-xs text-muted-foreground">Inscrit le {fmtDate(r.createdAt)}</p>
                      </div>
                      <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold', p.price === 0 ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary')}>
                        {p.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Total perçu */}
          {data.commissionsPaid > 0 && (
            <div className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3.5 shadow-card">
              <span className="text-lg lg:text-sm text-muted-foreground">Total perçu</span>
              <span className="text-base font-bold text-foreground">{euro(data.commissionsPaid)}</span>
            </div>
          )}
        </div>
      )

  return (
    <>
      {/* MOBILE ONLY — overlay plein écran */}
      <div
        className="lg:hidden fixed inset-0 z-[70] mx-auto max-w-[480px] bg-background overflow-y-auto animate-slide-in-right"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <SubHeader title="Parrainage" onBack={() => router.back()} />
        {body}
      </div>

      {/* DESKTOP ONLY — gabarit lecture */}
      <PageShell title="Parrainage">{body}</PageShell>
    </>
  )
}
