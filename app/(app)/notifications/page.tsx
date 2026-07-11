'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppHeader } from '@/components/app-header'
import { Card } from '@/components/card'
import { DiscAvatar } from '@/components/disc-avatar'
import { Bell, Sparkles, TrendingUp, Mic, CheckCircle2, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Notif = {
  id: string
  title: string
  body: string
  time: string
  read: boolean
  go?: string
  avatar?: { first: string; last: string; disc: 'D' | 'I' | 'S' | 'C' | null }
  icon?: LucideIcon
  iconColor?: string
}

// Notifications réelles (table Notification). `icon` en base est une clé sémantique.
type DbNotif = { id: string; icon: string; color: string; text: string; go: string; unread: boolean; createdAt: string }

const ICON_META: Record<string, { title: string; icon: LucideIcon; color: string }> = {
  atlas: { title: 'Atlas', icon: Sparkles, color: 'bg-primary/10 text-primary' },
  aria: { title: 'Aria', icon: Mic, color: 'bg-teal-500/10 text-teal-600' },
  nova: { title: 'Nova', icon: TrendingUp, color: 'bg-violet-500/10 text-violet-600' },
}

function frTime(iso: string): string {
  const d = new Date(iso)
  const mins = Math.round((Date.now() - d.getTime()) / 60000)
  if (mins < 60) return `Il y a ${Math.max(mins, 1)} min`
  if (mins < 24 * 60) return `Il y a ${Math.round(mins / 60)} h`
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(d)
}

function fromDb(n: DbNotif): Notif {
  const meta = ICON_META[n.icon] ?? { title: 'Notification', icon: Bell, color: 'bg-muted text-muted-foreground' }
  return {
    id: n.id,
    title: meta.title,
    body: n.text,
    time: frTime(n.createdAt),
    read: !n.unread,
    go: n.go || undefined,
    icon: meta.icon,
    iconColor: meta.color,
  }
}


function NotifList() {
  const router = useRouter()
  const [items, setItems] = useState<Notif[]>([])
  const [showAll, setShowAll] = useState(false)
  const unread = items.filter((n) => !n.read)
  const list = showAll ? items : unread

  useEffect(() => {
    fetch('/api/notifications')
      .then((r) => (r.ok ? r.json() : { notifications: [] }))
      .then((d) => setItems(((d.notifications ?? []) as DbNotif[]).map(fromDb)))
      .catch(() => {})
  }, [])

  const markAll = () => {
    setItems((xs) => xs.map((n) => ({ ...n, read: true })))
    fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ all: true }) }).catch(() => {})
  }
  const markOne = (n: Notif) => {
    setItems((xs) => xs.map((x) => (x.id === n.id ? { ...x, read: true } : x)))
    fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: n.id }) }).catch(() => {})
    if (n.go) router.push(n.go)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-lg font-semibold lg:text-sm text-foreground">
          {showAll ? `${items.length} notification${items.length > 1 ? 's' : ''}` : `${unread.length} non lue${unread.length > 1 ? 's' : ''}`}
        </p>
        <div className="flex items-center gap-3">
          {unread.length > 0 && <button type="button" onClick={markAll} className="text-lg font-semibold lg:text-sm text-primary">Tout marquer comme lu</button>}
          <button type="button" onClick={() => setShowAll((v) => !v)} className="text-lg font-semibold lg:text-sm text-muted-foreground">{showAll ? 'Non lues' : 'Historique'}</button>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-10 text-center">
          <CheckCircle2 className="size-8 text-success" />
          <p className="text-lg text-muted-foreground">Tu es à jour — aucune notification non lue.</p>
        </div>
      ) : (
      <Card className="divide-y divide-border p-0">
        {list.map((notif) => (
          <button
            key={notif.id}
            type="button"
            onClick={() => markOne(notif)}
            className={cn(
              'flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors active:bg-muted',
              !notif.read && 'bg-primary/[0.03]'
            )}
          >
            {notif.avatar ? (
              <div className="relative shrink-0">
                <DiscAvatar firstName={notif.avatar.first} lastName={notif.avatar.last} disc={notif.avatar.disc} size="sm" />
                {notif.icon && (
                  <span className={cn('absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full ring-2 ring-background', notif.iconColor ?? 'bg-muted text-muted-foreground')}>
                    <notif.icon className="size-3 stroke-2" />
                  </span>
                )}
              </div>
            ) : (
              <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl', notif.iconColor ?? 'bg-muted text-muted-foreground')}>
                {notif.icon && <notif.icon className="size-5 stroke-[1.5]" />}
              </span>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className={cn('text-lg', !notif.read ? 'font-bold text-foreground' : 'font-semibold text-foreground')}>
                  {notif.title}
                </p>
                {!notif.read && (
                  <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
                )}
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground lg:text-xs text-pretty line-clamp-2">{notif.body}</p>
              <p className="mt-1 text-xs text-muted-foreground">{notif.time}</p>
            </div>
          </button>
        ))}
      </Card>
      )}
    </div>
  )
}

export default function NotificationsPage() { return <NotificationsView /> }

export function NotificationsView({ embedded = false, onClose }: { embedded?: boolean; onClose?: () => void }) {
  // Mode panneau (overlay topbar) — pas de header : la topbar reste visible au-dessus
  if (embedded) {
    return <div className="px-4 pt-4 pb-6"><NotifList /></div>
  }

  return (
    <>
      {/* ── MOBILE ONLY ── */}
      <div className="lg:hidden">
        <AppHeader title="Notifications" back showActions={false} />
        <div className="px-4 pt-4 pb-8">
          <NotifList />
        </div>
      </div>

      {/* ── DESKTOP ONLY ── */}
      <div className="hidden lg:block">
        <div className="px-8 pt-8 pb-8 max-w-2xl mx-auto">
          <NotifList />
        </div>
      </div>
    </>
  )
}
