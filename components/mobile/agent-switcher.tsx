'use client'

import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronDown, Check } from 'lucide-react'
import { AGENTS } from '@/components/mobile/nav-config'

// Switcher d'agent façon Mistral (haut-centre) — point de couleur = agent courant.
export function AgentSwitcher() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const current = AGENTS.find((a) => pathname === a.href || pathname.startsWith(a.href + '/')) ?? AGENTS[0]

  // Position sous le bouton (menu porté dans <body> pour échapper au backdrop-blur de la top-bar)
  useLayoutEffect(() => {
    if (!open || !btnRef.current) return
    const r = btnRef.current.getBoundingClientRect()
    setPos({ top: r.bottom + 8, left: r.left + r.width / 2 })
  }, [open])

  // Fermeture au clic hors du bouton ET du menu
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full py-1.5 pl-3 pr-2 text-lg font-semibold text-foreground active:bg-muted"
      >
        <span className="size-2 shrink-0 rounded-full" style={{ background: current.color }} />
        {current.label}
        <ChevronDown className="size-4 text-muted-foreground" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
      </button>

      {open && typeof window !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[80] w-64 -translate-x-1/2 rounded-2xl border border-black/5 bg-surface p-1 shadow-[0_12px_32px_rgba(0,0,0,.10),0_2px_6px_rgba(0,0,0,.06)]"
          style={{ top: pos.top, left: pos.left }}
        >
          {AGENTS.map((a) => {
            const active = a.href === current.href
            return (
              <button
                key={a.href}
                type="button"
                onClick={() => { setOpen(false); router.push(a.href) }}
                className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2 text-left active:bg-muted"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-semibold text-foreground">{a.label}</span>
                  <span className="block truncate text-base text-muted-foreground">{a.sub}</span>
                </span>
                {active && <Check className="size-4 shrink-0 text-foreground" />}
              </button>
            )
          })}
        </div>,
        document.body,
      )}
    </>
  )
}
