'use client'

import {
  Crown,
  Copy,
  Check,
  LogOut,
  Pencil,
  Mail,
  Phone,
} from 'lucide-react'
import { useState } from 'react'
import { Card } from '@/components/card'
import { DiscAvatar } from '@/components/disc-avatar'
import { currentUser } from '@/lib/data'
import { toast } from 'sonner'

const referralLink = 'atline.ai/rejoindre/lea-moreau'

export default function ProfilePage() {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(`https://${referralLink}`)
    setCopied(true)
    toast.success('Lien copié !')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col items-center gap-5 px-4 pb-8 pt-8">
      {/* Avatar large */}
      <div className="relative">
        <DiscAvatar firstName={currentUser.firstName} lastName={currentUser.lastName} disc="I" size="xl" />
        <button
          type="button"
          onClick={() => toast.info('Changer la photo')}
          className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground"
        >
          <Pencil className="size-3 stroke-[2]" />
        </button>
      </div>

      {/* Nom + plan */}
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-display text-[28px] font-bold leading-tight tracking-[-0.025em] text-foreground">
          {currentUser.firstName} {currentUser.lastName}
        </h1>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
          <Crown className="size-3.5" />
          Plan Pro
        </div>
        <p className="max-w-[260px] text-sm text-muted-foreground leading-relaxed">
          Distributrice indépendante · MLM depuis 2 ans. Passionnée d'accompagnement et de bien-être.
        </p>
      </div>

      {/* Hub public — lien de parrainage */}
      <div className="w-full">
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mon hub public</p>
        <Card className="p-4">
          <p className="mb-3 text-xs text-muted-foreground">
            Partage ce lien pour que tes prospects rejoignent ton équipe.
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
      </div>

      {/* Coordonnées */}
      <div className="w-full">
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Coordonnées</p>
        <Card className="divide-y divide-border p-0">
          <div className="flex items-center gap-3 px-4 py-3">
            <Mail className="size-4 shrink-0 stroke-[1.5] text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Email</span>
            <span className="ml-auto text-sm font-semibold text-foreground">lea.moreau@email.fr</span>
          </div>
          <div className="flex items-center gap-3 px-4 py-3">
            <Phone className="size-4 shrink-0 stroke-[1.5] text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Téléphone</span>
            <a href="tel:0612345678" className="ml-auto text-sm font-semibold text-primary">
              06 12 34 56 78
            </a>
          </div>
        </Card>
      </div>

      {/* CTA Modifier */}
      <button
        type="button"
        onClick={() => toast.info('Modifier mon profil')}
        className="w-full rounded-2xl bg-primary py-4 text-sm font-bold text-primary-foreground transition-transform active:scale-[0.98]"
      >
        Modifier mon profil
      </button>

      {/* Déconnexion */}
      <button
        type="button"
        onClick={() => toast.error('Déconnexion')}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border py-3.5 text-sm font-semibold text-destructive transition-colors active:bg-muted"
      >
        <LogOut className="size-4 stroke-[1.5]" />
        Se déconnecter
      </button>

      <p className="text-xs text-muted-foreground">Atline · version 1.0.0</p>
    </div>
  )
}
