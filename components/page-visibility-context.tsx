'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Visibility = Record<string, boolean>

const Ctx = createContext<Visibility>({})

export function usePageVisibility() {
  return useContext(Ctx)
}

export function PageVisibilityProvider({ children }: { children: ReactNode }) {
  const [vis, setVis] = useState<Visibility>({})

  useEffect(() => {
    fetch('/api/pages-visibility')
      .then(r => r.json())
      .then(d => setVis(d.visibility ?? {}))
      .catch(() => {})
  }, [])

  return <Ctx.Provider value={vis}>{children}</Ctx.Provider>
}
