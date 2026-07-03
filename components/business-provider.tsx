'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { Business } from '@/lib/types'

interface BusinessCtx {
  current: Business
  all: Business[]
  setCurrent: (b: Business) => void
  addBusiness: (name: string) => Promise<void>
  refresh: () => Promise<void>
}

const Ctx = createContext<BusinessCtx | null>(null)

const ATLINE_BIZ: Business = { id: 'atline', name: 'Atline', initials: 'A', color: '#F97316', isAtline: true }

export function BusinessProvider({ children }: { children: ReactNode }) {
  const [all, setAll] = useState<Business[]>([ATLINE_BIZ])
  const [current, setCurrent] = useState<Business>(ATLINE_BIZ)

  async function refresh() {
    try {
      const res = await fetch('/api/businesses')
      if (!res.ok) return
      const data: Business[] = await res.json()
      const list = [ATLINE_BIZ, ...data]
      setAll(list)
      // Mettre l'actif en courant
      const active = data.find((b: any) => b.isActive)
      if (active) setCurrent(active)
      else if (data.length > 0) setCurrent(data[0])
    } catch {}
  }

  useEffect(() => { refresh() }, [])

  async function addBusiness(name: string) {
    try {
      await fetch('/api/businesses', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name }) })
    } catch {}
    await refresh()
  }

  return (
    <Ctx.Provider value={{ current, all, setCurrent, addBusiness, refresh }}>
      {children}
    </Ctx.Provider>
  )
}

export function useBusiness() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useBusiness must be used within BusinessProvider')
  return ctx
}
