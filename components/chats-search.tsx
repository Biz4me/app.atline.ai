'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Search, Mic, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThreadRow } from '@/components/thread-row'
import { usePushToTalk } from '@/components/mobile/use-dictation'
import { ATLAS_COMMANDS, matchCommand, norm, type AtlasCommand } from '@/lib/atlas-commands'

// ═══ NAV MESSAGERIE T3 — Chercher = naviguer, et JAMAIS de cul-de-sac ═══
// Plein écran depuis la barre du haut : contacts, commandes, RDV, modules, supports,
// Récents, dictée 🎙 — et la dernière ligne est TOUJOURS « Demander à Atlas ».

type SearchThread = {
  contactId: string; name: string; initials: string; accent: string
  kind: string; stage: string | null; recruiting: boolean; lastContact: string | null
}
type Rdv = { id: string; title: string; startAt: string; done: boolean; contact?: { name: string } | null }
type Module = { id: string; title: string; status?: string }
type Support = { id: string; title: string; bucket: string }
type Recent = { emoji: string; label: string; href: string }

const TABS = ['Tous', 'Prospects', 'Clients', 'Partenaires', 'Commandes'] as const
type Tab = (typeof TABS)[number]
const RECENTS_KEY = 'chats-recents'
const STAGE_LABEL: Record<string, string> = {
  NOUVEAU: 'Nouveau', INVITATION: 'Invitation', PRESENTATION: 'Présentation', SUIVI: 'Suivi', CLOSING: 'Closing',
  DEMARRAGE: 'Démarrage', FORMATION: 'Formation', ACTIF: 'Actif', LEADER: 'Leader',
}

const segOk = (t: SearchThread, tab: Tab) =>
  tab === 'Tous' ? true
  : tab === 'Partenaires' ? t.kind === 'PARTENAIRE'
  : tab === 'Clients' ? t.kind === 'CLIENT'
  : tab === 'Prospects' ? t.kind === 'PROSPECT' || t.recruiting
  : false

function Label({ children, action, onAction }: { children: React.ReactNode; action?: string; onAction?: () => void }) {
  return (
    <p className="flex items-center justify-between px-4 pb-1 pt-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
      {children}
      {action && <button type="button" onClick={onAction} className="font-medium normal-case tracking-normal">{action}</button>}
    </p>
  )
}

export function ChatsSearch({ open, onClose, threads, onAddContact }: {
  open: boolean; onClose: () => void; threads: SearchThread[]; onAddContact: () => void
}) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<Tab>('Tous')
  const [recents, setRecents] = useState<Recent[]>([])
  const [rdvs, setRdvs] = useState<Rdv[]>([])
  const [modules, setModules] = useState<Module[]>([])
  const [supports, setSupports] = useState<Support[]>([])
  const loadedRef = useRef(false)
  const qRef = useRef(q)
  qRef.current = q

  // Dictée : notre micro pousse-pour-parler, comme au composeur.
  const { supported: micOk, recording, busy, start, stop } = usePushToTalk({ getBase: () => qRef.current, onText: setQ })

  useEffect(() => {
    if (!open) return
    setQ('')
    setTab('Tous')
    try { setRecents(JSON.parse(localStorage.getItem(RECENTS_KEY) ?? '[]')) } catch { setRecents([]) }
    if (loadedRef.current) return
    loadedRef.current = true
    // Sources annexes (RDV, formation, supports) : chargées une fois, tout se filtre ensuite en local.
    Promise.all([
      fetch('/api/appointments').then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch('/api/formation/modules').then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch('/api/activities/active').then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([ap, fm, act]) => {
      const now = Date.now()
      setRdvs((Array.isArray(ap) ? ap : []).filter((a: Rdv) => !a.done && new Date(a.startAt).getTime() >= now).slice(0, 60))
      setModules((fm?.modules ?? []).map((m: { id: string; title: string; status?: string }) => ({ id: m.id, title: m.title, status: m.status })))
      const b = act?.activity?.supports
      setSupports(b ? (['PRESENTER', 'FORMER', 'VENDRE'] as const).flatMap((k) =>
        (b[k] ?? []).map((s: { id: string; title: string }) => ({ id: s.id, title: s.title, bucket: k === 'PRESENTER' ? 'Présenter' : k === 'FORMER' ? 'Former' : 'Vendre' })),
      ) : [])
    })
  }, [open])

  if (!open) return null

  const Q = q.trim()
  const hit = (s: string) => norm(s).includes(norm(Q))
  const go = (href: string, recent?: Recent) => {
    if (recent) {
      const next = [recent, ...recents.filter((r) => r.href !== recent.href || r.label !== recent.label)].slice(0, 8)
      setRecents(next)
      try { localStorage.setItem(RECENTS_KEY, JSON.stringify(next)) } catch { /* plein/privé */ }
    }
    onClose()
    router.push(href)
  }
  const runCmd = (c: AtlasCommand) => {
    if (c.kind === 'local' && c.action === 'add-contact') { onClose(); onAddContact(); return }
    const href = c.kind === 'atlas' ? `/atlas?cmd=${c.param}`
      : c.kind === 'prefill' ? `/atlas?prefill=${encodeURIComponent(c.prefill ?? '')}`
      : (c.to ?? '/atlas')
    go(href, { emoji: c.emoji, label: c.label, href })
  }

  const contacts = Q ? threads.filter((t) => segOk(t, tab) && hit(t.name)).slice(0, 6) : []
  const cmds = (tab === 'Tous' || tab === 'Commandes') ? ATLAS_COMMANDS.filter((c) => (Q ? matchCommand(c, Q) : tab === 'Commandes')).slice(0, 6) : []
  const rdvHits = tab === 'Tous' && Q ? rdvs.filter((a) => hit(`${a.title} ${a.contact?.name ?? ''}`)).slice(0, 4) : []
  const modHits = tab === 'Tous' && Q ? modules.filter((m) => hit(m.title)).slice(0, 4) : []
  const supHits = tab === 'Tous' && Q ? supports.filter((s) => hit(`${s.title} ${s.bucket}`)).slice(0, 4) : []
  const noResult = Q && !contacts.length && !cmds.length && !rdvHits.length && !modHits.length && !supHits.length

  return (
    <div className="fixed inset-0 z-[60] mx-auto flex w-full max-w-2xl flex-col bg-background lg:mx-0 lg:w-[340px] lg:max-w-none lg:border-r lg:border-border">
      {/* Zone teintée Atlas (même orange pâle que la rangée d'accueil) : barre + filtres */}
      <div className="bg-primary/10">
      {/* ← + barre (dictée intégrée) */}
      <div className="flex items-center gap-2.5 px-4 py-2.5" style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top))' }}>
        <button type="button" aria-label="Retour" onClick={onClose} className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground active:bg-muted">
          <ChevronLeft className="size-5 stroke-[1.5]" />
        </button>
        <div className="flex flex-1 items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-2">
          <Search className="size-4 shrink-0 stroke-[1.5] text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher"
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          {micOk && (
            <button
              type="button"
              onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); start() }}
              onPointerUp={(e) => { e.currentTarget.releasePointerCapture(e.pointerId); stop() }}
              onPointerCancel={stop}
              onContextMenu={(e) => e.preventDefault()}
              disabled={busy}
              aria-label="Maintenir pour dicter"
              className={cn('shrink-0 select-none touch-none rounded-full p-1 transition-all', recording ? 'scale-110 bg-primary text-white' : busy ? 'text-primary' : 'text-muted-foreground')}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Mic className={cn('size-4 stroke-[1.5]', recording && 'animate-pulse')} />}
            </button>
          )}
        </div>
      </div>

      {/* Onglets — remplacent les 3 déroulants de l'ancienne liste */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar px-4 pb-2.5">
        {TABS.map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={cn('shrink-0 rounded-full px-3 py-1.5 text-xs font-medium', tab === t ? 'bg-primary font-semibold text-primary-foreground' : 'border border-border bg-background text-muted-foreground')}>
            {t}
          </button>
        ))}
      </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-10">
        {/* Résultats */}
        {contacts.length > 0 && <Label>Contacts</Label>}
        {contacts.map((t) => (
          <ThreadRow
            key={t.contactId}
            avatarBg={t.accent}
            avatarText={t.initials}
            title={t.name}
            line={t.recruiting ? 'Client · en recrutement' : t.kind === 'PARTENAIRE' ? 'Partenaire' : t.stage ? STAGE_LABEL[t.stage] ?? t.stage : 'Contact'}
            endPill={{ label: 'fil', cls: 'bg-primary/10 text-primary' }}
            onClick={() => go(`/chats/${t.contactId}`, { emoji: '👤', label: t.name, href: `/chats/${t.contactId}` })}
          />
        ))}
        {cmds.length > 0 && <Label>Commandes</Label>}
        {cmds.map((c) => (
          <ThreadRow
            key={c.cmd}
            avatarBg="var(--muted)"
            avatarText={c.emoji}
            title={c.label}
            line={`${c.cmd} — ${c.desc}`}
            endPill={c.feuille ? { label: 'feuille', cls: 'bg-muted text-muted-foreground' } : c.kind === 'atlas' ? { label: 'Atlas', cls: 'bg-primary/10 text-primary' } : undefined}
            onClick={() => runCmd(c)}
          />
        ))}
        {rdvHits.length > 0 && <Label>Rendez-vous</Label>}
        {rdvHits.map((a) => (
          <ThreadRow
            key={a.id}
            avatarBg="var(--muted)"
            avatarText="📅"
            title={a.title}
            line={`${new Date(a.startAt).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}${a.contact?.name ? ` · avec ${a.contact.name}` : ''}`}
            endPill={{ label: 'feuille', cls: 'bg-muted text-muted-foreground' }}
            onClick={() => go('/agenda', { emoji: '📅', label: a.title, href: '/agenda' })}
          />
        ))}
        {modHits.length > 0 && <Label>Formation</Label>}
        {modHits.map((m) => (
          <ThreadRow
            key={m.id}
            avatarBg="var(--muted)"
            avatarText="🎓"
            title={m.title}
            line={m.status === 'DONE' ? 'Module terminé ✓' : 'Module de formation'}
            endPill={{ label: 'feuille', cls: 'bg-muted text-muted-foreground' }}
            onClick={() => go(`/formation/${m.id}`, { emoji: '🎓', label: m.title, href: `/formation/${m.id}` })}
          />
        ))}
        {supHits.length > 0 && <Label>Supports</Label>}
        {supHits.map((s) => (
          <ThreadRow
            key={s.id}
            avatarBg="var(--muted)"
            avatarText="📎"
            title={s.title}
            line={`Bibliothèque · ${s.bucket}`}
            endPill={{ label: 'feuille', cls: 'bg-muted text-muted-foreground' }}
            onClick={() => go('/activities', { emoji: '📎', label: s.title, href: '/activities' })}
          />
        ))}

        {/* JAMAIS de cul-de-sac : tout texte peut devenir une question à Atlas */}
        {Q && (
          <button
            type="button"
            onClick={() => go(`/atlas?ask=${encodeURIComponent(Q)}`)}
            className="mx-4 mt-3 flex w-[calc(100%-2rem)] items-center gap-3 rounded-2xl border border-primary/35 bg-primary/[.07] px-4 py-3 text-left active:bg-primary/15"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/15 text-lg">💬</span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-primary">Demander à Atlas</span>
              <span className="block truncate text-xs text-muted-foreground">« {Q} »{noResult ? ' — aucun résultat, mais Atlas répond à tout' : ''}</span>
            </span>
          </button>
        )}

        {/* Vide : Récents (ou un coup de pouce) */}
        {!Q && tab !== 'Commandes' && recents.length > 0 && (
          <>
            <Label action="effacer" onAction={() => { setRecents([]); try { localStorage.removeItem(RECENTS_KEY) } catch { /* ignore */ } }}>Récents</Label>
            {recents.map((r, i) => (
              <ThreadRow key={`${r.href}-${i}`} avatarBg="var(--muted)" avatarText={r.emoji} title={r.label} line={r.href} onClick={() => go(r.href)} />
            ))}
          </>
        )}
        {!Q && tab !== 'Commandes' && recents.length === 0 && (
          <p className="px-4 py-6 text-sm text-muted-foreground">Cherche un contact, une commande (« plan », « agenda »…), un RDV, un module — ou dicte ta question 🎙.</p>
        )}
      </div>
    </div>
  )
}
