'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { User, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBusiness } from '@/components/business-provider'
import { FAMILLES, TERRITOIRE_COMPTE, familleDe, type Famille } from '@/lib/familles'
import type { Business } from '@/lib/types'

// ═══ NAV PRIMAIRE — LES CINQ FAMILLES ═══
//
// UNE source de destinations (lib/familles.ts) rendue en RAIL vertical fin
// (desktop, 76 px) ET en BOTTOM BAR (mobile). Mêmes données, même composant.
//
// ── LA PILE PAR ONGLET ─────────────────────────────────────────────────────
//
// C'est ce qui règle la plainte d'origine, « il faut cliquer des tas de fois
// retour ». On mémorise le dernier écran visité dans chaque famille : quitter
// Orion au milieu d'une conversation puis y revenir, c'est y revenir vraiment,
// pas repartir de sa racine.
//
// Et l'inverse est vrai aussi : appuyer sur l'onglet DÉJÀ actif ramène à la
// racine. L'accueil d'une famille est toujours à un doigt.
//
// La mémoire vit dans sessionStorage : elle doit survivre à une navigation,
// pas à une journée. Un onglet retrouvé trois jours plus tard au milieu d'une
// vieille conversation serait déroutant, pas pratique.

const CLE_PILES = 'atline.piles'

type Piles = Partial<Record<Famille['cle'], string>>

function lirePiles(): Piles {
  try {
    return JSON.parse(sessionStorage.getItem(CLE_PILES) || '{}') as Piles
  } catch {
    return {}
  }
}

export function PrimaryNav({ immersive = false }: { immersive?: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const [piles, setPiles] = useState<Piles>({})

  const active = familleDe(pathname)
  const compteActif = TERRITOIRE_COMPTE.some((p) => pathname === p || pathname.startsWith(p + '/'))

  // On enregistre la position courante dans sa famille, à chaque déplacement.
  useEffect(() => {
    const f = familleDe(pathname)
    if (!f) return
    const maj = { ...lirePiles(), [f.cle]: pathname }
    sessionStorage.setItem(CLE_PILES, JSON.stringify(maj))
    setPiles(maj)
  }, [pathname])

  const aller = (f: Famille) => (e: React.MouseEvent) => {
    e.preventDefault()
    // Onglet déjà actif → retour à la racine. Sinon → là où on l'avait laissé.
    const cible = active?.cle === f.cle ? f.racine : piles[f.cle] || f.racine
    router.push(cible)
  }

  return (
    <>
      {/* DESKTOP — rail fin vertical, épinglé à gauche, présent partout */}
      <aside className="hidden lg:flex fixed left-0 top-0 z-40 h-dvh w-[76px] flex-col items-center border-r border-border bg-background py-3">
        <RailSwitcher />
        <nav className="flex w-full flex-1 flex-col items-center gap-0.5 pt-1">
          {FAMILLES.map((f) => (
            <Onglet key={f.cle} famille={f} actif={active?.cle === f.cle} onClick={aller(f)} rail />
          ))}
        </nav>
        <Link href="/compte" aria-label="Mon compte" className="flex w-full flex-col items-center gap-1 pt-1 text-2xs">
          <span
            className={cn(
              'grid size-8 place-items-center rounded-full border transition-colors',
              compteActif ? 'border-primary text-primary' : 'border-border text-muted-foreground',
            )}
          >
            <User className="size-4 stroke-[1.75]" />
          </span>
          <span className={cn('leading-none', compteActif ? 'font-semibold text-primary' : 'text-muted-foreground')}>
            Compte
          </span>
        </Link>
      </aside>

      {/* MOBILE — bottom bar. Masquée dans un fil / une page immersive. */}
      {!immersive && (
        <nav
          className="lg:hidden fixed inset-x-0 bottom-0 z-[47] flex border-t border-border bg-surface/95 backdrop-blur-md"
          style={{ height: 'calc(62px + env(safe-area-inset-bottom))', paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {FAMILLES.map((f) => (
            <Onglet key={f.cle} famille={f} actif={active?.cle === f.cle} onClick={aller(f)} />
          ))}
        </nav>
      )}
    </>
  )
}

/**
 * Un onglet. Le verbe plutôt que le nom de l'agent : le distributeur cherche
 * ce qu'il veut FAIRE, pas qui va le faire. Le nom de l'agent l'accueille
 * ensuite, sur la racine de la famille.
 */
function Onglet({
  famille, actif, onClick, rail = false,
}: { famille: Famille; actif: boolean; onClick: (e: React.MouseEvent) => void; rail?: boolean }) {
  const Icone = famille.icone
  const teinte = actif ? famille.couleur : undefined

  if (rail) {
    return (
      <a
        href={famille.racine}
        onClick={onClick}
        aria-label={`${famille.verbe} — ${famille.agent}`}
        aria-current={actif ? 'page' : undefined}
        className="flex w-full flex-col items-center gap-1 py-1.5 text-2xs"
      >
        <span
          className="flex h-8 w-12 items-center justify-center rounded-[11px] transition-colors"
          style={actif ? { background: `${famille.couleur}1A`, color: teinte } : undefined}
        >
          <Icone className={cn('size-[22px] stroke-[1.75]', !actif && 'text-muted-foreground')} />
        </span>
        <span
          className={cn('leading-none', actif ? 'font-semibold' : 'text-muted-foreground')}
          style={actif ? { color: teinte } : undefined}
        >
          {famille.verbe}
        </span>
      </a>
    )
  }

  return (
    <a
      href={famille.racine}
      onClick={onClick}
      aria-label={`${famille.verbe} — ${famille.agent}`}
      aria-current={actif ? 'page' : undefined}
      className="flex flex-1 flex-col items-center justify-center gap-1 text-2xs"
    >
      <Icone
        className={cn('size-[23px] stroke-[1.75]', !actif && 'text-muted-foreground')}
        style={actif ? { color: teinte } : undefined}
      />
      <span
        className={cn('leading-none', actif ? 'font-semibold' : 'text-muted-foreground')}
        style={actif ? { color: teinte } : undefined}
      >
        {famille.verbe}
      </span>
    </a>
  )
}

// Switcher MLM au sommet du rail (desktop) : avatar de l'activité active + popover.
// Sur mobile, le switcher vit dans /compte, pas ici.
function RailSwitcher() {
  const { current, all, setCurrent } = useBusiness()
  const [open, setOpen] = useState(false)
  const switchTo = (b: Business) => {
    setCurrent(b)
    if (b.id && !b.isAtline) {
      fetch('/api/businesses/active', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: b.id }) }).catch(() => {})
    }
    setOpen(false)
  }
  return (
    <div className="relative mb-2 shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Changer d'activité"
        title={current.name}
        className="grid size-9 place-items-center rounded-[11px] text-sm font-bold text-white transition-transform active:scale-95"
        style={{ background: current.color }}
      >
        {current.initials || current.name[0]}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[55]" onClick={() => setOpen(false)} />
          <div className="absolute left-full top-0 z-[56] ml-2 w-56 overflow-hidden rounded-2xl border border-border bg-surface py-1 shadow-[0_16px_40px_rgba(0,0,0,.18)]">
            <p className="px-3 pb-1 pt-2 text-2xs font-bold uppercase tracking-widest text-muted-foreground">Mon activité</p>
            {all.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => switchTo(b)}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-muted active:bg-muted"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-lg text-2xs font-bold text-white" style={{ background: b.color }}>{b.initials || b.name[0]}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{b.name}</span>
                {current.id === b.id && <Check className="size-4 shrink-0 text-primary" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
