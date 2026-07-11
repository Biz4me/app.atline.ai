'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/card'
import {
  Settings, User, Bell, Briefcase, Link2, Users, Lock, KeyRound,
  CreditCard, HelpCircle, MessageSquare, LogOut, ChevronRight, ChevronLeft,
} from 'lucide-react'
import { toast } from 'sonner'
import { signOut } from 'next-auth/react'

const COMPTE = [
  { icon: User,      label: 'Profil',                        href: '/profile/edit'          },
  { icon: Briefcase, label: 'Activité MLM',                  href: '/activities'            },
  { icon: Settings,  label: 'Préférences',                   href: '/settings/preferences'  },
  { icon: Bell,      label: 'Notifications',                 href: '/settings/notifications'},
  { icon: KeyRound,  label: 'Connexion & sécurité',          href: '/settings/securite'     },
  { icon: Link2,     label: 'Comptes liés',                  href: '/settings/comptes-lies' },
  { icon: Users,     label: 'Parrainage',                    href: '/settings/parrainage'   },
  { icon: Lock,      label: 'Paramètres de confidentialité', href: '/settings/confidentialite' },
]

const ASSISTANCE = [
  { icon: HelpCircle,    label: "Centre d'aide",       href: '/settings/centre-aide' },
  { icon: MessageSquare, label: 'Contact et remarques', href: '/settings/contact'    },
]

// Corps du menu, partagé mobile/desktop (mêmes sections, seul l'habillage change)
function SettingsBody() {
  return (
    <>
      {/* Compte */}
      <section>
        <h2 className="mb-2 px-1 text-base font-semibold text-muted-foreground lg:text-xs lg:uppercase lg:tracking-wide">Compte</h2>
        <Card className="divide-y divide-border p-0">
          {COMPTE.map(({ icon: Icon, label, href }) => (
            <Link key={label} href={href} className="flex w-full items-center gap-3.5 px-4 py-4 lg:py-3 transition-colors active:bg-muted lg:hover:bg-muted">
              <Icon className="size-5 shrink-0 text-muted-foreground stroke-[1.5]" />
              <span className="flex-1 text-lg font-medium text-foreground lg:text-sm">{label}</span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          ))}
        </Card>
      </section>

      {/* Abonnement */}
      <section>
        <h2 className="mb-2 px-1 text-base font-semibold text-muted-foreground lg:text-xs lg:uppercase lg:tracking-wide">Abonnement</h2>
        <Card className="p-0">
          <Link href="/abonnement?from=settings" className="flex w-full items-center gap-3.5 px-4 py-4 lg:py-3 transition-colors active:bg-muted lg:hover:bg-muted">
            <CreditCard className="size-5 shrink-0 text-muted-foreground stroke-[1.5]" />
            <span className="flex-1 text-lg font-medium text-foreground lg:text-sm">Choisir un abonnement</span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
        </Card>
      </section>

      {/* Assistance */}
      <section>
        <h2 className="mb-2 px-1 text-base font-semibold text-muted-foreground lg:text-xs lg:uppercase lg:tracking-wide">Assistance</h2>
        <Card className="divide-y divide-border p-0">
          {ASSISTANCE.map(({ icon: Icon, label, href }) => (
            <Link key={label} href={href} className="flex w-full items-center gap-3.5 px-4 py-4 lg:py-3 transition-colors active:bg-muted lg:hover:bg-muted">
              <Icon className="size-5 shrink-0 text-muted-foreground stroke-[1.5]" />
              <span className="flex-1 text-lg font-medium text-foreground lg:text-sm">{label}</span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          ))}
        </Card>
      </section>

      {/* Déconnexion */}
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
    </>
  )
}

export default function SettingsPage() {
  const router = useRouter()

  return (
    <>
      {/* MOBILE ONLY — full screen overlay */}
      <div
        className="lg:hidden fixed inset-0 z-[60] mx-auto max-w-[480px] bg-background overflow-y-auto animate-slide-in-right"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between bg-background/90 px-4 py-3 backdrop-blur"
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
        >
          <div className="size-9" />
          <h1 className="text-lg font-semibold text-foreground">Paramètres</h1>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-1 py-2 text-base font-semibold text-primary active:opacity-70"
          >
            Terminé
          </button>
        </div>

        <div className="space-y-5 px-4 pt-5 pb-8">

          {/* Compte */}
          <section>
            <h2 className="mb-2 px-1 text-base font-semibold text-muted-foreground">Compte</h2>
            <Card className="divide-y divide-border p-0">
              {COMPTE.map(({ icon: Icon, label, href }) => (
                <Link key={label} href={href} className="flex w-full items-center gap-3.5 px-4 py-4 transition-colors active:bg-muted">
                  <Icon className="size-5 shrink-0 text-muted-foreground stroke-[1.5]" />
                  <span className="flex-1 text-lg font-medium text-foreground">{label}</span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              ))}
            </Card>
          </section>

          {/* Abonnement */}
          <section>
            <h2 className="mb-2 px-1 text-base font-semibold text-muted-foreground">Abonnement</h2>
            <Card className="p-0">
              <Link href="/abonnement?from=settings" className="flex w-full items-center gap-3.5 px-4 py-4 transition-colors active:bg-muted">
                <CreditCard className="size-5 shrink-0 text-muted-foreground stroke-[1.5]" />
                <span className="flex-1 text-lg font-medium text-foreground">Choisir un abonnement</span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            </Card>
          </section>

          {/* Assistance */}
          <section>
            <h2 className="mb-2 px-1 text-base font-semibold text-muted-foreground">Assistance</h2>
            <Card className="divide-y divide-border p-0">
              {ASSISTANCE.map(({ icon: Icon, label, href }) => (
                <Link key={label} href={href} className="flex w-full items-center gap-3.5 px-4 py-4 transition-colors active:bg-muted">
                  <Icon className="size-5 shrink-0 text-muted-foreground stroke-[1.5]" />
                  <span className="flex-1 text-lg font-medium text-foreground">{label}</span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              ))}
            </Card>
          </section>

          {/* Déconnexion */}
          <Card className="p-0">
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/auth' })}
              className="flex w-full items-center gap-3.5 px-4 py-4 text-left transition-colors active:bg-muted"
            >
              <LogOut className="size-5 shrink-0 text-destructive stroke-[1.5]" />
              <span className="flex-1 text-lg font-medium text-destructive">Déconnexion</span>
            </button>
          </Card>

          {/* Footer légal */}
          <div className="flex flex-col items-center gap-1.5 pt-2 pb-2">
            <button type="button" className="text-xs text-muted-foreground underline underline-offset-2">
              Conditions d'utilisation
            </button>
            <button type="button" className="text-xs text-muted-foreground underline underline-offset-2">
              Politique de confidentialité
            </button>
          </div>

        </div>
      </div>

      {/* DESKTOP ONLY — même menu, colonne centrée */}
      <div className="hidden lg:block">
        <div className="mx-auto max-w-2xl space-y-5 px-6 py-8">
          <h1 className="text-lg font-semibold text-foreground">Paramètres</h1>
          <SettingsBody />
        </div>
      </div>
    </>
  )
}
