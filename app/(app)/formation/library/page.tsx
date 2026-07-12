'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/card'
import { SectionTabs, FORMATION_TABS } from '@/components/section-tabs'
import { ChevronDown, BookOpen, ShoppingCart, Headphones, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type Book = {
  id: string
  title: string
  author: string
  summary: string
  keyMessage: string
  whyRead: string
  keyConcepts: string[]
  tags: string[]
  chapters: number
  amazonUrl: string | null
  audibleUrl: string | null
}

// Découpe un pavé en paragraphes lisibles (~3 phrases chacun)
function toParagraphs(text: string): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+(?:\s|$)/g) || [text]
  const out: string[] = []
  for (let i = 0; i < sentences.length; i += 3) out.push(sentences.slice(i, i + 3).join('').trim())
  return out.filter(Boolean)
}

function BookCard({ book }: { book: Book }) {
  const [open, setOpen] = useState(false)
  const buy = (url: string | null) => {
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
    else toast.info("Lien d'achat bientôt disponible")
  }
  return (
    <Card className="overflow-hidden p-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start gap-3 p-4 text-left transition-colors active:bg-muted/40"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <BookOpen className="size-5 stroke-[1.5]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-snug text-foreground">{book.title}</p>
          <p className="text-xs text-muted-foreground">{book.author}</p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {book.tags.slice(0, 3).map((t) => (
              <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">{t}</span>
            ))}
          </div>
        </div>
        <ChevronDown className={cn('size-5 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="border-t border-border px-4 pb-4 pt-4">
          {/* Accroche */}
          {book.keyMessage && (
            <p className="border-l-2 border-primary pl-3 text-sm font-semibold italic leading-snug text-primary">{book.keyMessage}</p>
          )}

          {/* Résumé en paragraphes */}
          <div className="mt-4 flex flex-col gap-3">
            {toParagraphs(book.summary).map((p, i) => (
              <p key={i} className="text-sm leading-relaxed text-foreground text-pretty">{p}</p>
            ))}
          </div>

          {/* Points clés */}
          {book.keyConcepts.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Points clés</p>
              <ul className="flex flex-col gap-2">
                {book.keyConcepts.map((c, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary stroke-[2.5]" />
                    <span className="text-sm leading-snug text-foreground text-pretty">{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Pourquoi le lire */}
          {book.whyRead && (
            <div className="mt-5 rounded-xl bg-muted/60 p-3">
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">Pourquoi le lire</p>
              <p className="text-sm leading-relaxed text-foreground text-pretty">{book.whyRead}</p>
            </div>
          )}

          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() => buy(book.amazonUrl)}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground transition-opacity active:opacity-90"
            >
              <ShoppingCart className="size-4 stroke-[1.5]" />Acheter
            </button>
            <button
              type="button"
              onClick={() => buy(book.audibleUrl)}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-surface py-2.5 text-sm font-bold text-foreground transition-colors active:bg-muted"
            >
              <Headphones className="size-4 stroke-[1.5]" />Audible
            </button>
          </div>
        </div>
      )}
    </Card>
  )
}

function Library() {
  const [books, setBooks] = useState<Book[] | null>(null)
  useEffect(() => {
    fetch('/api/books')
      .then((r) => r.json())
      .then((d) => setBooks(d.books || []))
      .catch(() => setBooks([]))
  }, [])
  return (
    <div className="flex flex-col gap-3">
      {!books && Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-[88px] animate-pulse rounded-xl bg-muted" />)}
      {books && books.length === 0 && (
        <p className="py-12 text-center text-sm text-muted-foreground">Bibliothèque bientôt disponible.</p>
      )}
      {books && books.map((b) => <BookCard key={b.id} book={b} />)}
    </div>
  )
}

export default function LibraryPage() {
  return (
    <>
      {/* ── MOBILE ONLY ── */}
      <div className="lg:hidden">
        <div className="flex flex-col gap-4 px-4 pt-5 pb-8">
          {/* Titre géré par la top-bar centrée */}
          <SectionTabs items={FORMATION_TABS} />
          <Library />
        </div>
      </div>

      {/* ── DESKTOP ONLY ── */}
      <div className="hidden lg:block px-8 pt-8 pb-10 max-w-2xl mx-auto">
        <h1 className="mb-6 font-display text-[32px] font-extrabold leading-tight tracking-[-0.025em] text-foreground">Bibliothèque</h1>
        <Library />
      </div>
    </>
  )
}
