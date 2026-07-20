'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AppHeader } from '@/components/app-header'
import { PageShell } from '@/components/page-shell'
import { Card } from '@/components/card'
import {
  Settings, Bell, Briefcase, Link2, Users, Lock, KeyRound,
  CreditCard, HelpCircle, MessageSquare, LogOut, ChevronRight, Moon, Sun,
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import { useTheme } from 'next-themes'

// « Mon compte » — UNE page qui porte tout : profil en tête, abonnement, réglages
// groupés, activité, assistance. Fini le sommaire qui menait à 8 sous-pages à plat.

const GROUPS: { title: string; items: { icon: typeof Settings; label: string; href: string }[] }[] = [
  {
    title: 'Réglages',
    items: [
      { icon: Settings, label: 'Préférences', href: '/settings/preferences' },
      { icon: Bell, label: 'Notifications', href: '/settings/notifications' },
      { icon: KeyRound, label: 'Connexion & sécurité', href: '/settings/securite' },
      { icon: Link2, label: 'Comptes liés', href: '/settings/comptes-lies' },
      { icon: Lock, label: 'Confidentialité', href: '/settings/confidentialite' },
    ],
  },
  {
    title: 'Activité',
    items: [
      { icon: Briefcase, label: 'Mes activités MLM', href: '/activities' },
      { icon: Users, label: 'Parrainage', href: '/settings/parrainage' },
    ],
  },
  {
    title: 'Assistance',
    items: [
      { icon: HelpCircle, label: "Centre d'aide", href: '/settings/centre-aide' },
      { icon: MessageSquare, label: 'Contact et remarques', href: '/settings/contact' },
    ],
  },
]

function Row({ icon: Icon, label, href }: { icon: typeof Settings; label: string; href: string }) {
  return (
    <Link href={href} className="flex w-full items-center gap-3.5 px-4 py-4 lg:py-3 transition-colors active:bg-muted lg:hover:bg-muted">
      <Icon className="size-5 shrink-0 text-muted-foreground stroke-[1.5]" />
      <span className="flex-1 text-lg font-medium text-foreground lg:text-sm">{label}</span>
      <ChevronRight className="size-4 text-muted-foreground" />
    </Link>
  )
}

export function AccountBody() {
  const { theme, setTheme } = useTheme()
  const [me, setMe] = useState<{ photoUrl: string; firstName: string; lastName: string; email: string } | null>(null)
  useEffect(() => {
    fetch('/api/me').then((r) => (r.ok ? r.json() : null)).then((u) => { if (u) setMe(u) }).catch(() => {})
  }, [])
  const initials = me ? `${(me.firstName || '')[0] ?? ''}${(me.lastName || '')[0] ?? ''}`.toUpperCase() : ''

  return (
    <>
      {/* Profil en tête — 1 tap, plus enterré sous un sommaire */}
      <Link href="/profile/edit" className="flex items-center gap-3.5 px-1">
        <span className="size-14 shrink-0 overflow-hidden rounded-full">
          {me?.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={me.photoUrl} alt="" className="size-full object-cover" />
          ) : (
            <span className="grid size-full place-items-center bg-[#3B82F6] text-lg font-semibold text-white">{initials || 'A'}</span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-lg font-bold text-foreground">{me ? `${me.firstName} ${me.lastName}`.trim() : '…'}</span>
          <span className="block truncate text-xs text-muted-foreground">Voir et modifier mon profil</span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </Link>

      {/* Abonnement — une seule entrée (résumé + gestion) */}
      <Card className="p-0">
        <Row icon={CreditCard} label="Mon abonnement" href="/mon-abonnement" />
      </Card>

      {/* Thème — relogé ici depuis l'ancien top bar desktop */}
      <Card className="p-0">
        <button
          type="button"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="flex w-full items-center gap-3.5 px-4 py-4 lg:py-3 text-left transition-colors active:bg-muted lg:hover:bg-muted"
        >
          {theme === 'dark' ? <Sun className="size-5 shrink-0 text-muted-foreground stroke-[1.5]" /> : <Moon className="size-5 shrink-0 text-muted-foreground stroke-[1.5]" />}
          <span className="flex-1 text-lg font-medium text-foreground lg:text-sm">{theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}</span>
        </button>
      </Card>

      {GROUPS.map((g) => (
        <section key={g.title}>
          <h2 className="mb-2 px-1 text-base font-semibold text-muted-foreground lg:text-xs lg:uppercase lg:tracking-wide">{g.title}</h2>
          <Card className="divide-y divide-border p-0">
            {g.items.map((it) => <Row key={it.href} {...it} />)}
          </Card>
        </section>
      ))}

      <Card className="p-0">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: '/auth' })}
          className="flex w-full items-center gap-3.5 px-4 py-4 lg:py-3 text-left transition-colors active:bg-muted lg:hover:bg-muted"
        >
          <LogOut className="size-5 shrink-0 text-destructive stroke-[1.5]" />
          <span className="flex-1 text-lg font-medium text-destructive lg:text-sm">Déconnexion</span>
        </button>
      </Card>

      <div className="flex flex-col items-center gap-1.5 pb-2 pt-2">
        <button type="button" className="text-xs text-muted-foreground underline underline-offset-2">Conditions d'utilisation</button>
        <button type="button" className="text-xs text-muted-foreground underline underline-offset-2">Politique de confidentialité</button>
      </div>
    </>
  )
}

export default function SettingsPage() {
  return (
    <>
      {/* MOBILE ONLY — full screen overlay */}
      <div
        className="lg:hidden fixed inset-0 z-[60] mx-auto max-w-[480px] bg-background overflow-y-auto animate-slide-in-right"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <AppHeader title="Mon compte" back showActions={false} />
        <div className="space-y-5 px-4 pt-3 pb-8">
          <AccountBody />
        </div>
      </div>

      {/* DESKTOP ONLY — gabarit lecture (PageShell) */}
      <PageShell title="Mon compte">
        <div className="space-y-5">
          <AccountBody />
        </div>
      </PageShell>
    </>
  )
}
