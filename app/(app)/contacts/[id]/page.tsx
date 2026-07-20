'use client'

import { use, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Pencil, Mail, Tag,
  MessageSquare, PhoneCall, CalendarPlus, Mic, Sparkles, ArrowRight, X, Plus, ChevronLeft,
  MessageCircle, Bell, Share2, StickyNote, Check, ChevronDown, Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Card } from '@/components/card'
import { WhenPicker } from '@/components/when-picker'
import { SelectMenu } from '@/components/select-menu'
import { PersonalityQuiz, describePersonality } from '@/components/personality-quiz'

/* ── Référentiels ─────────────────────────────────────────────── */
const PERSO: Record<string, { label: string; hex: string; desc: string; approach: string }> = {
  ROUGE: { label: 'Rouge', hex: '#EF4444', desc: 'Fonceur — résultats, direct, décide vite.', approach: 'Va droit au but, parle chiffres et défi. Évite les détails.' },
  VERT:  { label: 'Vert',  hex: '#22C55E', desc: 'Analytique — veut des preuves, des faits.', approach: 'Apporte des faits, des preuves, laisse-lui le temps. Zéro hype.' },
  BLEU:  { label: 'Bleu',  hex: '#3B82F6', desc: 'Social — fun, gens, nouveauté.', approach: "Mise sur l'énergie, l'aventure, les gens. Évite les chiffres." },
  JAUNE: { label: 'Jaune', hex: '#F4B342', desc: 'Relationnel — aider, harmonie, zéro pression.', approach: "Chaleur, écoute, montre comment ça aide les gens. Aucune pression." },
}
const PROSPECT_STAGES = [
  { id: 'NOUVEAU', label: 'Nouveau' },
  { id: 'INVITATION', label: 'Invitation' },
  { id: 'PRESENTATION', label: 'Présentation' },
  { id: 'SUIVI', label: 'Suivi' },
  { id: 'CLOSING', label: 'Closing' },
]
const PARTNER_STAGES = [
  { id: 'DEMARRAGE', label: 'Démarrage' },
  { id: 'FORMATION', label: 'Formation' },
  { id: 'ACTIF', label: 'Actif' },
  { id: 'LEADER', label: 'Leader' },
]
const KIND_LABEL: Record<string, string> = { PROSPECT: 'Prospect', CLIENT: 'Client', PARTENAIRE: 'Partenaire' }
const CHANNEL_LABEL: Record<string, string> = { SMS: 'SMS', WHATSAPP: 'WhatsApp', EMAIL: 'Email' }

const INTERACTION_META: Record<string, { icon: typeof PhoneCall; label: string }> = {
  APPEL: { icon: PhoneCall, label: 'Appel' },
  SMS: { icon: MessageSquare, label: 'SMS' },
  EMAIL: { icon: Mail, label: 'Email' },
  WHATSAPP: { icon: MessageCircle, label: 'WhatsApp' },
  DM: { icon: MessageSquare, label: 'DM' },
  VOCAL: { icon: Mic, label: 'Message vocal' },
  RDV: { icon: CalendarPlus, label: 'RDV' },
  RELANCE: { icon: Bell, label: 'Relance' },
  PARTAGE: { icon: Share2, label: 'Partage' },
  NOTE: { icon: StickyNote, label: 'Note' },
  AUTRE: { icon: Sparkles, label: 'Action' },
}

/* PersoEval remplacé par le composant PersonalityQuiz (mode 3 questions) — visuel unique avec le profil */

/* ── Types ────────────────────────────────────────────────────── */
type Contact = {
  id: string; name: string; firstName: string; lastName: string; gender: string; profession: string; education: string; birthDate: string; initials: string; accent: string
  kind: string; email: string; phone: string; phone2: string; address: string; address2: string; postal: string; city: string; country: string
  source: string; personality: string | null; market: string | null; qualification: Record<string, string>; prospectStage: string | null; partnerStage: string | null
  score: number; exposures: number; lastContact: string | null; signedAt: string | null; note: string; tags: string[]; convertedUserId: string | null
  atlasMemory: string
}
type Interaction = { id: string; type: string; direction: string; outcome: string | null; body: string | null; isExposure: boolean; createdAt: string }
type Appt = { id: string; title: string; startAt: string; type: string; done: boolean }
type Relance = { id: string; channel: string; dueAt: string; message: string | null; status: string }

/* ── Niveaux d'études + harmonisation du genre (M/F/N) ─────────── */
const EDUCATIONS = ['Primaire et secondaire', 'Supérieur court (Bac+2/3)', 'Supérieur long (Bac+5 et +)']
const normGender = (g: string) => (g === 'HOMME' || g === 'Homme' ? 'M' : g === 'FEMME' || g === 'Femme' ? 'F' : g === 'AUTRE' || g === 'Autre' || g === 'Neutre' ? 'N' : g)

/* ── Conventions partagées avec le profil (masque tel, pays, date de naissance) ─── */
const PAYS = ['France', 'Espagne', 'Allemagne', 'Italie']
const fieldCls = 'w-full rounded-xl border border-border bg-background px-4 py-[7px] text-lg text-foreground outline-none placeholder:text-muted-foreground'
const formatPhone = (raw: string) => raw.replace(/\D/g, '').slice(0, 10).replace(/(\d{2})(?=\d)/g, '$1 ').trim()
const daysInMonth = (m: string, y: string) => { const mm = parseInt(m, 10); if (!mm) return 31; return new Date(parseInt(y, 10) || 2000, mm, 0).getDate() }
const DOB_MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'].map((l, i) => ({ value: String(i + 1).padStart(2, '0'), label: l }))
const DOB_YEARS = Array.from({ length: new Date().getFullYear() - 16 - 1929 }, (_, i) => { const y = String(new Date().getFullYear() - 16 - i); return { value: y, label: y } })

/* EditSheet retiré — l'édition se fait en ligne dans la charte ; la suppression est en bas de fiche */

/* ── Carte famille ────────────────────────────────────────────── */
function Section({ title, action, children, count, collapsible, defaultOpen = false, open: openProp, onToggle }: { title: string; action?: React.ReactNode; children: React.ReactNode; count?: number; collapsible?: boolean; defaultOpen?: boolean; open?: boolean; onToggle?: () => void }) {
  const [openState, setOpenState] = useState(defaultOpen)
  const controlled = onToggle !== undefined // piloté par le parent (accordéon) vs état interne
  const open = controlled ? !!openProp : openState
  const toggle = controlled ? onToggle! : () => setOpenState((o) => !o)
  const shown = !collapsible || open
  const label = <>{title}{count ? ` (${count})` : ''}</>
  return (
    <Card className="overflow-hidden">
      <div className={cn('flex items-center gap-2 px-5 py-3', shown && 'border-b border-border')}>
        {collapsible ? (
          <button type="button" onClick={toggle} className="min-w-0 flex-1 text-left text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</button>
        ) : (
          <p className="min-w-0 flex-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
        )}
        {action}
        {collapsible && (
          <button type="button" onClick={toggle} aria-label={open ? 'Réduire' : 'Déplier'} className="shrink-0 text-muted-foreground active:text-foreground">
            <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} />
          </button>
        )}
      </div>
      {shown && <div className="px-5 py-4">{children}</div>}
    </Card>
  )
}

/* ── Curseur d'étape du flow (Nouveau → Closing · ou Démarrage → Leader) ── */
function StageCursor({ stages, current, onPick }: { stages: { id: string; label: string }[]; current: string | null; onPick: (id: string) => void }) {
  const idx = Math.max(0, stages.findIndex((s) => s.id === current))
  return (
    <div className="rounded-2xl border border-border bg-surface px-2 py-3">
      <div className="flex items-start">
        {stages.map((s, i) => {
          const done = i < idx
          const cur = i === idx
          return (
            <div key={s.id} className="flex flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                <div className={cn('h-0.5 flex-1', i === 0 ? 'opacity-0' : done || cur ? 'bg-primary' : 'bg-border')} />
                <button type="button" onClick={() => onPick(s.id)}
                  className={cn('grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-bold transition-colors',
                    cur ? 'bg-primary text-primary-foreground ring-4 ring-primary/15' : done ? 'bg-primary text-primary-foreground' : 'border border-border bg-background text-muted-foreground')}>
                  {done ? <Check className="size-3" /> : i + 1}
                </button>
                <div className={cn('h-0.5 flex-1', i === stages.length - 1 ? 'opacity-0' : done ? 'bg-primary' : 'bg-border')} />
              </div>
              <button type="button" onClick={() => onPick(s.id)} className={cn('mt-1.5 px-0.5 text-center text-xs leading-tight', cur ? 'font-bold text-foreground' : 'text-muted-foreground')}>{s.label}</button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Planifier (RDV / relance) ────────────────────────────────── */
function ScheduleSheet({ mode, contactId, onClose, onDone }: { mode: 'rdv' | 'relance'; contactId: string; onClose: () => void; onDone: () => void }) {
  const [when, setWhen] = useState(() => { const d = new Date(); const p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T09:00` })
  const [title, setTitle] = useState('')
  const [type, setType] = useState('AUTRE')
  const [message, setMessage] = useState('')
  const [channel, setChannel] = useState('email')
  const input = 'w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground'
  const label = 'mb-1.5 block text-xs font-bold uppercase tracking-widest text-muted-foreground'

  async function submit() {
    if (!when) { toast.error('Choisis une date'); return }
    const res = mode === 'rdv'
      ? await fetch('/api/appointments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contactId, title: title.trim() || 'Rendez-vous', startAt: new Date(when).toISOString(), type }) })
      : await fetch('/api/relances', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contactId, dueAt: new Date(when).toISOString(), channel, message: message.trim() || null }) })
    if (res.ok) { toast.success(mode === 'rdv' ? 'RDV planifié' : 'Relance programmée'); onDone(); onClose() }
    else toast.error('Échec')
  }

  return (
    <div className="fixed inset-0 z-[80] flex flex-col">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="max-h-[92dvh] overflow-y-auto rounded-t-3xl bg-background pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto mb-3 mt-3 h-1 w-10 rounded-full bg-border" />
        <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-background px-4 pb-3">
          <button type="button" onClick={onClose} className="text-sm font-medium text-muted-foreground">Annuler</button>
          <h2 className="flex-1 text-center text-sm font-bold text-foreground">{mode === 'rdv' ? 'Planifier un RDV' : 'Programmer une relance'}</h2>
          <button type="button" onClick={submit} className="rounded-xl bg-primary px-4 py-1.5 text-sm font-bold text-primary-foreground">OK</button>
        </div>
        <div className="flex flex-col gap-4 px-4 py-5">
          {mode === 'rdv' ? (
            <>
              <div><label className={label}>Objet</label><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Présentation, suivi…" className={input} /></div>
              <div><label className={label}>Type</label>
                <select value={type} onChange={(e) => setType(e.target.value)} className={input}>
                  {['CALL', 'VISIO', 'PRESENTIEL', 'WEBINAIRE', 'AUTRE'].map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </>
          ) : (
            <>
              <div><label className={label}>Canal</label>
                <select value={channel} onChange={(e) => setChannel(e.target.value)} className={input}>
                  <option value="email">Email</option><option value="sms">SMS</option><option value="whatsapp">WhatsApp</option>
                </select>
              </div>
              <div><label className={label}>Message (optionnel)</label><textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="Atlas pourra le rédiger plus tard…" className={cn(input, 'resize-none')} /></div>
            </>
          )}
          <div><label className={label}>{mode === 'rdv' ? 'Date et heure' : 'Relancer le'}</label><WhenPicker value={when} onChange={setWhen} /></div>
        </div>
      </div>
    </div>
  )
}

/* ── Composer un message (Atlas rédacteur) ────────────────────── */
function ComposeSheet({ contactId, channel, label, phone, email, autoDraft, onClose, onSent }: { contactId: string; channel: string; label: string; phone: string; email: string; autoDraft?: boolean; onClose: () => void; onSent: (msg: string) => void }) {
  const [msg, setMsg] = useState('')
  const [drafting, setDrafting] = useState(false)

  const draft = useCallback(async () => {
    setDrafting(true)
    try {
      const res = await fetch(`/api/contacts/${contactId}/draft`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channel }) })
      if (res.ok) { const d = await res.json(); setMsg(d.message ?? '') }
      else toast.error('Atlas indisponible pour le moment')
    } catch { toast.error('Atlas indisponible') } finally { setDrafting(false) }
  }, [contactId, channel])

  useEffect(() => { if (autoDraft) draft() }, [autoDraft, draft])

  function send() {
    if (!msg.trim()) { toast.error('Message vide'); return }
    const enc = encodeURIComponent(msg)
    if (channel === 'SMS') window.location.href = `sms:${phone}?&body=${enc}`
    else if (channel === 'WHATSAPP') window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${enc}`, '_blank')
    else if (channel === 'EMAIL') window.location.href = `mailto:${email}?body=${enc}`
    onSent(msg)
  }

  return (
    <div className="fixed inset-0 z-[80] flex flex-col">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="rounded-t-3xl bg-background pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto mb-3 mt-3 h-1 w-10 rounded-full bg-border" />
        <div className="flex items-center gap-2 border-b border-border px-4 pb-3">
          <button type="button" onClick={onClose} className="text-sm font-medium text-muted-foreground">Annuler</button>
          <h2 className="flex-1 text-center text-sm font-bold text-foreground">{label}</h2>
          <button type="button" onClick={send} className="rounded-xl bg-primary px-4 py-1.5 text-sm font-bold text-primary-foreground">Envoyer</button>
        </div>
        <div className="flex flex-col gap-3 px-4 py-4">
          <button type="button" onClick={draft} disabled={drafting}
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-primary/10 py-2.5 text-xs font-bold text-primary active:bg-primary/20 disabled:opacity-60">
            <Sparkles className="size-4 stroke-[1.5]" />{drafting ? 'Atlas rédige…' : 'Atlas rédige le message'}
          </button>
          <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={5} autoFocus
            placeholder="Écris ton message, ou laisse Atlas le rédiger…"
            className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-lg leading-relaxed text-foreground lg:text-sm outline-none placeholder:text-muted-foreground" />
          <p className="text-[10px] leading-relaxed text-muted-foreground">Atlas adapte le message à l'étape du funnel et à la couleur du contact. Relis toujours avant d'envoyer.</p>
        </div>
      </div>
    </div>
  )
}

/* ── Page ──────────────────────────────────────────────────────── */
// La fiche vit à deux endroits : sa route pleine (`params`) ET embarquée dans le fil du contact
// (panneau droit façon Telegram — `contactId` + `embedded` + `onClose`, pas de topbar/composeur propres).
export default function ContactDetailPage({ params, contactId, embedded, onClose }: { params?: Promise<{ id: string }>; contactId?: string; embedded?: boolean; onClose?: () => void }) {
  const id = contactId ?? use(params!).id
  const router = useRouter()
  const [contact, setContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)
  const [evalOpen, setEvalOpen] = useState(false)
  const [tab, setTab] = useState<'apercu' | 'qualif' | 'details'>('apercu') // onglets horizontaux
  const [dsub, setDsub] = useState<'coord' | 'profil' | 'suivi'>('profil')   // sous-onglets de Détails (Profil en tête)
  const [memDraft, setMemDraft] = useState('')
  const [memEditing, setMemEditing] = useState(false)
  const [contactConvs, setContactConvs] = useState<{ id: string; title: string | null; updatedAt: string }[]>([])
  // Accordéon : une seule carte ouverte à la fois (null = tout plié, l'état à l'arrivée).
  const [openCard, setOpenCard] = useState<string | null>(null)
  const toggleCard = (id: string) => setOpenCard((cur) => (cur === id ? null : id))
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [appointments, setAppointments] = useState<Appt[]>([])
  const [relances, setRelances] = useState<Relance[]>([])
  const [confirm, setConfirm] = useState<{ type: string; label: string; body?: string } | null>(null)
  const [schedule, setSchedule] = useState<'rdv' | 'relance' | null>(null)
  const [compose, setCompose] = useState<{ channel: string; label: string; auto?: boolean } | null>(null)
  const [sheet, setSheet] = useState<'message' | 'appel' | null>(null) // intermédiaire Message/Appel
  const [nextStep, setNextStep] = useState<{ action: string; headline: string; reason: string; channel: string | null } | null>(null)

  const load = useCallback(async () => {
    const [r1, r2, r3, r4, r5] = await Promise.all([
      fetch(`/api/contacts/${id}`),
      fetch(`/api/contacts/${id}/interactions`),
      fetch(`/api/appointments?contactId=${id}`),
      fetch(`/api/relances?contactId=${id}`),
      fetch(`/api/contacts/${id}/next-step`),
    ])
    if (!r1.ok) { setLoading(false); return }
    const data = await r1.json()
    setContact(data); setMemDraft(data.atlasMemory ?? '')
    if (r2.ok) setInteractions(await r2.json())
    if (r3.ok) setAppointments(await r3.json())
    if (r4.ok) setRelances(await r4.json())
    if (r5.ok) setNextStep(await r5.json())
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  // Conversations Atlas passées sur ce contact (rangées ici, hors historique principal).
  const refreshConvs = useCallback(() => {
    fetch(`/api/atlas/conversations?contactId=${id}`).then((r) => (r.ok ? r.json() : [])).then(setContactConvs).catch(() => {})
  }, [id])
  useEffect(() => { refreshConvs() }, [refreshConvs])

  const save = useCallback(async (patch: Record<string, unknown>, msg?: string) => {
    const res = await fetch(`/api/contacts/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
    if (res.ok) { await load(); if (msg) toast.success(msg) }
    else toast.error('Échec de la mise à jour')
  }, [id, load])

  const logAction = useCallback(async (type: string, extra?: Record<string, unknown>) => {
    const res = await fetch(`/api/contacts/${id}/interactions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, ...extra }) })
    if (res.ok) await load()
  }, [id, load])

  // ── Structure charte-profil (nouveau) : formulaire inline des familles perso du contact ──
  const [pf, setPf] = useState({ firstName: '', lastName: '', gender: '', birthDate: '', profession: '', education: '', phone: '', phone2: '', email: '', address: '', address2: '', postal: '', city: '', country: '' })
  const [pfDob, setPfDob] = useState({ d: '', m: '', y: '' })
  useEffect(() => {
    if (!contact) return
    setPf({
      firstName: contact.firstName ?? '', lastName: contact.lastName ?? '', gender: normGender(contact.gender ?? ''), birthDate: contact.birthDate ?? '',
      profession: contact.profession ?? '', education: contact.education ?? '',
      phone: formatPhone(contact.phone ?? ''), phone2: formatPhone(contact.phone2 ?? ''), email: contact.email ?? '',
      address: contact.address ?? '', address2: contact.address2 ?? '', postal: contact.postal ?? '', city: contact.city ?? '', country: contact.country ?? '',
    })
    const [y, m, d] = (contact.birthDate || '').split('-')
    setPfDob({ y: y ?? '', m: m ?? '', d: d ?? '' })
  }, [contact])
  const setPfField = (k: keyof typeof pf, v: string) => setPf((s) => ({ ...s, [k]: v }))
  // Qualification (DISC + proximité + signaux partenaire) — 3 blocs visuels
  const [qual, setQual] = useState({ personality: '', market: '', situation: '', interests: '', motivation: '', insatisfaction: '', reseau: '', ouverture: '' })
  useEffect(() => {
    if (!contact) return
    const q = (contact.qualification && typeof contact.qualification === 'object') ? contact.qualification : {}
    setQual({
      personality: contact.personality ?? '', market: contact.market ?? '',
      situation: q.situation ?? '', interests: q.interests ?? '', motivation: q.motivation ?? '',
      insatisfaction: q.insatisfaction ?? '', reseau: q.reseau ?? '', ouverture: q.ouverture ?? '',
    })
  }, [contact])
  const setQ = (k: keyof typeof qual, v: string) => setQual((s) => ({ ...s, [k]: v }))
  const [discOpen, setDiscOpen] = useState(false)
  const setPfDobPart = (patch: Partial<{ d: string; m: string; y: string }>) => {
    const next = { ...pfDob, ...patch }
    if (next.d && parseInt(next.d, 10) > daysInMonth(next.m, next.y)) next.d = ''
    setPfDob(next)
    setPf((s) => ({ ...s, birthDate: next.y && next.m && next.d ? `${next.y}-${next.m}-${next.d}` : '' }))
  }
  const pfDobDays = Array.from({ length: daysInMonth(pfDob.m, pfDob.y) }, (_, i) => ({ value: String(i + 1).padStart(2, '0'), label: String(i + 1) }))

  if (loading) return <div className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">Chargement…</div>
  if (!contact) return <div className="flex min-h-dvh flex-col items-center justify-center gap-3"><p className="text-sm text-muted-foreground">Contact introuvable.</p><button onClick={() => (embedded ? onClose?.() : router.back())} className="text-sm font-bold text-primary">Retour</button></div>

  const c = contact
  const perso = c.personality ? PERSO[c.personality] : null
  const isProspect = c.kind === 'PROSPECT'
  const isClient = c.kind === 'CLIENT'
  const isPartner = c.kind === 'PARTENAIRE'
  // Double-track : un client peut être re-sollicité (prospectStage actif) → on montre les deux.
  const recruiting = isClient && !!c.prospectStage
  const showOppCursor = isProspect || isPartner || recruiting
  const oppStages = isPartner ? PARTNER_STAGES : PROSPECT_STAGES
  const oppCurrent = isPartner ? c.partnerStage : c.prospectStage
  // Pastilles de statut + compteur « Détails »
  // Un seul save (toute la fiche) réutilisé par les onglets éditables — plus de code copié 3×.
  const saveAll = () => save({ ...pf, personality: qual.personality || null, market: qual.market || null, qualification: { situation: qual.situation, interests: qual.interests, motivation: qual.motivation, insatisfaction: qual.insatisfaction, reseau: qual.reseau, ouverture: qual.ouverture } }, 'Fiche enregistrée')
  // « À venir » = uniquement le futur : RDV pas encore passés, relances dues aujourd'hui ou après (pas de date passée).
  const nowMs = Date.now()
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0)
  const upAppts = appointments.filter((a) => new Date(a.startAt).getTime() >= nowMs)
  const upRelances = relances.filter((r) => new Date(r.dueAt).getTime() >= startOfToday.getTime())

  return (
    <div className={cn('flex w-full flex-col bg-background', embedded ? '' : 'mx-auto min-h-dvh max-w-2xl')}>
      {/* Topbar — flèche retour à gauche : la fiche est l'« info du contact », on revient à SA conversation */}
      <div className="sticky top-0 z-30 flex items-center gap-2 bg-background/90 px-4 py-3 backdrop-blur" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
        {embedded ? (
          <button type="button" onClick={onClose} aria-label="Fermer" className="-ml-1 flex size-9 items-center justify-center rounded-full text-muted-foreground active:bg-muted"><X className="size-5 stroke-[1.5]" /></button>
        ) : (
          <button type="button" onClick={() => router.push(`/chats/${id}`)} aria-label="Retour à la conversation" className="-ml-1 flex size-9 items-center justify-center rounded-full text-muted-foreground active:bg-muted"><ChevronLeft className="size-5 stroke-[1.5]" /></button>
        )}
        <h1 className="flex-1 text-center text-lg font-semibold text-foreground">{KIND_LABEL[c.kind]}</h1>
        <div className="size-9" />
      </div>

      {/* ═══ STRUCTURE CHARTE PROFIL (nouveau — à adapter) ═══ */}
      <div className="flex flex-col gap-5 px-4 pb-2 pt-2">
        <div className="flex flex-col items-center gap-2.5">
          <div className="grid size-20 place-items-center rounded-full text-2xl font-bold text-white" style={{ backgroundColor: perso?.hex ?? c.accent }}>{c.initials}</div>
          <p className="text-lg font-semibold text-foreground">{c.name || 'Contact'}</p>
          {/* Statut : uniquement ce qui n'est PAS déjà ailleurs (stade→tunnel Aperçu, marché+couleur→Qualification) */}
          {(recruiting || isProspect) && (
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {recruiting && <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">En recrutement</span>}
              {(isProspect || recruiting) && <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">{c.exposures} exposition{c.exposures > 1 ? 's' : ''}</span>}
            </div>
          )}
        </div>
      </div>

      {/* Actions — Message / Appel / Email, toujours visibles ; chacune ouvre son intermédiaire */}
      <div className="flex gap-1 px-4 pb-3 pt-1">
        <button type="button" onClick={() => setSheet('message')} className="flex flex-1 flex-col items-center gap-1.5 rounded-xl py-2 active:bg-muted"><span className="grid size-11 place-items-center rounded-full bg-primary/10"><MessageSquare className="size-5 stroke-[1.5] text-primary" /></span><span className="text-xs font-medium text-foreground">Message</span></button>
        <button type="button" onClick={() => setSheet('appel')} className="flex flex-1 flex-col items-center gap-1.5 rounded-xl py-2 active:bg-muted"><span className="grid size-11 place-items-center rounded-full bg-primary/10"><PhoneCall className="size-5 stroke-[1.5] text-primary" /></span><span className="text-xs font-medium text-foreground">Appel</span></button>
        <button type="button" onClick={() => { if (!c.email) { toast.error('Aucun email'); return } setCompose({ channel: 'EMAIL', label: 'Email' }) }} className="flex flex-1 flex-col items-center gap-1.5 rounded-xl py-2 active:bg-muted"><span className="grid size-11 place-items-center rounded-full bg-primary/10"><Mail className="size-5 stroke-[1.5] text-primary" /></span><span className="text-xs font-medium text-foreground">Email</span></button>
      </div>

      {/* Onglets horizontaux — Aperçu / Qualification / Détails (fini la « page bloc ») ; collés sous l'en-tête */}
      <div className="sticky z-20 flex border-y border-border bg-background" style={{ top: 'calc(48px + max(0.75rem, env(safe-area-inset-top)))' }}>
        {([['apercu', 'Aperçu'], ['qualif', 'Qualification'], ['details', 'Détails']] as const).map(([tid, label]) => (
          <button key={tid} type="button" onClick={() => setTab(tid)} className={cn('flex-1 py-3 text-sm transition-colors', tab === tid ? 'border-b-2 border-primary font-medium text-primary' : 'text-muted-foreground active:bg-muted')}>{label}</button>
        ))}
      </div>

      <div className="flex flex-col gap-4 px-4 pb-24 pt-3">
        {/* ═══ APERÇU — le coup d'œil et l'action ═══ */}
        {tab === 'apercu' && (<>
        {/* Curseur d'étape — le flow d'abord, un seul tunnel (opportunité) : prospect, partenaire, OU client re-sollicité */}
        {showOppCursor && (
          <StageCursor
            stages={oppStages}
            current={oppCurrent}
            onPick={(id) => save(isPartner ? { partnerStage: id } : { prospectStage: id }, 'Étape mise à jour')}
          />
        )}
        {/* Fiche client « pur » : possibilité de le réengager vers l'opportunité (entre au tunnel Invitation) */}
        {isClient && !recruiting && (
          <button
            type="button"
            onClick={() => save({ prospectStage: 'INVITATION' }, "Réengagé vers l'opportunité")}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-primary/5 py-3 text-base font-bold text-primary transition-transform active:scale-[0.98]"
          >
            <ArrowRight className="size-4 stroke-[1.5]" />
            Réengager vers l'opportunité
          </button>
        )}
        {/* Prochain pas — carte pliable (accordéon) */}
        {nextStep && (
          <Section title="Prochain pas" collapsible open={openCard === 'prochain'} onToggle={() => toggleCard('prochain')}>
            <p className="text-lg font-bold text-foreground lg:text-sm">{nextStep.headline}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{nextStep.reason}</p>
            {nextStep.action === 'MESSAGE' && nextStep.channel && (
              <button type="button" onClick={() => setCompose({ channel: nextStep.channel!, label: CHANNEL_LABEL[nextStep.channel!] ?? 'Message', auto: true })}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground active:opacity-90">
                Voir le message
              </button>
            )}
            {nextStep.action === 'EDIT' && (
              <button type="button" onClick={() => setTab('details')} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground active:opacity-90">Compléter la fiche</button>
            )}
          </Section>
        )}

        {/* Ce qu'Atlas retient — carte pliable (accordéon) ; « Corriger » la déplie */}
        <Section title="À retenir" collapsible open={openCard === 'retenir'} onToggle={() => toggleCard('retenir')} action={
          memEditing ? (
            <button type="button" onClick={() => { save({ atlasMemory: memDraft.trim() }, 'Mémoire mise à jour'); setMemEditing(false) }} className="rounded-lg bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">Enregistrer</button>
          ) : (
            <button type="button" onClick={() => { setMemDraft(c.atlasMemory ?? ''); setMemEditing(true); setOpenCard('retenir') }} className="text-xs font-medium text-primary"><Pencil className="mr-1 inline size-3" />{c.atlasMemory ? 'Corriger' : 'Ajouter'}</button>
          )
        }>
          {memEditing ? (
            <textarea value={memDraft} onChange={(e) => setMemDraft(e.target.value)} rows={4} autoFocus placeholder="Ce qu'Atlas doit retenir de ce contact… (vide = effacer)" className="w-full resize-none bg-transparent text-lg leading-relaxed text-foreground lg:text-sm outline-none placeholder:text-muted-foreground" />
          ) : c.atlasMemory ? (
            <p className="whitespace-pre-line text-lg leading-relaxed text-muted-foreground lg:text-sm">{c.atlasMemory}</p>
          ) : (
            <p className="text-lg leading-relaxed text-muted-foreground lg:text-sm">Rien pour l'instant. Atlas remplit ce bloc au fil de vos échanges, et tu peux noter toi-même l'essentiel.</p>
          )}
        </Section>

        </>)}

        {/* ═══ DÉTAILS — sous-onglets Coordonnées / Profil / Suivi ═══ */}
        {tab === 'details' && (<>
        <div className="flex gap-2">
          {([['profil', 'Profil'], ['coord', 'Coordonnées'], ['suivi', 'Suivi']] as const).map(([sid, label]) => (
            <button key={sid} type="button" onClick={() => setDsub(sid)} className={cn('rounded-full border px-3.5 py-1.5 text-sm transition-colors', dsub === sid ? 'border-border bg-surface font-medium text-foreground' : 'border-transparent text-muted-foreground active:bg-muted')}>{label}</button>
          ))}
        </div>

        {/* — Sous-onglet SUIVI : le journal terrain (échanges, à venir, historique) — */}
        {dsub === 'suivi' && (<>
        {/* Repères — l'état du suivi en une ligne (au lieu d'un signal par carte) */}
        <p className="text-xs leading-relaxed text-muted-foreground">
          Dernier contact : <span className="font-medium text-foreground">{c.lastContact ? new Date(c.lastContact).toLocaleDateString('fr-FR') : 'jamais'}</span>
          {isPartner && c.signedAt && <> · partenaire depuis <span className="font-medium text-foreground">{new Date(c.signedAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</span></>}
          {(isProspect || recruiting) && <> · <span className="font-medium text-foreground">{c.exposures}</span> exposition{c.exposures > 1 ? 's' : ''}</>}
        </p>
        {/* À venir — RDV/relances programmés ; on planifie depuis l'en-tête (créer là où on regarde) */}
        <Section title="À venir" collapsible count={upAppts.length + upRelances.length} open={openCard === 'avenir'} onToggle={() => toggleCard('avenir')} action={
          <div className="flex gap-1">
            <button type="button" onClick={() => setSchedule('rdv')} className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-primary active:bg-primary/10"><CalendarPlus className="size-3.5 stroke-[1.5]" />RDV</button>
            <button type="button" onClick={() => setSchedule('relance')} className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-primary active:bg-primary/10"><Bell className="size-3.5 stroke-[1.5]" />Relance</button>
          </div>
        }>
          {(upAppts.length > 0 || upRelances.length > 0) ? (
            <div className="flex flex-col divide-y divide-border">
              {upAppts.map((a) => (
                <div key={a.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <CalendarPlus className="size-4 shrink-0 stroke-[1.5] text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-medium text-foreground lg:text-sm">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{new Date(a.startAt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })} · {a.type}</p>
                  </div>
                </div>
              ))}
              {upRelances.map((r) => (
                <div key={r.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <Bell className="size-4 shrink-0 stroke-[1.5] text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-medium text-foreground lg:text-sm">Relance · {r.channel}</p>
                    <p className="text-xs text-muted-foreground">{new Date(r.dueAt).toLocaleDateString('fr-FR')}{r.message ? ` · ${r.message}` : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Rien de prévu. Planifie un RDV ou une relance.</p>
          )}
        </Section>

        {/* Échanges avec Atlas — les conversations de coaching sur ce contact (rouvrir) */}
        {contactConvs.length > 0 && (
          <Section title="Échanges avec Atlas" collapsible count={contactConvs.length} open={openCard === 'echanges'} onToggle={() => toggleCard('echanges')}>
            <div className="flex flex-col divide-y divide-border">
              {contactConvs.map((cv) => (
                <button key={cv.id} type="button" onClick={() => router.push(`/chats/${id}`)} className="flex items-center gap-3 py-2.5 text-left first:pt-0 last:pb-0 active:opacity-70">
                  <Sparkles className="size-4 shrink-0 stroke-[1.5] text-primary" />
                  <span className="min-w-0 flex-1 truncate text-lg text-foreground lg:text-sm">{cv.title || 'Échange'}</span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{new Date(cv.updatedAt).toLocaleDateString('fr-FR')}</span>
                </button>
              ))}
            </div>
          </Section>
        )}

        {/* Historique — journal terrain, pliable comme les autres sections */}
        {interactions.length > 0 && (
          <Section title="Historique" collapsible count={interactions.length} open={openCard === 'historique'} onToggle={() => toggleCard('historique')}>
            <ol className="flex flex-col gap-3">
              {interactions.map((it) => {
                const m = INTERACTION_META[it.type] ?? INTERACTION_META.AUTRE
                return (
                  <li key={it.id} className="flex items-start gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"><m.icon className="size-3.5 stroke-[1.5]" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-medium text-foreground lg:text-sm">{m.label}{it.direction === 'IN' ? ' reçu' : ''}{it.outcome ? ` · ${it.outcome.toLowerCase()}` : ''}</p>
                      {it.body && <p className="truncate text-xs text-muted-foreground">{it.body}</p>}
                      <p className="mt-0.5 text-[10px] text-muted-foreground">{new Date(it.createdAt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                    </div>
                    {it.isExposure && <span className="shrink-0 text-[10px] font-bold text-primary">+1 expo</span>}
                  </li>
                )
              })}
            </ol>
          </Section>
        )}

        {/* Gérer — administration (statut, suppression), séparée du suivi */}
        <div className="mt-2 flex flex-col gap-3 border-t border-border pt-4">
          {(isProspect || isClient) && (
            <div className="flex flex-wrap items-center gap-1">
              <span className="mr-1 text-xs text-muted-foreground">Convertir en</span>
              {isProspect && (
                <button type="button" onClick={() => save({ convert: 'client' }, 'Converti en client')} className="rounded-md px-2 py-0.5 text-sm font-semibold text-primary active:bg-primary/10">client</button>
              )}
              {isProspect && <span className="text-xs text-muted-foreground">·</span>}
              <button type="button" onClick={() => save({ convert: 'partenaire' }, 'Converti en partenaire')} className="rounded-md px-2 py-0.5 text-sm font-semibold text-primary active:bg-primary/10">partenaire</button>
            </div>
          )}
          <button type="button" onClick={() => { if (window.confirm('Supprimer définitivement ce contact ?')) { fetch(`/api/contacts/${id}`, { method: 'DELETE' }).then((r) => { if (r.ok) { toast.success('Contact supprimé'); router.push('/contacts') } else toast.error('Échec de la suppression') }) } }}
            className="flex items-center gap-1.5 self-start text-sm font-medium text-muted-foreground transition-colors active:text-destructive">
            <Trash2 className="size-4" /> Supprimer ce contact
          </button>
        </div>

        {/* fin sous-onglet Suivi */}
        </>)}

        {/* — Sous-onglet PROFIL : identité — */}
        {dsub === 'profil' && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <input className={fieldCls} value={pf.firstName} onChange={(e) => setPfField('firstName', e.target.value)} placeholder="Prénom" />
              <input className={fieldCls} value={pf.lastName} onChange={(e) => setPfField('lastName', e.target.value)} placeholder="Nom" />
              <SelectMenu className={fieldCls} placeholder="Genre" value={pf.gender} onChange={(v) => setPfField('gender', v)} options={[{ value: 'M', label: 'Homme' }, { value: 'F', label: 'Femme' }, { value: 'N', label: 'Neutre' }]} />
              <div className="grid grid-cols-[0.9fr_1.7fr_1.2fr] gap-2">
                <SelectMenu className={fieldCls} placeholder="Jour" value={pfDob.d} onChange={(v) => setPfDobPart({ d: v })} options={pfDobDays} />
                <SelectMenu className={fieldCls} placeholder="Mois" value={pfDob.m} onChange={(v) => setPfDobPart({ m: v })} options={DOB_MONTHS} />
                <SelectMenu className={fieldCls} placeholder="Année" value={pfDob.y} onChange={(v) => setPfDobPart({ y: v })} options={DOB_YEARS} />
              </div>
              <input className={fieldCls} value={pf.profession} onChange={(e) => setPfField('profession', e.target.value)} placeholder="Profession" />
              <SelectMenu className={fieldCls} placeholder="Niveau d'études" value={pf.education} onChange={(v) => setPfField('education', v)} options={EDUCATIONS.map((o) => ({ value: o, label: o }))} />
            </div>
            <button type="button" onClick={saveAll} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-base font-bold text-primary-foreground transition-transform active:scale-[0.98]">Enregistrer</button>
          </div>
        )}

        {/* — Sous-onglet COORDONNÉES — */}
        {dsub === 'coord' && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <input className={fieldCls} type="tel" inputMode="numeric" value={pf.phone} onChange={(e) => setPfField('phone', formatPhone(e.target.value))} placeholder="Téléphone" />
              <input className={fieldCls} type="tel" inputMode="numeric" value={pf.phone2} onChange={(e) => setPfField('phone2', formatPhone(e.target.value))} placeholder="Téléphone secondaire" />
              <input className={fieldCls} type="email" value={pf.email} onChange={(e) => setPfField('email', e.target.value)} placeholder="Email" />
              <input className={fieldCls} value={pf.address} onChange={(e) => setPfField('address', e.target.value)} placeholder="Adresse" />
              <input className={fieldCls} value={pf.address2} onChange={(e) => setPfField('address2', e.target.value)} placeholder="Complément d'adresse" />
              <input className={fieldCls} value={pf.postal} onChange={(e) => setPfField('postal', e.target.value)} placeholder="Code postal" />
              <input className={fieldCls} value={pf.city} onChange={(e) => setPfField('city', e.target.value)} placeholder="Ville" />
              <SelectMenu className={fieldCls} placeholder="Pays" value={pf.country} onChange={(v) => setPfField('country', v)} options={PAYS.map((p) => ({ value: p, label: p }))} />
            </div>
            <button type="button" onClick={saveAll} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-base font-bold text-primary-foreground transition-transform active:scale-[0.98]">Enregistrer</button>
          </div>
        )}
        </>)}

        {/* ═══ QUALIFICATION — comment l'aborder, le contexte, les signaux ═══ */}
        {tab === 'qualif' && (
          <div className="flex flex-col gap-4">
            {/* Bloc 1 — Comment l'aborder (DISC + proximité) */}
            <div>
              <p className="mb-1.5 text-sm font-semibold text-foreground">Comment l&apos;aborder</p>
              {evalOpen ? (
                <PersonalityQuiz inline subjectName={pf.firstName || 'Ce contact'} gender={pf.gender} count={3} onClose={() => setEvalOpen(false)} onResult={(color) => { setQ('personality', color); setEvalOpen(false) }} />
              ) : (<>
              {qual.personality && PERSO[qual.personality] ? (
                <div className="overflow-hidden rounded-xl border border-border bg-background">
                  <div className="flex items-center gap-2.5 px-4 py-3">
                    <button type="button" onClick={() => setDiscOpen((o) => !o)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                      <span className="size-6 shrink-0 rounded-full" style={{ backgroundColor: PERSO[qual.personality].hex }} />
                      <span className="flex-1 text-lg font-medium text-foreground lg:text-sm">Personnalité</span>
                      <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform', discOpen && 'rotate-180')} />
                    </button>
                    <button type="button" onClick={() => setEvalOpen(true)} className="shrink-0 text-sm font-semibold text-primary">Refaire le test</button>
                  </div>
                  {discOpen && (() => {
                    const info = describePersonality(qual.personality, pf.gender)
                    return (
                      <div className="border-t border-border px-4 py-3">
                        <p className="text-sm font-semibold" style={{ color: PERSO[qual.personality].hex }}>{info ? info.archetype : PERSO[qual.personality].label}</p>
                        <p className="mt-1 text-lg leading-relaxed text-muted-foreground lg:text-sm">{PERSO[qual.personality].approach}</p>
                      </div>
                    )
                  })()}
                </div>
              ) : (
                <button type="button" onClick={() => setEvalOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
                  <Sparkles className="size-4" /> Évaluer la couleur
                </button>
              )}
              <div className="mt-2">
                <SelectMenu className={fieldCls} placeholder="Marché d'origine (proximité)" value={qual.market} onChange={(v) => setQ('market', v)} options={[{ value: 'CHAUD', label: 'Marché chaud' }, { value: 'TIEDE', label: 'Marché tiède' }, { value: 'FROID', label: 'Marché froid' }]} />
              </div>
              </>)}
            </div>
            {/* Bloc 2 — Le contexte */}
            <div className="border-t border-border pt-3">
              <p className="mb-1.5 text-sm font-semibold text-foreground">Le contexte</p>
              <div className="flex flex-col gap-2">
                <input className={fieldCls} value={qual.situation} onChange={(e) => setQ('situation', e.target.value)} placeholder="Sa situation (métier, famille, dispo)" />
                <input className={fieldCls} value={qual.interests} onChange={(e) => setQ('interests', e.target.value)} placeholder="Ses centres d'intérêt" />
              </div>
            </div>
            {/* Bloc 3 — Potentiel partenaire */}
            {(() => {
              const potFilled = [qual.motivation, qual.insatisfaction, qual.reseau, qual.ouverture].filter((v) => v && v.trim()).length
              const potLabel = potFilled >= 3 ? 'Fort' : potFilled === 2 ? 'Moyen' : 'À creuser'
              return (
                <div className="border-t border-border pt-3">
                  <div className="mb-1.5 flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">Potentiel partenaire</p>
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">{potLabel}</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <input className={fieldCls} value={qual.motivation} onChange={(e) => setQ('motivation', e.target.value)} placeholder="Sa motivation / besoin (argent, temps, santé…)" />
                    <input className={fieldCls} value={qual.insatisfaction} onChange={(e) => setQ('insatisfaction', e.target.value)} placeholder="Son insatisfaction actuelle" />
                    <input className={fieldCls} value={qual.reseau} onChange={(e) => setQ('reseau', e.target.value)} placeholder="Son réseau / influence" />
                    <input className={fieldCls} value={qual.ouverture} onChange={(e) => setQ('ouverture', e.target.value)} placeholder="Son ouverture à l'opportunité" />
                  </div>
                </div>
              )
            })()}
            <button type="button" onClick={saveAll} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-base font-bold text-primary-foreground transition-transform active:scale-[0.98]">Enregistrer</button>
          </div>
        )}
      </div>
      {/* Intermédiaire d'action — Message (choix du canal) · Appel (appeler ou s'entraîner) */}
      {sheet && (
        <div className="fixed inset-0 z-[80] flex flex-col">
          <div className="flex-1 bg-black/40" onClick={() => setSheet(null)} />
          <div className="rounded-t-3xl bg-background pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="mx-auto mb-4 mt-3 h-1 w-10 rounded-full bg-border" />
            {sheet === 'message' ? (
              <>
                <p className="px-5 pb-1 text-lg font-bold text-foreground">Envoyer un message</p>
                <p className="px-5 pb-2 text-xs text-muted-foreground">Choisis le canal. Atlas rédige, tu valides.</p>
                <div className="flex flex-col gap-2 px-5 py-3">
                  <button type="button" onClick={() => { if (!c.phone) { toast.error('Aucun numéro'); return } setCompose({ channel: 'SMS', label: 'SMS' }); setSheet(null) }} className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 text-left active:bg-muted">
                    <MessageSquare className="size-5 shrink-0 stroke-[1.5] text-primary" />
                    <span className="text-lg font-medium text-foreground lg:text-sm">SMS</span>
                  </button>
                  <button type="button" onClick={() => { if (!c.phone) { toast.error('Aucun numéro'); return } setCompose({ channel: 'WHATSAPP', label: 'WhatsApp' }); setSheet(null) }} className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 text-left active:bg-muted">
                    <MessageCircle className="size-5 shrink-0 stroke-[1.5] text-[#25D366]" />
                    <span className="text-lg font-medium text-foreground lg:text-sm">WhatsApp</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="px-5 pb-1 text-lg font-bold text-foreground">Appeler {pf.firstName || c.name}</p>
                <p className="px-5 pb-2 text-xs text-muted-foreground">Passe l&apos;appel, ou entraîne-toi d&apos;abord avec Aria.</p>
                <div className="flex flex-col gap-2 px-5 py-3">
                  <button type="button" onClick={() => { if (!c.phone) { toast.error('Aucun numéro'); return } window.location.href = `tel:${c.phone}`; setConfirm({ type: 'APPEL', label: 'Appel' }); setSheet(null) }} className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 text-left active:bg-muted">
                    <PhoneCall className="size-5 shrink-0 stroke-[1.5] text-primary" />
                    <span className="text-lg font-medium text-foreground lg:text-sm">Appeler maintenant</span>
                  </button>
                  <button type="button" onClick={() => { router.push(`/aria?contact=${c.id}`); setSheet(null) }} className="flex items-center gap-3 rounded-2xl bg-[#14B8A6]/10 px-4 py-3.5 text-left active:bg-[#14B8A6]/20">
                    <Mic className="size-5 shrink-0 stroke-[1.5] text-[#14B8A6]" />
                    <span className="text-lg font-medium text-[#14B8A6] lg:text-sm">M&apos;entraîner avec Aria</span>
                  </button>
                </div>
              </>
            )}
            <button type="button" onClick={() => setSheet(null)} className="w-full px-4 py-2 text-sm font-medium text-muted-foreground">Annuler</button>
          </div>
        </div>
      )}
      {schedule && <ScheduleSheet mode={schedule} contactId={id} onClose={() => setSchedule(null)} onDone={load} />}
      {compose && <ComposeSheet contactId={id} channel={compose.channel} label={compose.label} phone={c.phone} email={c.email} autoDraft={compose.auto}
        onClose={() => setCompose(null)}
        onSent={(m) => { setConfirm({ type: compose.channel, label: compose.label, body: m }); setCompose(null) }} />}

      {/* Confirmation d'action (log + outcome) */}
      {confirm && (
        <div className="fixed inset-0 z-[80] flex flex-col">
          <div className="flex-1 bg-black/40" onClick={() => setConfirm(null)} />
          <div className="rounded-t-3xl bg-background pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="mx-auto mb-4 mt-3 h-1 w-10 rounded-full bg-border" />
            <p className="px-5 pb-1 text-lg font-bold text-foreground">{confirm.label} — c'était comment ?</p>
            <p className="px-5 pb-2 text-xs text-muted-foreground">On enregistre l'interaction (+1 exposition).</p>
            <div className="flex flex-col gap-2 px-5 py-3">
              {[['POSITIF', '👍 Positif'], ['NEUTRE', '😐 Neutre'], ['SANS_REPONSE', '📵 Pas de réponse']].map(([o, l]) => (
                <button key={o} type="button"
                  onClick={() => { logAction(confirm.type, { outcome: o, body: confirm.body }); setConfirm(null); toast.success('Interaction enregistrée') }}
                  className="rounded-2xl border border-border bg-surface px-4 py-3.5 text-left text-lg font-medium text-foreground lg:text-sm active:bg-muted">{l}</button>
              ))}
              <button type="button" onClick={() => setConfirm(null)} className="px-4 py-2 text-sm font-medium text-muted-foreground">Pas fait / annuler</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
