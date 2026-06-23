'use client'

import { useState } from 'react'
import { AppHeader } from '@/components/app-header'
import { TopBar } from '@/components/top-bar'
import { BusinessSwitcher } from '@/components/business-switcher'
import { Card } from '@/components/card'
import { DiscAvatar } from '@/components/disc-avatar'
import { network, networkStats, planLabels, euro } from '@/lib/data'
import type { NetworkMember } from '@/lib/types'
import {
  Users, BarChart3, Wallet, ChevronDown, BadgeCheck,
  ChevronRight, Copy, Check, GitFork, Map, Shuffle, Package, Briefcase, Bot,
  Link as LinkIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const topStats = [
  { label: 'N1 actifs', value: '4', color: '#22C55E' },
  { label: 'N2', value: '9', color: '#3B82F6' },
  { label: 'Équipe', value: '17', color: '#F97316' },
]

const commGroups = [
  {
    title: 'N1 — Filleuls directs',
    rows: [
      { name: 'Sophie Lefèvre', amount: 1420 },
      { name: 'Karim Haddad', amount: 856 },
    ],
  },
  {
    title: 'Fast Start',
    rows: [{ name: 'Nadia Benali', amount: 400 }],
  },
  {
    title: 'Rétention',
    rows: [{ name: 'Équipe globale', amount: 171.5 }],
  },
]

const desktopPlanLabels: Record<string, string> = {
  distributeur: 'Distributeur',
  pro: 'Pro',
  leader: 'Leader',
}

const outils = [
  { icon: Shuffle, label: 'Placements', href: '#' },
  { icon: Package, label: 'Produits', href: '#' },
  { icon: Briefcase, label: 'Boîte à outils', href: '/toolbox' },
  { icon: Bot, label: 'Bot prospect', href: '#' },
]

export default function NetworkPage() {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText('https://atline.ai/lea-moreau')
    setCopied(true)
    toast.success('Lien copié !')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      {/* ── MOBILE ONLY ── */}
      <div className="lg:hidden">
        <AppHeader title="Réseau" />
        <div className="flex flex-col gap-5 px-4 pt-4">
          <div className="flex justify-end">
            <BusinessSwitcher />
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard icon={Users} value={String(networkStats.directReferrals)} label="Filleuls directs" />
            <StatCard icon={BarChart3} value={String(networkStats.teamVolume)} label="Volume équipe" />
            <StatCard
              icon={Wallet}
              valueNode={<span className="money text-base">{euro(networkStats.monthCommission)}</span>}
              label="Commission"
            />
          </div>

          {/* Tree */}
          <section>
            <h2 className="eyebrow mb-3">Mon équipe</h2>
            <ul className="flex flex-col gap-2">
              {network.map((m) => (
                <MemberNode key={m.id} member={m} />
              ))}
            </ul>
          </section>
        </div>
      </div>

      {/* ── DESKTOP ONLY ── */}
      <div className="hidden lg:block">
        <TopBar />
        <div className="px-8 pt-8 pb-8 max-w-6xl mx-auto">
          <h1 className="font-display text-[32px] font-extrabold leading-tight tracking-[-0.025em] text-foreground">
            Réseau
          </h1>

          <div className="mt-6 grid grid-cols-2 gap-8 items-start">

            {/* ── Colonne gauche : commissions + stats ── */}
            <div className="flex flex-col gap-6">
              <div className="relative overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
                <div className="absolute top-0 left-0 right-0 h-1 bg-amber-400" />
                <div className="flex flex-col items-center gap-2 px-4 py-5">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Commissions ce mois
                  </p>
                  <p className="font-display text-[44px] font-extrabold tabular-nums leading-none text-amber-500">
                    342,50 €
                  </p>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/15 px-3 py-1 text-xs font-bold text-green-600">
                    <BadgeCheck className="size-3.5" />
                    Licence active
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {topStats.map(({ label, value, color }) => (
                  <div key={label} className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-surface px-3 py-4 text-center shadow-card">
                    <span className="font-display text-2xl font-extrabold tabular-nums" style={{ color }}>{value}</span>
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 shadow-card">
                <LinkIcon className="size-5 shrink-0 stroke-[1.5] text-primary" />
                <span className="flex-1 truncate font-mono text-sm text-foreground">atline.ai/lea-moreau</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 rounded-xl border border-border bg-muted px-3 py-1.5 text-xs font-bold text-foreground active:bg-background"
                >
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  Copier
                </button>
              </div>

              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-primary">Détail des commissions</p>
                <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card divide-y divide-border">
                  {commGroups.map((g) => (
                    <div key={g.title}>
                      <p className="px-4 pt-3 pb-1 text-xs font-bold uppercase tracking-widest text-primary">{g.title}</p>
                      {g.rows.map((r) => (
                        <div key={r.name} className="flex items-center gap-3 px-4 py-2.5 last:pb-3">
                          <span className="flex-1 text-sm font-semibold text-foreground">{r.name}</span>
                          <span className="font-display text-lg font-extrabold tabular-nums text-amber-500">
                            {euro(r.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Colonne droite : équipe + outils ── */}
            <div className="flex flex-col gap-6">
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-primary">Mon équipe</p>
                <div className="flex flex-col gap-2.5">
                  {network.map((m) => (
                    <MemberRow key={m.id} member={m} />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => toast.info('Arbre du réseau — bientôt')}
                  className="flex flex-col gap-2.5 rounded-2xl border border-border bg-surface p-4 text-left shadow-card active:bg-muted hover:bg-muted/40"
                >
                  <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500/15">
                    <GitFork className="size-5 stroke-[1.5] text-blue-500" />
                  </div>
                  <p className="text-sm font-bold text-foreground">Arbre</p>
                  <p className="text-xs text-muted-foreground">Vue hiérarchique</p>
                </button>
                <button
                  type="button"
                  onClick={() => toast.info('Carte du réseau — bientôt')}
                  className="flex flex-col gap-2.5 rounded-2xl border border-border bg-surface p-4 text-left shadow-card active:bg-muted hover:bg-muted/40"
                >
                  <div className="flex size-10 items-center justify-center rounded-xl bg-green-500/15">
                    <Map className="size-5 stroke-[1.5] text-green-600" />
                  </div>
                  <p className="text-sm font-bold text-foreground">Carte</p>
                  <p className="text-xs text-muted-foreground">Vue géographique</p>
                </button>
              </div>

              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-primary">Outils réseau</p>
                <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card divide-y divide-border">
                  {outils.map(({ icon: Icon, label, href }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => href === '#' ? toast.info(`${label} — bientôt`) : (window.location.href = href)}
                      className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors active:bg-muted hover:bg-muted/40"
                    >
                      <Icon className="size-5 shrink-0 stroke-[1.5] text-muted-foreground" />
                      <span className="flex-1 text-sm font-bold text-foreground">{label}</span>
                      <ChevronRight className="size-4 shrink-0 stroke-[1.5] text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function StatCard({
  icon: Icon,
  value,
  valueNode,
  label,
}: {
  icon: typeof Users
  value?: string
  valueNode?: React.ReactNode
  label: string
}) {
  return (
    <Card className="flex flex-col gap-1.5 p-3">
      <Icon className="size-4 stroke-[1.5] text-muted-foreground" />
      {valueNode ?? (
        <span className="font-display text-2xl font-semibold leading-none text-foreground">{value}</span>
      )}
      <span className="text-xs leading-tight text-muted-foreground">{label}</span>
    </Card>
  )
}

function MemberNode({ member }: { member: NetworkMember }) {
  const [open, setOpen] = useState(false)
  const hasChildren = (member.children?.length ?? 0) > 0

  return (
    <li>
      <Card className="overflow-hidden">
        <button
          type="button"
          onClick={() => hasChildren && setOpen((o) => !o)}
          className="flex w-full items-center gap-3 p-3.5 text-left"
        >
          <DiscAvatar firstName={member.firstName} lastName={member.lastName} disc={member.disc} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-bold text-foreground">
                {member.firstName} {member.lastName}
              </p>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-fg-2">
                {planLabels[member.plan]}
              </span>
              {member.isAtlineLicensee && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                  <BadgeCheck className="size-3" />
                  Atline Licensee
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{member.teamVolume} pts de volume</p>
          </div>
          {hasChildren && (
            <ChevronDown className={cn('size-5 text-muted-foreground transition-transform', open && 'rotate-180')} />
          )}
        </button>

        {hasChildren && open && (
          <ul className="border-t border-border bg-muted/30 px-3.5 py-2">
            {member.children!.map((child) => (
              <li key={child.id} className="flex items-center gap-3 py-2">
                <DiscAvatar firstName={child.firstName} lastName={child.lastName} disc={child.disc} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-sm font-semibold text-foreground">
                      {child.firstName} {child.lastName}
                    </p>
                    {child.isAtlineLicensee && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                        <BadgeCheck className="size-2.5" />
                        Licensee
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {planLabels[child.plan]} · {child.teamVolume} pts
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </li>
  )
}

function MemberRow({ member }: { member: NetworkMember }) {
  const teamCount = member.children?.length ?? 0
  const isActive = member.plan !== 'distributeur'

  return (
    <button
      type="button"
      onClick={() => toast.info(`${member.firstName} ${member.lastName}`)}
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface p-3.5 text-left shadow-card transition-colors active:bg-muted hover:bg-muted/40"
    >
      <DiscAvatar firstName={member.firstName} lastName={member.lastName} disc={member.disc} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground">
          {member.firstName} {member.lastName}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {desktopPlanLabels[member.plan]} · {teamCount} dans l'équipe
        </p>
      </div>
      <span className={cn(
        'rounded-full px-2.5 py-1 text-xs font-bold',
        isActive ? 'bg-green-500/15 text-green-600' : 'bg-muted text-muted-foreground'
      )}>
        {isActive ? 'Actif' : 'Inactif'}
      </span>
    </button>
  )
}
