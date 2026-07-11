'use client'

import { useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'

export type SelectOption = { value: string; label: string }

// Déroulant custom (même esprit que l'onboarding) : panneau blanc arrondi flottant
// qui COUVRE le champ (carte de base invisible), se retourne vers le haut si besoin,
// hauteur plafonnée, et se ferme au scroll (sinon il se détache du champ).
export function SelectMenu({
  value,
  onChange,
  options,
  placeholder,
  className = '',
}: {
  value: string
  onChange: (v: string) => void
  options: SelectOption[]
  placeholder: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number; maxH: number; up: boolean } | null>(null)
  const selected = options.find((o) => o.value === value)

  const openMenu = () => {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const margin = 14
    const cap = 320 // ~6 choix visibles puis scroll
    const spaceBelow = window.innerHeight - r.top - margin
    const spaceAbove = r.bottom - margin
    const up = spaceBelow < Math.min(cap, 240) && spaceAbove > spaceBelow
    const maxH = Math.round(Math.min(cap, up ? spaceAbove : spaceBelow))
    // Recouvre le champ de 2px (même rayon rounded-xl) → la carte de base ne dépasse jamais
    setPos({
      left: Math.round(r.left) - 2,
      width: Math.round(r.width) + 4,
      top: up ? undefined : Math.round(r.top) - 2,
      bottom: up ? Math.round(window.innerHeight - r.bottom) - 2 : undefined,
      maxH,
      up,
    })
    setOpen(true)
  }

  // Fermeture au scroll de la PAGE (panneau fixed → sinon il reste figé pendant qu'elle bouge).
  // Le défilement INTERNE du panneau, lui, ne doit jamais fermer (sinon menu « bloqué »).
  useEffect(() => {
    if (!open) return
    const close = (e: Event) => {
      if (panelRef.current && e.target instanceof Node && panelRef.current.contains(e.target)) return
      setOpen(false)
    }
    window.addEventListener('scroll', close, true)
    return () => window.removeEventListener('scroll', close, true)
  }, [open])

  return (
    <>
      <button type="button" ref={triggerRef} onClick={openMenu} className={`flex w-full items-center justify-between gap-2 ${className}`}>
        <span className={`truncate ${selected ? 'text-foreground' : 'text-muted-foreground'}`}>{selected ? selected.label : placeholder}</span>
        <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && pos && typeof window !== 'undefined' && createPortal(
        <>
          <div className="fixed inset-0 z-[998]" onClick={() => setOpen(false)} />
          <div
            ref={panelRef}
            className="fixed z-[999] overflow-y-auto overscroll-contain rounded-xl border border-[#e2e2e8] bg-white py-1 shadow-[0_16px_44px_rgba(0,0,0,.16)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ left: pos.left, width: pos.width, maxHeight: pos.maxH, ...(pos.up ? { bottom: pos.bottom } : { top: pos.top }) }}
          >
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false) }}
                className={`block w-full px-[18px] py-3 text-left text-lg active:bg-muted ${o.value === value ? 'font-semibold text-foreground' : 'text-[#2b2d33]'}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </>,
        document.body,
      )}
    </>
  )
}
