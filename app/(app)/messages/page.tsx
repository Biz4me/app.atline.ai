'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, MessageSquare, MessageCircle, Mail, PhoneCall, Bell,
  CalendarPlus, StickyNote, Share2, Mic, Sparkles, Search, SquarePen, Send, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// Messages = le FIL PAR CONTACT, branché sur le réel : les interactions déjà loggées
// (SMS, WhatsApp, appel, email, note…). Écrire ici = ouvrir le canal pré-rempli
// (sms:/wa.me/mailto) ET logger l'échange — exactement ce que fait la fiche contact.
// Le jour où Gmail/WhatsApp API arrivent, ils se brancheront dans ces mêmes fils.

type Conv = {
  contactId: string; name: string; initials: string; accent: string
  phone: string | null; email: string | null
  lastType: string; lastBody: string | null; lastOutcome: string | null; lastAt: string
}
type Interaction = { id: string; type: string; direction: string; outcome: string | null; body: string | null; createdAt: string }
type PickContact = { id: string; name: string; initials: string; accent: string; phone: string; email: string }

const TYPE_META: Record<string, { icon: typeof MessageSquare; label: string; color: string }> = {
  SMS: { icon: MessageSquare, label: 'SMS', color: '#3B82F6' },
  WHATSAPP: { icon: MessageCircle, label: 'WhatsApp', color: '#25D366' },
  EMAIL: { icon: Mail, label: 'Email', color: '#8B5CF6' },
  APPEL: { icon: PhoneCall, label: 'Appel', color: '#F97316' },
  DM: { icon: MessageSquare, label: 'DM', color: '#3B82F6' },
  VOCAL: { icon: Mic, label: 'Message vocal', color: '#F97316' },
  RDV: { icon: CalendarPlus, label: 'RDV', color: '#F97316' },
  RELANCE: { icon: Bell, label: 'Relance', color: '#F97316' },
  PARTAGE: { icon: Share2, label: 'Partage', color: '#F97316' },
  NOTE: { icon: StickyNote, label: 'Note', color: '#F97316' },
  AUTRE: { icon: Sparkles, label: 'Échange', color: '#F97316' },
}
const meta = (t: string) => TYPE_META[t] ?? TYPE_META.AUTRE

const relTime = (iso: string) => {
  const d = new Date(iso)
  const days = Math.floor((Date.now() - d.getTime()) / 86400000)
  if (days === 0) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  if (days === 1) return 'Hier'
  if (days < 7) return `Il y a ${days} j`
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

type ActiveContact = { id: string; name: string; initials: string; accent: string; phone: string | null; email: string | null }

export default function MessagesPage() {
  const router = useRouter()
  const [convs, setConvs] = useState<Conv[] | null>(null)
  const [active, setActive] = useState<ActiveContact | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  const load = () => {
    fetch('/api/messages').then((r) => (r.ok ? r.json() : null)).then((d) => setConvs(d?.conversations ?? [])).catch(() => setConvs([]))
  }
  useEffect(load, [])

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* ── Liste des fils ── */}
      <div className={cn('flex flex-col bg-background border-r border-border w-full lg:w-72 xl:w-80 shrink-0', active ? 'hidden lg:flex' : 'flex')}>
        <header className="sticky top-0 z-30 hidden lg:flex items-center gap-3 bg-background/90 px-4 py-3 backdrop-blur">
          <h1 className="flex-1 font-display text-lg font-bold text-foreground">Échanges</h1>
        </header>

        {/* Nouveau message — depuis tes contacts */}
        <div className="px-4 pt-2">
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex w-full items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-left text-lg font-semibold text-foreground active:bg-muted lg:text-sm"
          >
            <SquarePen className="size-4 text-primary" />
            Nouveau message
          </button>
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto pb-8 pt-2">
          {convs === null && <p className="px-4 py-6 text-sm text-muted-foreground lg:text-xs">Chargement…</p>}
          {convs?.length === 0 && (
            <p className="px-4 py-6 text-sm leading-relaxed text-muted-foreground lg:text-xs">
              Tes échanges avec tes contacts apparaîtront ici, tous canaux confondus (SMS, WhatsApp, appels, emails). Lance-toi avec « Nouveau message ».
            </p>
          )}
          {convs?.map((c) => {
            const m = meta(c.lastType)
            const Icon = m.icon
            return (
              <button
                key={c.contactId}
                type="button"
                onClick={() => setActive({ id: c.contactId, name: c.name, initials: c.initials, accent: c.accent, phone: c.phone, email: c.email })}
                className={cn('flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/60 active:bg-muted', active?.id === c.contactId && 'lg:bg-muted')}
              >
                <div className="relative shrink-0">
                  <span className="grid size-11 place-items-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: c.accent }}>{c.initials}</span>
                  <span className="absolute -bottom-0.5 -right-0.5 grid size-5 place-items-center rounded-full border-2 border-background bg-background">
                    <Icon className="size-2.5" style={{ color: m.color }} strokeWidth={2.5} />
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-lg font-semibold text-foreground lg:text-sm">{c.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{relTime(c.lastAt)}</span>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground lg:text-xs">
                    {m.label}{c.lastBody ? ` · ${c.lastBody}` : c.lastOutcome ? ` · ${c.lastOutcome.toLowerCase()}` : ''}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Fil du contact ── */}
      {active ? (
        <Thread key={active.id} contact={active} onBack={() => { setActive(null); load() }} onOpenFiche={() => router.push(`/contacts/${active.id}`)} />
      ) : (
        <div className="hidden lg:flex flex-1 items-center justify-center text-muted-foreground">
          <div className="text-center">
            <MessageSquare className="mx-auto mb-3 size-12 opacity-20" />
            <p className="text-sm">Sélectionne un échange</p>
          </div>
        </div>
      )}

      {pickerOpen && <ContactPicker onClose={() => setPickerOpen(false)} onPick={(c) => { setPickerOpen(false); setActive({ id: c.id, name: c.name, initials: c.initials, accent: c.accent, phone: c.phone || null, email: c.email || null }) }} />}
    </div>
  )
}

/* ── Le fil d'un contact : historique réel + composer qui ouvre le canal ET logge ── */
function Thread({ contact, onBack, onOpenFiche }: { contact: ActiveContact; onBack: () => void; onOpenFiche: () => void }) {
  const [items, setItems] = useState<Interaction[] | null>(null)
  const [draft, setDraft] = useState('')
  const channels = useMemo(() => [
    ...(contact.phone ? [{ type: 'WHATSAPP', label: 'WhatsApp' }, { type: 'SMS', label: 'SMS' }] : []),
    ...(contact.email ? [{ type: 'EMAIL', label: 'Email' }] : []),
  ], [contact.phone, contact.email])
  const [channel, setChannel] = useState(channels[0]?.type ?? 'NOTE')

  useEffect(() => {
    fetch(`/api/contacts/${contact.id}/interactions`).then((r) => (r.ok ? r.json() : [])).then((rows: Interaction[]) => setItems([...rows].reverse())).catch(() => setItems([]))
  }, [contact.id])

  const send = async () => {
    const text = draft.trim()
    if (!text) return
    // Ouvre le canal choisi, pré-rempli (le message part depuis TON téléphone/boîte, comme sur la fiche)
    if (channel === 'WHATSAPP' && contact.phone) window.open(`https://wa.me/${contact.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`, '_blank')
    else if (channel === 'SMS' && contact.phone) window.location.href = `sms:${contact.phone}?&body=${encodeURIComponent(text)}`
    else if (channel === 'EMAIL' && contact.email) window.location.href = `mailto:${contact.email}?body=${encodeURIComponent(text)}`
    setDraft('')
    try {
      const r = await fetch(`/api/contacts/${contact.id}/interactions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: channel, body: text, direction: 'OUT' }),
      })
      if (r.ok) {
        setItems((prev) => [...(prev ?? []), { id: `tmp-${Date.now()}`, type: channel, direction: 'OUT', outcome: null, body: text, createdAt: new Date().toISOString() }])
        toast.success('Échange enregistré')
      }
    } catch { toast.error("L'échange n'a pas pu être enregistré") }
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
        <button type="button" onClick={onBack} className="lg:hidden flex size-9 items-center justify-center rounded-full text-muted-foreground active:bg-muted">
          <ChevronLeft className="size-5 stroke-[1.5]" />
        </button>
        <span className="grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: contact.accent }}>{contact.initials}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold text-foreground lg:text-sm">{contact.name}</p>
          <button type="button" onClick={onOpenFiche} className="text-xs font-medium text-primary">Voir la fiche</button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-5 lg:px-6">
        {items?.length === 0 && (
          <p className="mt-10 text-center text-sm leading-relaxed text-muted-foreground lg:text-xs">
            Premier échange avec {contact.name.split(' ')[0]} : écris ton message ci-dessous, choisis le canal, et il restera dans son fil.
          </p>
        )}
        {items?.map((it) => {
          const m = meta(it.type)
          const Icon = m.icon
          const out = it.direction !== 'IN'
          return (
            <div key={it.id} className={cn('flex flex-col', out ? 'items-end' : 'items-start')}>
              <div className={cn(
                'max-w-[80%] rounded-2xl px-4 py-2.5 text-lg leading-[1.5] lg:text-sm',
                out ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md bg-muted text-foreground',
              )}>
                {it.body ? it.body : (
                  <span className="flex items-center gap-1.5"><Icon className="size-4" />{m.label}{it.outcome ? ` · ${it.outcome.toLowerCase()}` : ''}</span>
                )}
              </div>
              <span className="mt-1 text-[10px] text-muted-foreground">{m.label} · {relTime(it.createdAt)}</span>
            </div>
          )
        })}
      </div>

      <div className="shrink-0 border-t border-border px-4 py-3 lg:px-6" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        {channels.length > 0 ? (
          <>
            <div className="mb-2 flex gap-1.5">
              {channels.map((ch) => (
                <button
                  key={ch.type}
                  type="button"
                  onClick={() => setChannel(ch.type)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                    channel === ch.type ? 'bg-primary/15 text-primary border border-primary/30' : 'border border-border text-muted-foreground',
                  )}
                >
                  {ch.label}
                </button>
              ))}
            </div>
            <div className="flex items-end gap-2 rounded-2xl border border-border bg-surface px-4 py-2">
              <textarea
                rows={1}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder={`Écrire à ${contact.name.split(' ')[0]}…`}
                className="flex-1 resize-none bg-transparent text-lg leading-[1.4] text-foreground outline-none placeholder:text-muted-foreground lg:text-sm"
                style={{ maxHeight: 120, paddingTop: 7, paddingBottom: 7 }}
              />
              <button
                type="button"
                onClick={send}
                disabled={!draft.trim()}
                className="mb-[5px] flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                <Send className="size-[17px] stroke-[1.5]" />
              </button>
            </div>
          </>
        ) : (
          <p className="py-2 text-center text-sm text-muted-foreground lg:text-xs">
            Ajoute un téléphone ou un email sur sa fiche pour lui écrire d&apos;ici.
          </p>
        )}
      </div>
    </div>
  )
}

/* ── Choisir un contact pour un nouveau message ── */
function ContactPicker({ onClose, onPick }: { onClose: () => void; onPick: (c: PickContact) => void }) {
  const [all, setAll] = useState<PickContact[]>([])
  const [q, setQ] = useState('')
  useEffect(() => {
    fetch('/api/contacts').then((r) => (r.ok ? r.json() : [])).then((rows) => setAll(Array.isArray(rows) ? rows : [])).catch(() => {})
  }, [])
  const filtered = q ? all.filter((c) => c.name.toLowerCase().includes(q.toLowerCase())) : all

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[80dvh] max-w-[640px] flex-col rounded-t-3xl border border-b-0 border-border bg-background pb-[max(16px,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between px-4 pb-1 pt-4">
          <p className="text-lg font-semibold text-foreground lg:text-sm">Nouveau message</p>
          <button type="button" onClick={onClose} aria-label="Fermer" className="grid size-8 place-items-center rounded-full text-muted-foreground active:bg-muted"><X className="size-4" /></button>
        </div>
        <div className="px-4 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground stroke-[1.5]" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher un contact…"
              autoFocus
              className="w-full rounded-xl border border-border bg-muted py-2.5 pl-9 pr-4 text-lg outline-none placeholder:text-muted-foreground lg:text-sm"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {filtered.map((c) => (
            <button key={c.id} type="button" onClick={() => onPick(c)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left active:bg-muted">
              <span className="grid size-9 shrink-0 place-items-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: c.accent || '#F97316' }}>{c.initials}</span>
              <span className="min-w-0 flex-1 truncate text-lg font-medium text-foreground lg:text-sm">{c.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
