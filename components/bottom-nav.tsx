'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Compass, Users, User, GitFork } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { UserPlus, PhoneCall, Network, BarChart2 } from 'lucide-react'

const tabs = [
  { href: '/home', label: 'Parcours', icon: Compass },
  { href: '/contacts', label: 'Contacts', icon: Users },
  { href: '/network', label: 'Réseau', icon: GitFork },
  { href: '/profile', label: 'Moi', icon: User },
]

export function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [atlasOpen, setAtlasOpen] = useState(false)

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  const actions = [
    { label: 'Ajouter un contact', desc: 'Nouveau prospect au CRM', icon: UserPlus, href: '/contacts' },
    { label: 'Simuler un appel', desc: 'Entraîne-toi avec ARIA', icon: PhoneCall, href: '/aria' },
    { label: 'Voir mon réseau', desc: 'Arbre et commissions', icon: Network, href: '/network' },
    { label: 'Mes stats', desc: 'Performance du mois', icon: BarChart2, href: '/home' },
  ]

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[480px] bg-surface/95 backdrop-blur-md shadow-[0_-1px_0_rgba(0,0,0,0.06)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="grid grid-cols-5 items-end px-2 pt-2 pb-2">
          <NavItem tab={tabs[0]} active={isActive(tabs[0].href)} />
          <NavItem tab={tabs[1]} active={isActive(tabs[1].href)} />

          {/* Atlas central */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setAtlasOpen(true)}
              aria-label="Ouvrir Atlas"
              className="-translate-y-4 flex size-[58px] items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-95"
            >
              <span className="font-display text-2xl font-bold leading-none">A</span>
            </button>
          </div>

          <NavItem tab={tabs[2]} active={isActive(tabs[2].href)} />
          <NavItem tab={tabs[3]} active={isActive(tabs[3].href)} />
        </div>
      </nav>

      <Sheet open={atlasOpen} onOpenChange={setAtlasOpen}>
        <SheetContent
          side="bottom"
          className="mx-auto max-w-[480px] rounded-t-3xl border-border"
        >
          <SheetHeader className="text-left">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-display text-lg font-bold">
                A
              </span>
              <div>
                <SheetTitle className="font-display text-lg">Atlas</SheetTitle>
                <SheetDescription>Que veux-tu faire maintenant ?</SheetDescription>
              </div>
            </div>
          </SheetHeader>
          <div className="flex flex-col gap-2 px-4 pb-6">
            {actions.map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={() => {
                  setAtlasOpen(false)
                  router.push(a.href)
                }}
                className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3.5 text-left transition-colors active:bg-muted"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <a.icon className="size-5 stroke-[1.5]" />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-bold text-foreground">{a.label}</span>
                  <span className="block text-xs text-muted-foreground">{a.desc}</span>
                </span>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

function NavItem({
  tab,
  active,
}: {
  tab: { href: string; label: string; icon: typeof User }
  active: boolean
}) {
  const Icon = tab.icon
  return (
    <Link
      href={tab.href}
      className={cn(
        'flex flex-col items-center gap-1 py-1 text-[10px] font-semibold transition-colors',
        active ? 'text-primary' : 'text-muted-foreground',
      )}
    >
      <Icon className={cn('size-5 stroke-[1.5]', active && 'stroke-2')} />
      {tab.label}
    </Link>
  )
}
