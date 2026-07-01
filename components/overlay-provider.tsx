'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

// Un seul overlay « plein-largeur » ouvert à la fois (switcher, menu « ⋯ », et futurs agenda/messagerie…).
// Ouvrir l'un via setOpenId('x') ; tout overlay dont l'id ≠ openId se ferme instantanément.
type OverlayId = string | null

interface OverlayCtx {
  openId: OverlayId
  setOpenId: (id: OverlayId) => void
}

const Ctx = createContext<OverlayCtx | null>(null)

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [openId, setOpenId] = useState<OverlayId>(null)
  return <Ctx.Provider value={{ openId, setOpenId }}>{children}</Ctx.Provider>
}

export function useOverlay(): OverlayCtx {
  const ctx = useContext(Ctx)
  // Fallback no-op si utilisé hors provider (ex. switcher desktop isolé)
  return ctx ?? { openId: null, setOpenId: () => {} }
}
