'use client'

import { useEffect, useState } from 'react'
import { ExternalLink, ImageOff, Loader2 } from 'lucide-react'

// Carte produit — Atlas émet le marqueur invisible [[PRODUCT:slug]] à la fin de son message.
// L'app va chercher le VRAI produit en base (image, prix, infos) : jamais inventé par Atlas.
// Réutilisé par Nova pour la publication réseaux sociaux.

export const PRODUCT_MARK = '[[PRODUCT:'
export const PRODUCT_MARK_RE = /\[\[PRODUCT:([a-z0-9-]+)\]\]/
export const stripProductMarker = (content: string): string =>
  content.replace(/\s*\[\[PRODUCT:[a-z0-9-]+\]\]/g, '')

type Product = {
  name: string
  company: string | null
  category: string | null
  description: string | null
  usage: string | null
  price: number | null
  currency: string
  format: string | null
  imageUrl: string | null
  sourceUrl: string | null
}

export function AtlasProductCard({ slug }: { slug: string }) {
  const [p, setP] = useState<Product | null>(null)
  const [state, setState] = useState<'loading' | 'error'>('loading')

  useEffect(() => {
    let alive = true
    fetch(`/api/products/${slug}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (alive) { setP(d); setState('loading') } })
      .catch(() => { if (alive) setState('error') })
    return () => { alive = false }
  }, [slug])

  if (state === 'error') return null // produit introuvable : on n'affiche rien (le texte d'Atlas suffit)

  if (!p) {
    return (
      <div className="mt-2 flex items-center gap-2 rounded-2xl border border-border bg-surface p-3 text-xs text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Chargement du produit…
      </div>
    )
  }

  return (
    <div className="mt-2 overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
      <div className="flex gap-3 p-3">
        <div className="size-20 shrink-0 overflow-hidden rounded-xl bg-muted">
          {p.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.imageUrl} alt={p.name} className="size-full object-cover" loading="lazy" />
          ) : (
            <div className="grid size-full place-items-center text-muted-foreground"><ImageOff className="size-6" /></div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          {p.company && <div className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">{p.company}</div>}
          <div className="text-sm font-semibold text-foreground">{p.name}</div>
          {(p.format || p.category) && (
            <div className="text-xs text-muted-foreground">{[p.category, p.format].filter(Boolean).join(' · ')}</div>
          )}
          {p.price != null && (
            <div className="mt-1 text-lg font-bold text-primary">
              {p.price.toFixed(2).replace('.', ',')} {p.currency === 'EUR' ? '€' : p.currency}
            </div>
          )}
          {p.description && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>
          )}
        </div>
      </div>
      {p.sourceUrl && (
        <a
          href={p.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 border-t border-border py-2 text-xs font-semibold text-primary active:opacity-60"
        >
          Voir sur la boutique <ExternalLink className="size-3.5" />
        </a>
      )}
    </div>
  )
}
