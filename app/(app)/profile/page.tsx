'use client'

import Image from 'next/image'
import {
  Crown,
  ChevronRight,
  Bell,
  Shield,
  CircleHelp,
  LogOut,
  Settings,
  Copy,
  Check,
} from 'lucide-react'
import { useState } from 'react'
import { Card } from '@/components/card'
import { DiscAvatar } from '@/components/disc-avatar'
import { currentUser, businesses, euro, networkStats } from '@/lib/data'
import { useBusiness } from '@/components/business-provider'
import { toast } from 'sonner'

const referralLink = 'atline.ai/rejoindre/lea-moreau'

export default function ProfilePage() {
  const { current: activeBusiness } = useBusiness()
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(`https://${referralLink}`)
    setCopied(true)
    toast.success('Lien copié !')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-5 px-4 pb-6 pt-5">
      {/* Identité */}
      <section className="flex items-center gap-4">
        <DiscAvatar firstName={currentUser.firstName} lastName={currentUser.lastName} disc="I" size="xl" />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-semibold leading-tight">
            {currentUser.firstName} {currentUser.lastName}
          </h1>
          <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
            <Crown className="size-3.5" />
            Plan Pro
          </div>
        </div>
        <button
          type="button"
          onClick={() => toast.info('Modifier le profil')}
          className="shrink-0 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-fg-2 transition-colors active:bg-muted"
        >
          Modifier
        </button>
      </section>

      {/* Commission du mois */}
      <Card className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Commission du mois</p>
          <p className="font-display text-2xl font-semibold text-gold">
            {euro(networkStats.monthCommission)}
          </p>
        </div>
        <span className="rounded-full bg-success/15 px-2.5 py-1 text-xs font-bold text-success">
          {currentUser.directReferrals} filleuls
        </span>
      </Card>

      {/* Hub public — lien de parrainage */}
      <section>
        <h2 className="mb-2 px-1 text-sm font-semibold text-muted-foreground">Mon hub public</h2>
        <Card className="p-4">
          <p className="mb-3 text-xs text-muted-foreground text-pretty">
            Partage ce lien pour que tes prospects rejoignent directement ton équipe.
          </p>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-muted px-3 py-2.5">
            <span className="flex-1 truncate text-sm font-medium text-foreground">
              {referralLink}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              aria-label="Copier le lien"
              className="shrink-0 rounded-lg p-1.5 text-primary transition-colors active:bg-primary/10"
            >
              {copied ? (
                <Check className="size-4 stroke-2" />
              ) : (
                <Copy className="size-4 stroke-[1.5]" />
              )}
            </button>
          </div>
        </Card>
      </section>

      {/* Coordonnées */}
      <section>
        <h2 className="mb-2 px-1 text-sm font-semibold text-muted-foreground">Coordonnées</h2>
        <Card className="divide-y divide-border p-0">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-muted-foreground">Email</span>
            <span className="text-sm font-semibold text-foreground">lea.moreau@email.fr</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-muted-foreground">Téléphone</span>
            <span className="text-sm font-semibold text-foreground">06 12 34 56 78</span>
          </div>
        </Card>
      </section>

      {/* Mes activités */}
      <section>
        <h2 className="mb-2 px-1 text-sm font-semibold text-muted-foreground">Mes activités</h2>
        <Card className="divide-y divide-border p-0">
          {businesses.map((b) => (
            <div key={b.id} className="flex items-center gap-3 px-4 py-3">
              <span
                className="grid size-9 shrink-0 place-items-center rounded-xl text-sm font-bold text-white"
                style={{ backgroundColor: b.color }}
              >
                {b.initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{b.name}</p>
                {b.isAtline && <p className="text-xs text-muted-foreground">Activité principale</p>}
              </div>
              {b.id === activeBusiness.id && (
                <span className="rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-bold text-success">
                  Active
                </span>
              )}
            </div>
          ))}
        </Card>
      </section>

      {/* Réglages */}
      <section>
        <h2 className="mb-2 px-1 text-sm font-semibold text-muted-foreground">Réglages</h2>
        <Card className="divide-y divide-border p-0">
          {[
            { icon: Bell, label: 'Notifications' },
            { icon: Shield, label: 'Confidentialité & sécurité' },
            { icon: Settings, label: "Préférences de l'app" },
            { icon: CircleHelp, label: 'Aide & support' },
          ].map((row) => (
            <button key={row.label} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
              <row.icon className="size-5 text-muted-foreground" />
              <span className="flex-1 text-sm font-medium">{row.label}</span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </button>
          ))}
        </Card>
      </section>

      <button className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border py-3.5 text-sm font-semibold text-destructive">
        <LogOut className="size-4" />
        Se déconnecter
      </button>

      <div className="flex flex-col items-center gap-2 pt-2 text-center">
        <Image src="/brand/atline-icon.png" alt="Atline" width={28} height={28} className="opacity-40" />
        <p className="text-xs text-muted-foreground">Atline · version 1.0.0</p>
      </div>
    </div>
  )
}
