'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import { businesses as staticBusinesses } from '@/lib/data'
import type { Business } from '@/lib/types'

interface BusinessCtx {
  current: Business
  all: Business[]
  setCurrent: (b: Business) => void
  addBusiness: (name: string) => void
}

const Ctx = createContext<BusinessCtx | null>(null)

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#ef4444']

export function BusinessProvider({ children }: { children: ReactNode }) {
  const [all, setAll] = useState<Business[]>(staticBusinesses)
  const [current, setCurrent] = useState<Business>(staticBusinesses[0])

  function addBusiness(name: string) {
    const words = name.trim().split(' ')
    const initials = words.length >= 2
      ? (words[0][0] + words[1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase()
    const color = COLORS[all.length % COLORS.length]
    const b: Business = { id: `biz-${Date.now()}`, name: name.trim(), initials, color }
    setAll(prev => [...prev, b])
    setCurrent(b)
  }

  return (
    <Ctx.Provider value={{ current, all, setCurrent, addBusiness }}>
      {children}
    </Ctx.Provider>
  )
}

export function useBusiness() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useBusiness must be used within BusinessProvider')
  return ctx
}
