'use client'

import { useRouter } from 'next/navigation'
import { Bell, ChevronLeft, SquarePen, Plus, Calendar, MessageCircle } from 'lucide-react'
import { DiscAvatar } from '@/components/disc-avatar'
import { currentUser } from '@/lib/data'
import Link from 'next/link'

interface AppHeaderProps {
  title: string
  back?: boolean
  showActions?: boolean
  showNova?: boolean
  showCreate?: boolean
}

export function AppHeader({
  title,
  back = false,
  showActions = true,
  showNova = false,
  showCreate = false,
}: AppHeaderProps) {
  const router = useRouter()
  return (
    <header
      className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur lg:hidden"
      style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
    >
      {back && (
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Retour"
          className="-ml-1 flex size-9 items-center justify-center rounded-full text-fg-2 transition-colors active:bg-muted"
        >
          <ChevronLeft className="size-5 stroke-[1.5]" />
        </button>
      )}
      <h1 className="flex-1 truncate font-display text-[32px] font-bold leading-tight tracking-[-0.025em] text-foreground">
        {title}
      </h1>
      {showActions && (
        <div className="flex items-center gap-1">
          {showNova && (
            <Link
              href="/nova"
              aria-label="Créer un post Nova"
              className="flex size-9 items-center justify-center rounded-full text-fg-2 transition-colors active:bg-muted"
            >
              <SquarePen className="size-5 stroke-[1.5]" />
            </Link>
          )}
          {showCreate && (
            <Link
              href="/nova/create"
              aria-label="Nouveau post"
              className="flex size-9 items-center justify-center rounded-full text-fg-2 transition-colors active:bg-muted"
            >
              <Plus className="size-5 stroke-[1.5]" />
            </Link>
          )}
          {/* Calendar → Nova */}
          <Link
            href="/nova"
            aria-label="Calendrier éditorial"
            className="flex size-9 items-center justify-center rounded-full text-fg-2 transition-colors active:bg-muted"
          >
            <Calendar className="size-5 stroke-[1.5]" />
          </Link>
          {/* Notifications */}
          <Link
            href="/notifications"
            aria-label="Notifications"
            className="relative flex size-9 items-center justify-center rounded-full text-fg-2 transition-colors active:bg-muted"
          >
            <Bell className="size-5 stroke-[1.5]" />
            <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-primary ring-2 ring-background" />
          </Link>
          {/* Messages */}
          <Link
            href="/messages"
            aria-label="Messages"
            className="relative flex size-9 items-center justify-center rounded-full text-fg-2 transition-colors active:bg-muted"
          >
            <MessageCircle className="size-5 stroke-[1.5]" />
            <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground ring-2 ring-background">2</span>
          </Link>
          <Link href="/profile" aria-label="Mon profil">
            <DiscAvatar
              firstName={currentUser.firstName}
              lastName={currentUser.lastName}
              disc="I"
              size="sm"
            />
          </Link>
        </div>
      )}
    </header>
  )
}
