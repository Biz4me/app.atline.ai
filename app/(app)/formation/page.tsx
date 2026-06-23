'use client'

import { useState } from 'react'
import { AppHeader } from '@/components/app-header'
import { Card, SectionTitle } from '@/components/card'
import { BookOpen, Play, CheckCircle2, Lock, Clock, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

type Module = {
  id: string
  title: string
  category: string
  duration: string
  lessons: number
  progress: number
  locked: boolean
  color: string
  description: string
}

const modules: Module[] = [
  {
    id: 'm1',
    title: 'Les bases du MLM',
    category: 'Fondamentaux',
    duration: '18 min',
    lessons: 4,
    progress: 100,
    locked: false,
    color: 'bg-success',
    description: 'Comprends le modèle MLM, ses avantages et comment réussir.',
  },
  {
    id: 'm2',
    title: 'Construire sa liste de noms',
    category: 'Prospection',
    duration: '30 min',
    lessons: 6,
    progress: 60,
    locked: false,
    color: 'bg-primary',
    description: "Apprends à alimenter en continu ta liste de contacts et à repérer les bons profils.",
  },
  {
    id: 'm3',
    title: "Construire ton script d'invitation",
    category: 'Prospection',
    duration: '32 min',
    lessons: 8,
    progress: 0,
    locked: false,
    color: 'bg-violet-500',
    description: 'Structure tes invitations pour maximiser les acceptations.',
  },
  {
    id: 'm4',
    title: 'Gérer les objections',
    category: 'Prospection',
    duration: '28 min',
    lessons: 7,
    progress: 0,
    locked: false,
    color: 'bg-amber-500',
    description: 'Transforme les hésitations en opportunités.',
  },
  {
    id: 'm5',
    title: "Construire ton équipe",
    category: 'Leadership',
    duration: '45 min',
    lessons: 10,
    progress: 0,
    locked: true,
    color: 'bg-primary',
    description: 'Recrute, forme et fidélise tes filleuls.',
  },
  {
    id: 'm6',
    title: 'Stratégie réseaux sociaux',
    category: 'Marketing',
    duration: '36 min',
    lessons: 9,
    progress: 0,
    locked: true,
    color: 'bg-blue-500',
    description: 'Crée du contenu qui attire et convertit naturellement.',
  },
]

const categories = ['Tous', 'Fondamentaux', 'Prospection', 'Leadership', 'Marketing']

const books = [
  { id: 'b1', title: 'Va te faire foutre patron !', author: 'Robert Kiyosaki', read: true },
  { id: 'b2', title: 'Go Pro', author: 'Eric Worre', read: false },
  { id: 'b3', title: "Tout le monde mérite d'être riche", author: 'Marc Fiorentino', read: false },
]

function ModuleCard({ mod }: { mod: Module }) {
  return (
    <Link href={mod.locked ? '#' : `/formation/${mod.id}`}>
      <Card className={cn('overflow-hidden transition-colors', mod.locked ? 'opacity-60' : 'active:bg-muted/50')}>
        <div className="flex items-center gap-3 p-3.5">
          <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl', mod.locked ? 'bg-muted' : mod.color)}>
            {mod.locked ? (
              <Lock className="size-5 stroke-[1.5] text-muted-foreground" />
            ) : (
              <BookOpen className="size-5 stroke-[1.5] text-white" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-bold text-foreground">{mod.title}</p>
              {mod.progress === 100 ? (
                <CheckCircle2 className="size-5 shrink-0 text-success stroke-2" />
              ) : mod.locked ? (
                <Lock className="size-4 shrink-0 text-muted-foreground" />
              ) : (
                <Play className="size-5 shrink-0 text-muted-foreground" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">{mod.category}</p>
            <div className="mt-1 flex items-center gap-2">
              <Clock className="size-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{mod.duration}</span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">{mod.lessons} leçons</span>
            </div>
            {mod.progress > 0 && mod.progress < 100 && (
              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${mod.progress}%` }} />
              </div>
            )}
          </div>
        </div>
      </Card>
    </Link>
  )
}

export default function FormationPage() {
  const [activeCategory, setActiveCategory] = useState('Tous')

  const filtered = activeCategory === 'Tous'
    ? modules
    : modules.filter((m) => m.category === activeCategory)

  const completedCount = modules.filter((m) => m.progress === 100).length
  const totalProgress = Math.round(modules.reduce((acc, m) => acc + m.progress, 0) / modules.length)

  const CategoryChips = () => (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {categories.map((cat) => (
        <button
          key={cat}
          type="button"
          onClick={() => setActiveCategory(cat)}
          className={cn(
            'shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
            activeCategory === cat
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'
          )}
        >
          {cat}
        </button>
      ))}
    </div>
  )

  const ProgressCard = () => (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">{completedCount}/{modules.length} modules complétés</p>
        <span className="text-sm font-bold text-primary">{totalProgress}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${totalProgress}%` }} />
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        <Star className="size-4 text-amber-500 fill-amber-500" />
        <p className="text-xs text-muted-foreground">
          Continue ta progression pour débloquer les modules avancés
        </p>
      </div>
    </Card>
  )

  const BooksSection = () => (
    <section>
      <SectionTitle>Bibliothèque MLM</SectionTitle>
      <Card className="divide-y divide-border p-0">
        {books.map((book) => (
          <div key={book.id} className="flex items-center gap-3 px-4 py-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-xl">📚</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{book.title}</p>
              <p className="text-xs text-muted-foreground">{book.author}</p>
            </div>
            {book.read ? (
              <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-bold text-success">Lu</span>
            ) : (
              <button type="button" className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                À lire
              </button>
            )}
          </div>
        ))}
      </Card>
    </section>
  )

  return (
    <>
      {/* ── MOBILE ONLY ── */}
      <div className="lg:hidden">
        <AppHeader title="Formation" back />
        <div className="flex flex-col gap-5 px-4 pt-4 pb-8">
          <ProgressCard />
          <CategoryChips />
          <section>
            <div className="grid gap-3">
              {filtered.map((mod) => <ModuleCard key={mod.id} mod={mod} />)}
            </div>
          </section>
          <BooksSection />
        </div>
      </div>

      {/* ── DESKTOP ONLY ── */}
      <div className="hidden lg:block">
        <div className="flex flex-col gap-5 px-8 pt-8 pb-8 max-w-5xl mx-auto">
          <ProgressCard />
          <CategoryChips />
          <section>
            <div className="grid gap-3 grid-cols-2">
              {filtered.map((mod) => <ModuleCard key={mod.id} mod={mod} />)}
            </div>
          </section>
          <BooksSection />
        </div>
      </div>
    </>
  )
}
