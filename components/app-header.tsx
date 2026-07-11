'use client'

import { useRouter } from 'next/navigation'
import { Bell, ChevronLeft, SquarePen, Calendar, MessageCircle } from 'lucide-react'
import { DiscAvatar } from '@/components/disc-avatar'
import { currentUser } from '@/lib/data'
import Link from 'next/link'

interface AppHeaderProps {
  title: string
  back?: boolean
  secondary?: boolean
  showActions?: boolean
  showNova?: boolean
}

export function AppHeader({
  title,
  back = false,
  secondary = false,
  showActions = true,
  showNova = false,
}: AppHeaderProps) {
  const router = useRouter()
  return (
    <header
      className="sticky top-0 z-30 flex items-center gap-3 bg-background/90 px-4 py-3 backdrop-blur lg:hidden"
      style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
    >
      {back ? (
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Retour"
          className="-ml-1 flex size-9 shrink-0 items-center justify-center rounded-full text-fg-2 transition-colors active:bg-muted"
        >
          <ChevronLeft className="size-5 stroke-[1.5]" />
        </button>
      ) : (
        <div className="-ml-1 size-9 shrink-0" />
      )}
      {/* Un seul gabarit de titre (Title 18), CENTRÉ — les cales de chaque côté garantissent le centrage */}
      <h1 className="flex-1 truncate text-center text-lg font-semibold text-foreground">
        {title}
      </h1>
      {!showActions && <div className="-mr-1 size-9 shrink-0" />}
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
          </Link>
          {/* Messages */}
          <Link
            href="/messages"
            aria-label="Messages"
            className="relative flex size-9 items-center justify-center rounded-full text-fg-2 transition-colors active:bg-muted"
          >
            <MessageCircle className="size-5 stroke-[1.5]" />
          </Link>
          <Link href="/profile/edit" aria-label="Mon profil">
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
