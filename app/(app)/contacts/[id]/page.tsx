'use client'

import { use, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, Pencil, Phone, Mail, MapPin, Link2, Clock, Tag,
  MessageSquare, PhoneCall, CalendarPlus, Mic, Sparkles, ArrowRight, X, Plus,
  MessageCircle, Bell, Share2, StickyNote,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Card } from '@/components/card'
import { WhenPicker } from '@/components/when-picker'

/* ── Référentiels ─────────────────────────────────────────────── */
const PERSO: Record<string, { label: string; hex: string; desc: string; approach: string }> = {
  ROUGE: { label: 'Rouge', hex: '#EF4444', desc: 'Fonceur — résultats, direct, décide vite.', approach: 'Va droit au but, parle chiffres et défi. Évite les détails.' },
  VERT:  { label: 'Vert',  hex: '#22C55E', desc: 'Analytique — veut des preuves, des faits.', approach: 'Apporte des faits, des preuves, laisse-lui le temps. Zéro hype.' },
  BLEU:  { label: 'Bleu',  hex: '#3B82F6', desc: 'Social — fun, gens, nouveauté.', approach: "Mise sur l'énergie, l'aventure, les gens. Évite les chiffres." },
  JAUNE: { label: 'Jaune', hex: '#F4B342', desc: 'Relationnel — aider, harmonie, zéro pression.', approach: "Chaleur, écoute, montre comment ça aide les gens. Aucune pression." },
}
const MARCHE: Record<string, { label: string; hex: string }> = {
  CHAUD: { label: 'Chaud', hex: '#EF4444' },
  TIEDE: { label: 'Tiède', hex: '#F4B342' },
  FROID: { label: 'Froid', hex: '#3B82F6' },
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
const SOURCE_LABEL: Record<string, string> = {
  instagram: 'Instagram', linkedin: 'LinkedIn', facebook: 'Facebook', tiktok: 'TikTok',
  manuel: 'Manuel', bot_whatsapp: 'WhatsApp', bot_telegram: 'Telegram', import: 'Import',
  rdv_inbound: 'RDV entrant', famille: 'Famille', refere: 'Référé par un ami',
  connaissance: 'Connaissance', campagne_email: 'Campagne email', page_capture: 'Page de capture',
  evenement: 'Événement',
}
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

/* ── Évaluation personnalité (mini, observation) ──────────────── */
const EVAL_Q = [
  {
    q: "Quand tu lui parles, qu'est-ce qui compte le plus pour lui ?",
    opts: [['ROUGE', 'Aller au résultat, gagner'], ['BLEU', "S'amuser, du contact, du fun"], ['JAUNE', 'Aider, des relations sincères'], ['VERT', 'Comprendre, des preuves']],
  },
  {
    q: 'Comment prend-il ses décisions ?',
    opts: [['ROUGE', 'Vite et avec assurance'], ['BLEU', "À l'instinct, l'émotion"], ['JAUNE', 'Lentement, sans pression'], ['VERT', 'Après avoir tout analysé']],
  },
  {
    q: "Qu'est-ce qui l'agace le plus ?",
    opts: [['ROUGE', 'Perdre son temps'], ['BLEU', "La routine, l'ennui"], ['JAUNE', 'Le conflit, la pression'], ['VERT', "Le manque de détails"]],
  },
]

function PersoEval({ onClose, onResult }: { onClose: () => void; onResult: (color: string) => void }) {
  const [step, setStep] = useState(0)
  const [votes, setVotes] = useState<string[]>([])

  function pick(color: string) {
    const next = [...votes, color]
    if (step < EVAL_Q.length - 1) { setVotes(next); setStep(step + 1) }
    else {
      const tally: Record<string, number> = {}
      next.forEach((c) => { tally[c] = (tally[c] ?? 0) + 1 })
      const winner = Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0]
      onResult(winner)
    }
  }

  const cur = EVAL_Q[step]
  return (
    <div className="fixed inset-0 z-[80] flex flex-col">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="rounded-t-3xl bg-background pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto mb-4 mt-3 h-1 w-10 rounded-full bg-border" />
        <div className="flex items-center justify-between px-5 pb-3">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Évaluation · {step + 1}/{EVAL_Q.length}</p>
          <button type="button" onClick={onClose}><X className="size-4 text-muted-foreground" /></button>
        </div>
        <div className="px-5 pb-2"><p className="text-lg font-bold text-foreground">{cur.q}</p></div>
        <div className="flex flex-col gap-2 px-5 py-4">
          {cur.opts.map(([color, label]) => (
            <button key={color} type="button" onClick={() => pick(color)}
              className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 text-left text-sm font-medium text-foreground transition-colors active:bg-muted">
              <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: PERSO[color].hex }} />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Types ────────────────────────────────────────────────────── */
type Contact = {
  id: string; name: string; firstName: string; lastName: string; gender: string; profession: string; education: string; initials: string; accent: string
  kind: string; email: string; phone: string; phone2: string; address: string; address2: string; postal: string; city: string; country: string
  source: string; personality: string | null; market: string | null; prospectStage: string | null; partnerStage: string | null
  score: number; exposures: number; lastContact: string | null; note: string; tags: string[]; convertedUserId: string | null
}
type Interaction = { id: string; type: string; direction: string; outcome: string | null; body: string | null; isExposure: boolean; createdAt: string }
type Appt = { id: string; title: string; startAt: string; type: string; done: boolean }
type Relance = { id: string; channel: string; dueAt: string; message: string | null; status: string }

/* ── Niveaux d'études + harmonisation du genre (M/F/N) ─────────── */
const EDUCATIONS = ['Primaire et secondaire', 'Supérieur court (Bac+2/3)', 'Supérieur long (Bac+5 et +)']
const normGender = (g: string) => (g === 'HOMME' || g === 'Homme' ? 'M' : g === 'FEMME' || g === 'Femme' ? 'F' : g === 'AUTRE' || g === 'Autre' || g === 'Neutre' ? 'N' : g)

/* ── Modifier (identité + coordonnées) ────────────────────────── */
function EditSheet({ contact, onClose, onSave, onDelete }: { contact: Contact; onClose: () => void; onSave: (p: Partial<Contact>) => void; onDelete: () => void }) {
  const [f, setF] = useState({
    firstName: contact.firstName, lastName: contact.lastName, gender: normGender(contact.gender),
    profession: contact.profession ?? '', education: contact.education ?? '',
    market: contact.market ?? '',
    email: contact.email, phone: contact.phone, phone2: contact.phone2,
    address: contact.address, postal: contact.postal, city: contact.city, country: contact.country,
  })
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }))
  const input = 'w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground'
  const label = 'mb-1.5 block text-xs font-bold uppercase tracking-widest text-muted-foreground'

  return (
    <div className="fixed inset-0 z-[80] flex flex-col">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="max-h-[92dvh] overflow-y-auto rounded-t-3xl bg-background">
        <div className="sticky top-0 z-10 bg-background pt-3">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
          <div className="flex items-center gap-2 border-b border-border px-4 pb-3">
            <button type="button" onClick={onClose} className="text-sm font-medium text-muted-foreground">Annuler</button>
            <h2 className="flex-1 text-center text-sm font-bold text-foreground">Modifier</h2>
            <button type="button" onClick={() => onSave(f)} className="rounded-xl bg-primary px-4 py-1.5 text-sm font-bold text-primary-foreground">Enregistrer</button>
          </div>
        </div>
        <div className="flex flex-col gap-4 px-4 py-5 pb-10">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>Prénom</label><input value={f.firstName} onChange={(e) => set('firstName', e.target.value)} className={input} /></div>
            <div><label className={label}>Nom</label><input value={f.lastName} onChange={(e) => set('lastName', e.target.value)} className={input} /></div>
          </div>
          <div>
            <label className={label}>Genre</label>
            <div className="flex gap-2">
              {[['M', 'Homme'], ['F', 'Femme'], ['N', 'Neutre']].map(([v, l]) => (
                <button key={v} type="button" onClick={() => set('gender', f.gender === v ? '' : v)}
                  className={cn('flex-1 rounded-xl py-2.5 text-sm font-bold transition-colors', f.gender === v ? 'bg-primary text-primary-foreground' : 'border border-border bg-surface text-foreground')}>{l}</button>
              ))}
            </div>
          </div>
          <div><label className={label}>Profession</label><input value={f.profession} onChange={(e) => set('profession', e.target.value)} placeholder="Son activité principale" className={input} /></div>
          <div>
            <label className={label}>Niveau d&apos;études</label>
            <select value={f.education} onChange={(e) => set('education', e.target.value)} className={input}>
              <option value="">—</option>
              {EDUCATIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Marché d'origine</label>
            <div className="flex gap-2">
              {Object.entries(MARCHE).map(([v, m]) => (
                <button key={v} type="button" onClick={() => set('market', f.market === v ? '' : v)}
                  className={cn('flex-1 rounded-xl py-2.5 text-sm font-bold transition-colors', f.market === v ? 'bg-primary text-primary-foreground' : 'border border-border bg-surface text-foreground')}>{m.label}</button>
              ))}
            </div>
            <p className="mt-1.5 text-[10px] text-muted-foreground">D'où vient ce contact (fixé à l'arrivée, rarement modifié).</p>
          </div>
          <div><label className={label}>Téléphone</label><input value={f.phone} onChange={(e) => set('phone', e.target.value)} type="tel" placeholder="+33 6 …" className={input} /></div>
          <div><label className={label}>Téléphone 2</label><input value={f.phone2} onChange={(e) => set('phone2', e.target.value)} type="tel" placeholder="Optionnel" className={input} /></div>
          <div><label className={label}>Email</label><input value={f.email} onChange={(e) => set('email', e.target.value)} type="email" placeholder="contact@email.fr" className={input} /></div>
          <div><label className={label}>Adresse</label><input value={f.address} onChange={(e) => set('address', e.target.value)} placeholder="12 rue …" className={input} /></div>
          <div className="grid grid-cols-[100px_1fr] gap-3">
            <div><label className={label}>CP</label><input value={f.postal} onChange={(e) => set('postal', e.target.value)} placeholder="75001" className={input} /></div>
            <div><label className={label}>Ville</label><input value={f.city} onChange={(e) => set('city', e.target.value)} placeholder="Paris" className={input} /></div>
          </div>
          <div><label className={label}>Pays</label><input value={f.country} onChange={(e) => set('country', e.target.value)} placeholder="France" className={input} /></div>
          <button type="button" onClick={() => { if (window.confirm('Supprimer définitivement ce contact ?')) onDelete() }}
            className="mt-2 rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/5 px-4 py-3 text-sm font-bold text-[#EF4444] active:bg-[#EF4444]/10">
            Supprimer ce contact
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Carte famille ────────────────────────────────────────────── */
function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
        {action}
      </div>
      <div className="px-5 py-4">{children}</div>
    </Card>
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
            className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground" />
          <p className="text-[10px] leading-relaxed text-muted-foreground">Atlas adapte le message à l'étape du funnel et à la couleur du contact. Relis toujours avant d'envoyer.</p>
        </div>
      </div>
    </div>
  )
}

/* ── Page ──────────────────────────────────────────────────────── */
export default function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [contact, setContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [evalOpen, setEvalOpen] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')
  const [noteEditing, setNoteEditing] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [appointments, setAppointments] = useState<Appt[]>([])
  const [relances, setRelances] = useState<Relance[]>([])
  const [confirm, setConfirm] = useState<{ type: string; label: string; body?: string } | null>(null)
  const [schedule, setSchedule] = useState<'rdv' | 'relance' | null>(null)
  const [compose, setCompose] = useState<{ channel: string; label: string; auto?: boolean } | null>(null)
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
    setContact(data); setNoteDraft(data.note ?? '')
    if (r2.ok) setInteractions(await r2.json())
    if (r3.ok) setAppointments(await r3.json())
    if (r4.ok) setRelances(await r4.json())
    if (r5.ok) setNextStep(await r5.json())
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  const save = useCallback(async (patch: Record<string, unknown>, msg?: string) => {
    const res = await fetch(`/api/contacts/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
    if (res.ok) { await load(); if (msg) toast.success(msg) }
    else toast.error('Échec de la mise à jour')
  }, [id, load])

  const logAction = useCallback(async (type: string, extra?: Record<string, unknown>) => {
    const res = await fetch(`/api/contacts/${id}/interactions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, ...extra }) })
    if (res.ok) await load()
  }, [id, load])

  if (loading) return <div className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">Chargement…</div>
  if (!contact) return <div className="flex min-h-dvh flex-col items-center justify-center gap-3"><p className="text-sm text-muted-foreground">Contact introuvable.</p><button onClick={() => router.back()} className="text-sm font-bold text-primary">Retour</button></div>

  const c = contact
  const perso = c.personality ? PERSO[c.personality] : null
  const isProspect = c.kind === 'PROSPECT'
  const isClient = c.kind === 'CLIENT'
  const isPartner = c.kind === 'PARTENAIRE'

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col bg-background">
      {/* Topbar */}
      <div className="sticky top-0 z-30 flex items-center gap-2 bg-background/90 px-4 py-3 backdrop-blur" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
        <button type="button" onClick={() => router.back()} className="-ml-1 flex size-9 items-center justify-center rounded-full text-muted-foreground active:bg-muted"><ChevronLeft className="size-5 stroke-[1.5]" /></button>
        <p className="flex-1 text-center text-sm font-medium text-muted-foreground">{KIND_LABEL[c.kind]}</p>
        <button type="button" onClick={() => setEditOpen(true)} className="flex size-9 items-center justify-center rounded-full text-muted-foreground active:bg-muted"><Pencil className="size-4 stroke-[1.5]" /></button>
      </div>

      <div className="flex flex-col gap-4 px-4 pb-24 pt-2">
        {/* Hero identité */}
        <div className="flex flex-col items-center gap-2 pb-2">
          <div className="flex size-20 items-center justify-center rounded-full text-2xl font-bold text-white" style={{ backgroundColor: perso?.hex ?? c.accent }}>{c.initials}</div>
          <h1 className="text-2xl font-bold text-foreground">{c.name}</h1>
          {c.city && <div className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3 stroke-[1.5]" />{c.city}</div>}
        </div>

        {/* LE PROCHAIN PAS — cockpit Atlas */}
        {nextStep && (
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
            <div className="mb-1.5 flex items-center gap-1.5">
              <Sparkles className="size-4 stroke-[1.5] text-primary" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Le prochain pas · Atlas</p>
            </div>
            <p className="text-base font-bold text-foreground">{nextStep.headline}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{nextStep.reason}</p>
            {nextStep.action === 'MESSAGE' && nextStep.channel && (
              <button type="button" onClick={() => setCompose({ channel: nextStep.channel!, label: CHANNEL_LABEL[nextStep.channel!] ?? 'Message', auto: true })}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground active:opacity-90">
                <Sparkles className="size-3.5 stroke-[1.5]" />Voir le message d'Atlas
              </button>
            )}
            {nextStep.action === 'EDIT' && (
              <button type="button" onClick={() => setEditOpen(true)} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground active:opacity-90">Compléter la fiche</button>
            )}
          </div>
        )}

        {/* Actions rapides (branchées à la prochaine étape : appel/message/email/SMS) */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { type: 'APPEL', label: 'Appel', icon: PhoneCall, href: c.phone ? `tel:${c.phone}` : '', err: 'Aucun numéro', external: false },
            { type: 'SMS', label: 'SMS', icon: MessageSquare, href: c.phone ? `sms:${c.phone}` : '', err: 'Aucun numéro', external: false },
            { type: 'WHATSAPP', label: 'WhatsApp', icon: MessageCircle, href: c.phone ? `https://wa.me/${c.phone.replace(/[^0-9]/g, '')}` : '', err: 'Aucun numéro', external: true },
            { type: 'EMAIL', label: 'Email', icon: Mail, href: c.email ? `mailto:${c.email}` : '', err: 'Aucun email', external: false },
          ].map((t) => (
            <button key={t.type} type="button"
              onClick={() => {
                if (t.type === 'APPEL') { if (!c.phone) { toast.error('Aucun numéro'); return } window.location.href = `tel:${c.phone}`; setConfirm({ type: 'APPEL', label: 'Appel' }); return }
                if (t.type === 'EMAIL' ? !c.email : !c.phone) { toast.error(t.err); return }
                setCompose({ channel: t.type, label: t.label })
              }}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-surface py-3 active:bg-muted">
              <t.icon className="size-5 stroke-[1.5] text-primary" />
              <span className="text-[10px] font-medium text-foreground">{t.label}</span>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => router.push(`/aria?contact=${c.id}`)} className="flex items-center justify-center gap-1.5 rounded-2xl bg-[#14B8A6]/10 py-3 text-xs font-bold text-[#14B8A6] active:bg-[#14B8A6]/20"><Mic className="size-4 stroke-[1.5]" />Simuler avec Aria</button>
          <button type="button" onClick={() => toast('Atlas analyse ce contact — bientôt')} className="flex items-center justify-center gap-1.5 rounded-2xl bg-primary/10 py-3 text-xs font-bold text-primary active:bg-primary/20"><Sparkles className="size-4 stroke-[1.5]" />Demander à Atlas</button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setSchedule('rdv')} className="flex items-center justify-center gap-1.5 rounded-2xl border border-border bg-surface py-3 text-xs font-bold text-foreground active:bg-muted"><CalendarPlus className="size-4 stroke-[1.5] text-primary" />Planifier un RDV</button>
          <button type="button" onClick={() => setSchedule('relance')} className="flex items-center justify-center gap-1.5 rounded-2xl border border-border bg-surface py-3 text-xs font-bold text-foreground active:bg-muted"><Bell className="size-4 stroke-[1.5] text-primary" />Programmer une relance</button>
        </div>

        {/* PIPELINE / STATUT */}
        <Section title="Statut">
          <div className="flex flex-col gap-3">
            {isProspect && (
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-2">
                  {PROSPECT_STAGES.map((s) => (
                    <button key={s.id} type="button" onClick={() => save({ prospectStage: s.id }, 'Étape mise à jour')}
                      className={cn('rounded-xl border px-3.5 py-2 text-xs font-bold transition-colors', c.prospectStage === s.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-surface text-foreground')}>{s.label}</button>
                  ))}
                </div>
                <p className="text-[10px] leading-relaxed text-muted-foreground">
                  <span className="font-bold text-foreground">{c.exposures} exposition{c.exposures > 1 ? 's' : ''}</span> · Worre vise 4-6 avant le closing (auto-comptées par les actions CRM).
                </p>
              </div>
            )}
            {isClient && <div className="rounded-xl bg-success/10 px-4 py-3 text-sm font-bold text-success">Client actif</div>}
            {isPartner && (
              <div className="flex flex-wrap gap-2">
                {PARTNER_STAGES.map((s) => (
                  <button key={s.id} type="button" onClick={() => save({ partnerStage: s.id }, 'Étape mise à jour')}
                    className={cn('rounded-xl border px-3.5 py-2 text-xs font-bold transition-colors', c.partnerStage === s.id ? 'border-violet bg-violet text-white' : 'border-border bg-surface text-foreground')}>{s.label}</button>
                ))}
              </div>
            )}

            {/* Conversions */}
            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              {isProspect && <>
                <button type="button" onClick={() => save({ convert: 'client' }, 'Converti en client')} className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-bold text-foreground active:bg-muted">Convertir en client <ArrowRight className="size-3" /></button>
                <button type="button" onClick={() => save({ convert: 'partenaire' }, 'Converti en partenaire')} className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-bold text-foreground active:bg-muted">Convertir en partenaire <ArrowRight className="size-3" /></button>
              </>}
              {isClient && <button type="button" onClick={() => save({ convert: 'partenaire' }, 'Converti en partenaire')} className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-bold text-foreground active:bg-muted">Convertir en partenaire (upsell) <ArrowRight className="size-3" /></button>}
              {isPartner && <p className="text-xs text-muted-foreground">Ses KPI viennent de son profil partenaire.</p>}
            </div>
          </div>
        </Section>

        {/* QUALIFICATION */}
        <Section title="Qualification">
          <div className="flex flex-col gap-4">
            {/* Couleur */}
            {perso ? (
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white" style={{ backgroundColor: perso.hex }}>{perso.label[0]}</span>
                  <div className="min-w-0 flex-1"><p className="text-xs font-bold text-foreground">{perso.label}</p><p className="text-xs leading-relaxed text-muted-foreground">{perso.desc}</p></div>
                  <button type="button" onClick={() => setEvalOpen(true)} className="text-xs font-medium text-primary">Réévaluer</button>
                </div>
                <div className="rounded-xl bg-muted/50 px-3 py-2.5"><p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Comment l'approcher</p><p className="text-xs leading-relaxed text-foreground">{perso.approach}</p></div>
              </div>
            ) : (
              <button type="button" onClick={() => setEvalOpen(true)} className="flex items-center gap-3 rounded-xl border border-dashed border-border p-3 text-left active:bg-muted">
                <Sparkles className="size-4 shrink-0 text-muted-foreground stroke-[1.5]" />
                <span className="flex-1 text-xs text-muted-foreground">Évaluer la personnalité (3 questions) →</span>
              </button>
            )}

            {/* Marché d'origine (état d'arrivée, lecture seule) */}
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Marché d'origine</p>
              {c.market ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1 text-xs font-bold text-foreground">
                  <span className="size-2 rounded-full" style={{ backgroundColor: MARCHE[c.market].hex }} />
                  Marché {MARCHE[c.market].label.toLowerCase()}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">Non défini — à renseigner dans « Modifier ».</span>
              )}
              <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">D'où vient ce contact (chaud = proches, tiède = connaissances, froid = inconnu). Fixé à l'arrivée.</p>
            </div>

            {/* Score dynamique */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Score d'opportunité <span className="text-[10px]">(auto)</span></p>
                <p className="text-xs font-bold text-foreground">{c.score} / 100</p>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${c.score}%` }} /></div>
            </div>
          </div>
        </Section>

        {/* COORDONNÉES */}
        <Section title="Coordonnées" action={<button type="button" onClick={() => setEditOpen(true)} className="text-xs font-medium text-primary"><Pencil className="mr-1 inline size-3" />Modifier</button>}>
          <div className="flex flex-col divide-y divide-border">
            {c.phone && <a href={`tel:${c.phone}`} className="flex items-center gap-3 py-2.5"><Phone className="size-4 shrink-0 stroke-[1.5] text-muted-foreground" /><span className="text-sm font-medium text-primary">{c.phone}</span></a>}
            {c.phone2 && <a href={`tel:${c.phone2}`} className="flex items-center gap-3 py-2.5"><Phone className="size-4 shrink-0 stroke-[1.5] text-muted-foreground" /><span className="text-sm font-medium text-primary">{c.phone2}</span></a>}
            {c.email && <a href={`mailto:${c.email}`} className="flex items-center gap-3 py-2.5"><Mail className="size-4 shrink-0 stroke-[1.5] text-muted-foreground" /><span className="truncate text-sm text-foreground">{c.email}</span></a>}
            {(c.address || c.city) && <div className="flex items-center gap-3 py-2.5"><MapPin className="size-4 shrink-0 stroke-[1.5] text-muted-foreground" /><span className="text-sm text-foreground">{[c.address, [c.postal, c.city].filter(Boolean).join(' '), c.country].filter(Boolean).join(', ')}</span></div>}
            {!c.phone && !c.phone2 && !c.email && !c.address && !c.city && <p className="py-2 text-sm text-muted-foreground">Aucune coordonnée. <button onClick={() => setEditOpen(true)} className="font-bold text-primary">Ajouter</button></p>}
          </div>
        </Section>

        {/* SUIVI */}
        <Section title="Suivi">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3"><Link2 className="size-4 shrink-0 stroke-[1.5] text-muted-foreground" /><span className="text-sm text-muted-foreground">Source · <span className="font-medium text-foreground">{SOURCE_LABEL[c.source] ?? c.source}</span></span></div>
            <div className="flex items-center gap-3"><Clock className="size-4 shrink-0 stroke-[1.5] text-muted-foreground" /><span className="text-sm text-muted-foreground">Dernier contact · <span className="font-medium text-foreground">{c.lastContact ? new Date(c.lastContact).toLocaleDateString('fr-FR') : 'jamais'}</span></span></div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Tag className="size-4 shrink-0 stroke-[1.5] text-muted-foreground" />
              {c.tags.map((t) => (
                <span key={t} className="flex items-center gap-1 rounded-lg bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">{t}
                  <button type="button" onClick={() => save({ tags: c.tags.filter((x) => x !== t) })}><X className="size-3" /></button>
                </span>
              ))}
              <input value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newTag.trim()) { save({ tags: [...c.tags, newTag.trim()] }); setNewTag('') } }}
                placeholder="+ tag" className="w-20 rounded-lg border border-dashed border-border bg-transparent px-2 py-1 text-xs text-foreground outline-none placeholder:text-muted-foreground" />
            </div>
          </div>
        </Section>

        {/* NOTE */}
        <Section title="Note" action={noteEditing
          ? <button type="button" onClick={() => { save({ note: noteDraft }, 'Note enregistrée'); setNoteEditing(false) }} className="rounded-lg bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">Enregistrer</button>
          : <button type="button" onClick={() => setNoteEditing(true)} className="text-xs font-medium text-primary"><Pencil className="mr-1 inline size-3" />Modifier</button>}>
          {noteEditing
            ? <textarea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} rows={3} autoFocus placeholder="Contexte, ce qu'il aime, ses objections… (Atlas s'en sert)" className="w-full resize-none bg-transparent text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground" />
            : c.note ? <p className="text-sm leading-relaxed text-muted-foreground">{c.note}</p>
            : <button type="button" onClick={() => setNoteEditing(true)} className="text-sm text-muted-foreground active:text-foreground"><Plus className="mr-1 inline size-3.5" />Ajouter une note</button>}
        </Section>

        {/* À VENIR (RDV + relances programmées) */}
        {(appointments.length > 0 || relances.length > 0) && (
          <Section title="À venir">
            <div className="flex flex-col gap-2">
              {appointments.map((a) => (
                <div key={a.id} className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3">
                  <CalendarPlus className="size-4 shrink-0 stroke-[1.5] text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{new Date(a.startAt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })} · {a.type}</p>
                  </div>
                </div>
              ))}
              {relances.map((r) => (
                <div key={r.id} className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3">
                  <Bell className="size-4 shrink-0 stroke-[1.5] text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">Relance · {r.channel}</p>
                    <p className="text-xs text-muted-foreground">{new Date(r.dueAt).toLocaleDateString('fr-FR')}{r.message ? ` · ${r.message}` : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* HISTORIQUE des interactions */}
        <Section title="Historique">
          {interactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune interaction pour l'instant. Tes actions (appel, message…) s'afficheront ici.</p>
          ) : (
            <ol className="flex flex-col gap-3">
              {interactions.map((it) => {
                const m = INTERACTION_META[it.type] ?? INTERACTION_META.AUTRE
                return (
                  <li key={it.id} className="flex items-start gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"><m.icon className="size-3.5 stroke-[1.5]" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{m.label}{it.direction === 'IN' ? ' reçu' : ''}{it.outcome ? ` · ${it.outcome.toLowerCase()}` : ''}</p>
                      {it.body && <p className="truncate text-xs text-muted-foreground">{it.body}</p>}
                      <p className="mt-0.5 text-[10px] text-muted-foreground">{new Date(it.createdAt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                    </div>
                    {it.isExposure && <span className="shrink-0 text-[10px] font-bold text-primary">+1 expo</span>}
                  </li>
                )
              })}
            </ol>
          )}
        </Section>
      </div>

      {editOpen && <EditSheet contact={c} onClose={() => setEditOpen(false)}
        onSave={(p) => { save(p, 'Contact mis à jour'); setEditOpen(false) }}
        onDelete={async () => {
          const res = await fetch(`/api/contacts/${id}`, { method: 'DELETE' })
          if (res.ok) { toast.success('Contact supprimé'); router.push('/contacts') } else toast.error('Échec de la suppression')
        }} />}
      {evalOpen && <PersoEval onClose={() => setEvalOpen(false)} onResult={(color) => { save({ personality: color }, `Personnalité : ${PERSO[color].label}`); setEvalOpen(false) }} />}
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
                  className="rounded-2xl border border-border bg-surface px-4 py-3.5 text-left text-sm font-medium text-foreground active:bg-muted">{l}</button>
              ))}
              <button type="button" onClick={() => setConfirm(null)} className="px-4 py-2 text-sm font-medium text-muted-foreground">Pas fait / annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
