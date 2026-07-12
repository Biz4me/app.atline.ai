'use client'

import { useState } from 'react'
import { AppHeader } from '@/components/app-header'
import { Card } from '@/components/card'
import { MessageSquare, Heart, Pin, Plus, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type Space = 'general' | 'herbalife'
type Category = 'Tous' | 'Prospection' | 'Contenu' | 'Mindset' | 'Wins'

const threads = [
  {
    id: 't1',
    space: 'general' as Space,
    category: 'Prospection',
    categoryColor: 'bg-blue-100 text-blue-700',
    title: 'Comment relancer sans être lourd ?',
    author: 'Marie Lefèvre',
    authorInitials: 'ML',
    authorColor: 'bg-blue-500',
    company: 'Herbalife',
    companyColor: 'bg-green-100 text-green-700',
    comments: 23,
    likes: 45,
    pinned: true,
    time: 'Il y a 2 h',
  },
  {
    id: 't2',
    space: 'general' as Space,
    category: 'Wins',
    categoryColor: 'bg-success/15 text-success',
    title: 'Mon premier 1000 € ce mois',
    author: 'Thomas Bonnet',
    authorInitials: 'TB',
    authorColor: 'bg-emerald-500',
    company: 'Forever',
    companyColor: 'bg-emerald-100 text-emerald-700',
    comments: 12,
    likes: 67,
    pinned: false,
    time: 'Il y a 5 h',
  },
  {
    id: 't3',
    space: 'general' as Space,
    category: 'Contenu',
    categoryColor: 'bg-violet-100 text-violet-700',
    title: 'La routine contenu qui convertit',
    author: 'Léa Martin',
    authorInitials: 'LM',
    authorColor: 'bg-violet-500',
    company: 'doTERRA',
    companyColor: 'bg-violet-100 text-violet-700',
    comments: 8,
    likes: 31,
    pinned: false,
    time: 'Hier',
  },
  {
    id: 't4',
    space: 'general' as Space,
    category: 'Mindset',
    categoryColor: 'bg-amber-100 text-amber-700',
    title: 'Comment gérer le regard des proches ?',
    author: 'Sarah Dumont',
    authorInitials: 'SD',
    authorColor: 'bg-amber-500',
    company: 'Atline',
    companyColor: 'bg-orange-100 text-primary',
    comments: 34,
    likes: 89,
    pinned: false,
    time: 'Hier',
  },
  {
    id: 't5',
    space: 'general' as Space,
    category: 'Wins',
    categoryColor: 'bg-success/15 text-success',
    title: "J'ai recruté 3 filleuls en 2 semaines avec la méthode DISC",
    author: 'Nadia Benali',
    authorInitials: 'NB',
    authorColor: 'bg-primary',
    company: 'Atline',
    companyColor: 'bg-orange-100 text-primary',
    comments: 19,
    likes: 52,
    pinned: false,
    time: 'Il y a 2 j',
  },
  {
    id: 't6',
    space: 'herbalife' as Space,
    category: 'Prospection',
    categoryColor: 'bg-blue-100 text-blue-700',
    title: 'Script invitation pour les profils Formule 1',
    author: 'Paul Renaud',
    authorInitials: 'PR',
    authorColor: 'bg-blue-600',
    company: 'Herbalife',
    companyColor: 'bg-green-100 text-green-700',
    comments: 15,
    likes: 28,
    pinned: false,
    time: 'Il y a 3 j',
  },
  {
    id: 't7',
    space: 'herbalife' as Space,
    category: 'Wins',
    categoryColor: 'bg-success/15 text-success',
    title: 'Qualifiée Supervisor en 45 jours !',
    author: 'Claire Morel',
    authorInitials: 'CM',
    authorColor: 'bg-green-600',
    company: 'Herbalife',
    companyColor: 'bg-green-100 text-green-700',
    comments: 41,
    likes: 103,
    pinned: true,
    time: 'Il y a 4 j',
  },
]

const spaces: { id: Space; label: string }[] = [
  { id: 'general', label: 'Général' },
  { id: 'herbalife', label: 'Herbalife' },
]

const categories: Category[] = ['Tous', 'Prospection', 'Contenu', 'Mindset', 'Wins']

export default function CommunautePage() {
  const [space, setSpace] = useState<Space>('general')
  const [category, setCategory] = useState<Category>('Tous')
  const [liked, setLiked] = useState<Set<string>>(new Set())

  const filtered = threads.filter(
    (t) => t.space === space && (category === 'Tous' || t.category === category)
  )

  const toggleLike = (id: string) => {
    setLiked((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function Content({ maxWidth }: { maxWidth?: string }) {
    return (
      <div className={cn('flex flex-col gap-4', maxWidth)}>
        {/* Spaces tabs */}
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
          {spaces.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => { setSpace(s.id); setCategory('Tous') }}
              className={cn(
                'rounded-lg py-2 text-base font-semibold transition-all',
                space === s.id
                  ? 'bg-background text-primary shadow-sm'
                  : 'text-muted-foreground'
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Category chips */}
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={cn(
                'shrink-0 rounded-full px-3.5 py-1.5 text-base font-semibold transition-colors',
                category === cat
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Trending */}
        <div className="flex items-center gap-1.5">
          <TrendingUp className="size-3.5 text-primary" />
          <span className="text-base font-semibold text-primary">
            {filtered.filter(t => t.likes > 50).length} discussions tendance cette semaine
          </span>
        </div>

        {/* Threads */}
        <div className="flex flex-col gap-2.5">
          {filtered.map((thread) => (
            <div
              key={thread.id}
              onClick={() => toast.info(`Ouvrir "${thread.title}"`)}
              className="cursor-pointer text-left"
            >
              <Card className="p-4 transition-colors active:bg-muted/50">
                <div className="mb-2 flex items-center gap-2">
                  {thread.pinned && <Pin className="size-3 shrink-0 text-primary" />}
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-bold', thread.categoryColor)}>
                    {thread.category}
                  </span>
                </div>
                <p className="mb-3 text-lg font-semibold leading-snug text-foreground">
                  {thread.title}
                </p>
                <div className="flex items-center gap-2">
                  <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white', thread.authorColor)}>
                    {thread.authorInitials}
                  </span>
                  <span className="text-base font-semibold text-foreground">{thread.author}</span>
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', thread.companyColor)}>
                    {thread.company}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">{thread.time}</span>
                </div>
                <div className="mt-3 flex items-center gap-4 border-t border-border pt-2.5">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MessageSquare className="size-3.5 stroke-[1.5]" />
                    <span>{thread.comments}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleLike(thread.id) }}
                    className={cn('flex items-center gap-1.5 text-xs transition-colors', liked.has(thread.id) ? 'text-primary' : 'text-muted-foreground')}
                  >
                    <Heart className={cn('size-3.5 stroke-[1.5]', liked.has(thread.id) && 'fill-primary')} />
                    <span>{thread.likes + (liked.has(thread.id) ? 1 : 0)}</span>
                  </button>
                </div>
              </Card>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => toast.info('Nouvelle discussion')}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-base font-bold text-primary-foreground transition-transform active:scale-[0.98]"
        >
          <Plus className="size-5 stroke-2" />
          Nouvelle discussion
        </button>
      </div>
    )
  }

  return (
    <>
      {/* ── MOBILE ONLY ── (titre + navigation gérés par la top-bar / tiroir) */}
      <div className="lg:hidden">
        <div className="px-4 pt-3 pb-8">
          <Content />
        </div>
      </div>

      {/* ── DESKTOP ONLY ── */}
      <div className="hidden lg:block">
        <div className="px-8 pt-8 pb-8 max-w-2xl mx-auto">
          <Content />
        </div>
      </div>
    </>
  )
}
