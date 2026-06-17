'use client'

import { useRouter } from 'next/navigation'
import { Bell, ChevronLeft, SquarePen } from 'lucide-react'
import { DiscAvatar } from '@/components/disc-avatar'
import { currentUser } from '@/lib/data'
import Link from 'next/link'

interface AppHeaderProps {
  title: string
  back?: boolean
  showActions?: boolean
  showNova?: boolean
}

export function AppHeader({
  title,
  back = false,
  showActions = true,
  showNova = false,
}: AppHeaderProps) {
  const router = useRouter()
  return (
    <header
      className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur"
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
      <h1 className="flex-1 truncate font-display text-2xl font-semibold text-foreground">
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
          <button
            type="button"
            aria-label="Notifications"
            className="relative flex size-9 items-center justify-center rounded-full text-fg-2 transition-colors active:bg-muted"
          >
            <Bell className="size-5 stroke-[1.5]" />
            <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-primary ring-2 ring-background" />
          </button>
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
