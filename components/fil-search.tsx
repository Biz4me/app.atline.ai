'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronUp, ChevronDown, Search } from 'lucide-react'
import { norm } from '@/lib/atlas-commands'

// ═══ Recherche DANS la conversation (façon Telegram) ═══
// Le ⋮ de l'en-tête bascule la barre en champ de recherche ; on navigue de
// correspondance en correspondance (˄ plus ancien · ˅ plus récent), le fil
// défile et surligne. Partagé : fil Atlas + fils contact.

export function useFilSearch(texts: string[]) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const active = open && q.trim().length >= 2

  const matches = useMemo(() => {
    if (!active) return []
    const nq = norm(q.trim())
    return texts.reduce<number[]>((acc, t, i) => { if (t && norm(t).includes(nq)) acc.push(i); return acc }, [])
  }, [active, q, texts])

  const [cur, setCur] = useState(-1)
  // Nouvelle requête → on se cale sur la correspondance la plus récente (bas du fil)
  useEffect(() => { setCur(matches.length ? matches.length - 1 : -1) }, [q, matches.length]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (cur < 0 || !matches.length) return
    document.querySelector(`[data-midx="${matches[cur]}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [cur, matches])

  const close = () => { setOpen(false); setQ('') }
  const prev = () => setCur((c) => (c > 0 ? c - 1 : c))
  const next = () => setCur((c) => (c < matches.length - 1 ? c + 1 : c))
  // Classe de surlignage d'un message (correspondance courante plus marquée)
  const highlight = (i: number): string =>
    !active ? '' : matches[cur] === i ? 'rounded-xl bg-primary/15 ring-1 ring-primary/40' : matches.includes(i) ? 'rounded-xl bg-primary/5' : ''

  return { open, setOpen, q, setQ, active, matches, cur, prev, next, close, highlight }
}

export function FilSearchRow({ s, placeholder = 'Chercher dans la conversation…' }: {
  s: ReturnType<typeof useFilSearch>; placeholder?: string
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}>
      <button type="button" aria-label="Quitter la recherche" onClick={s.close} className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground active:bg-muted">
        <ChevronLeft className="size-5 stroke-[1.5]" />
      </button>
      <div className="flex flex-1 items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-2">
        <Search className="size-4 shrink-0 stroke-[1.5] text-muted-foreground" />
        <input
          autoFocus
          value={s.q}
          onChange={(e) => s.setQ(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        {s.active && <span className="shrink-0 text-xs text-muted-foreground">{s.matches.length ? `${s.cur + 1}/${s.matches.length}` : '0'}</span>}
      </div>
      <button type="button" aria-label="Plus ancien" onClick={s.prev} disabled={s.cur <= 0} className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground active:bg-muted disabled:opacity-30">
        <ChevronUp className="size-5 stroke-[1.5]" />
      </button>
      <button type="button" aria-label="Plus récent" onClick={s.next} disabled={s.cur >= s.matches.length - 1} className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground active:bg-muted disabled:opacity-30">
        <ChevronDown className="size-5 stroke-[1.5]" />
      </button>
    </div>
  )
}
