'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronDown, Check, X, Loader2, User as UserIcon, Contact, Sparkles, Target, Camera, Trash2, Share2 } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { Card } from '@/components/card'
import { SelectMenu } from '@/components/select-menu'
import { AtlasSessionField } from '@/components/atlas-session-field'
import { PersonalityQuiz, describePersonality } from '@/components/personality-quiz'
import { toast } from 'sonner'
import type { IconType } from 'react-icons'
import { FaInstagram, FaFacebookF, FaTiktok, FaLinkedinIn, FaWhatsapp, FaYoutube, FaSnapchat, FaTelegram, FaXTwitter } from 'react-icons/fa6'

// Icônes de marque monochromes (respecte la règle des 7 couleurs — le glyphe suffit à identifier)
const SOCIAL_ICONS: Record<string, IconType> = {
  instagram: FaInstagram, facebook: FaFacebookF, tiktok: FaTiktok, linkedin: FaLinkedinIn,
  whatsapp: FaWhatsapp, youtube: FaYoutube, snapchat: FaSnapchat, telegram: FaTelegram, x: FaXTwitter,
}

const PERSONALITY_COLORS: Record<string, string> = { ROUGE: '#EF4444', VERT: '#22C55E', BLEU: '#3B82F6', JAUNE: '#F4B342' }

const EDUCATIONS = ['Primaire et secondaire', 'Supérieur court (Bac+2/3)', 'Supérieur long (Bac+5 et +)']

// Date de naissance en 3 déroulants (jour / mois / année) — style SelectMenu, sans calendrier
// Nombre de jours valides selon le mois/année (évite le « 31 février ») — 2000 = bissextile si pas d'année
const daysInMonth = (m: string, y: string) => {
  const mm = parseInt(m, 10)
  if (!mm) return 31
  return new Date(parseInt(y, 10) || 2000, mm, 0).getDate()
}
const DOB_MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
  .map((m, i) => ({ value: String(i + 1).padStart(2, '0'), label: m }))
const DOB_NOW_YEAR = new Date().getFullYear()
const DOB_YEARS = Array.from({ length: DOB_NOW_YEAR - 1924 }, (_, i) => ({ value: String(DOB_NOW_YEAR - i), label: String(DOB_NOW_YEAR - i) }))
const DRAFT_KEY = 'profile_draft_v1' // état en cours (saisie + rubrique ouverte), restauré au refresh (sessionStorage)
// Harmonise le genre sur M/F/N (rattrape les anciennes valeurs Homme/Femme/Autre)
const normGender = (g: string) => (g === 'Homme' ? 'M' : g === 'Femme' ? 'F' : g === 'Autre' || g === 'Neutre' ? 'N' : g)
// Masque téléphone FR : 10 chiffres groupés par 2 → « 06 12 34 56 78 »
const formatPhone = (raw: string) => raw.replace(/\D/g, '').slice(0, 10).replace(/(\d{2})(?=\d)/g, '$1 ').trim()

const inputCls =
  'w-full rounded-xl border border-border bg-background px-4 py-[7px] text-lg text-foreground outline-none placeholder:text-muted-foreground'

type Social = { key: string; label: string; color: string; placeholder: string }
// 5 principaux visibles + 4 optionnels repliés (le 0/9 décourageait)
const SOCIALS_MAIN: Social[] = [
  { key: 'instagram', label: 'Instagram', color: '#E4405F', placeholder: '@ton_pseudo' },
  { key: 'facebook',  label: 'Facebook',  color: '#1877F2', placeholder: 'facebook.com/ton-profil' },
  { key: 'tiktok',    label: 'TikTok',    color: '#111111', placeholder: '@ton_pseudo' },
  { key: 'linkedin',  label: 'LinkedIn',  color: '#0A66C2', placeholder: 'linkedin.com/in/…' },
  { key: 'whatsapp',  label: 'WhatsApp',  color: '#25D366', placeholder: 'ton numéro' },
]
const SOCIALS_MORE: Social[] = [
  { key: 'youtube',   label: 'YouTube',   color: '#FF0000', placeholder: 'ta chaîne' },
  { key: 'snapchat',  label: 'Snapchat',  color: '#FBC02D', placeholder: 'ton pseudo' },
  { key: 'telegram',  label: 'Telegram',  color: '#26A5E4', placeholder: '@ton_pseudo' },
  { key: 'x',         label: 'X',         color: '#111111', placeholder: '@ton_pseudo' },
]

type Form = {
  firstName: string; lastName: string; username: string; email: string
  gender: string; profession: string; education: string; phone: string; phone2: string; photoUrl: string
  address: string; address2: string; postal: string; city: string; country: string
  bio: string; birthDate: string; personality: string; locale: string
  socials: Record<string, string>
  coaching: Record<string, string>
}

const EMPTY: Form = {
  firstName: '', lastName: '', username: '', email: '',
  gender: '', profession: '', education: '', phone: '', phone2: '', photoUrl: '',
  address: '', address2: '', postal: '', city: '', country: '',
  bio: '', birthDate: '', personality: '', locale: 'fr',
  socials: {},
  coaching: {},
}

// Rubrique pliante : l'en-tête (icône + titre + chevron) ouvre/ferme le contenu
function Collapsible({ icon: Icon, title, filled, total, open, onToggle, children }: { icon: typeof UserIcon; title: string; filled: number; total: number; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  const done = total > 0 && filled >= total
  return (
    <Card className="overflow-hidden p-0">
      <button type="button" onClick={onToggle} className={`flex w-full items-center gap-2.5 px-4 py-3.5 ${open ? 'border-b border-border' : ''}`}>
        <Icon className="size-5 shrink-0 text-muted-foreground stroke-[1.5]" />
        <p className="flex-1 text-left text-lg font-semibold text-foreground">{title}</p>
        {done ? (
          <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#22C55E] text-white"><Check className="size-3.5" /></span>
        ) : (
          <span className="shrink-0 text-base font-semibold text-muted-foreground">{filled}/{total}</span>
        )}
        <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="space-y-4 p-4">
          {children}
        </div>
      )}
    </Card>
  )
}

// Zone de texte qui grandit avec le contenu → pas de barre de scroll
function AutoTextarea({ value, onChange, placeholder, className }: { value: string; onChange: (v: string) => void; placeholder: string; className: string }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [value])
  return (
    <textarea ref={ref} rows={1} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={className} />
  )
}

export default function ProfileEditPage() {
  const router = useRouter()
  const [form, setForm] = useState<Form>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [quizOpen, setQuizOpen] = useState(false)
  const [persoOpen, setPersoOpen] = useState(false)
  // Email en lecture seule : l'info « où le modifier » recouvre le champ au tap (comme un déroulant)
  const [emailInfo, setEmailInfo] = useState(false)
  useEffect(() => {
    if (!emailInfo) return
    const close = () => setEmailInfo(false)
    const onDown = (e: PointerEvent) => { if (!(e.target as HTMLElement)?.closest?.('[data-email-field]')) setEmailInfo(false) }
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('scroll', close, true)
    return () => { window.removeEventListener('pointerdown', onDown); window.removeEventListener('scroll', close, true) }
  }, [emailInfo])
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [moreSocials, setMoreSocials] = useState(false)
  // Rubriques pliantes — toutes fermées à l'arrivée (l'état réel est restauré au refresh)
  const [open, setOpen] = useState<Record<string, boolean>>({})
  // Accordéon exclusif : ouvrir une rubrique ferme les autres
  const toggle = (k: string) => setOpen((o) => ({ [k]: !o[k] }))

  useEffect(() => {
    // Restaure l'état en cours (saisie + rubrique ouverte) → survit au rafraîchissement
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY)
      if (raw) {
        const d = JSON.parse(raw)
        if (d && d.form) { setForm(d.form); initialUsername.current = d.form.username ?? ''; if (d.open && typeof d.open === 'object') setOpen(d.open); setLoading(false); return }
      }
    } catch { /* ignore */ }
    let active = true
    fetch('/api/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => {
        if (!active || !u) { if (active) setLoading(false); return }
        setForm({
          firstName: u.firstName ?? '', lastName: u.lastName ?? '', username: u.username ?? '', email: u.email ?? '',
          gender: normGender(u.gender ?? ''), profession: u.profession ?? '', education: u.education ?? '', phone: formatPhone(u.phone ?? ''), phone2: formatPhone(u.phone2 ?? ''), photoUrl: u.photoUrl ?? '',
          address: u.address ?? '', address2: u.address2 ?? '', postal: u.postal ?? '', city: u.city ?? '', country: u.country ?? '',
          bio: u.bio ?? '', birthDate: u.birthDate ? String(u.birthDate).slice(0, 10) : '',
          personality: u.personality ?? '', locale: u.locale ?? 'fr',
          socials: (u.socials && typeof u.socials === 'object' && !Array.isArray(u.socials)) ? u.socials : {},
          coaching: (u.coaching && typeof u.coaching === 'object' && !Array.isArray(u.coaching)) ? u.coaching : {},
        })
        initialUsername.current = u.username ?? ''
        setLoading(false)
      })
      .catch(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  // Persiste l'état (saisie + rubrique ouverte) à chaque changement → retrouvé tel quel au refresh
  useEffect(() => {
    if (loading) return
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ form, open })) } catch { /* ignore */ }
  }, [form, open, loading])

  const set = (k: keyof Form, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const setSocial = (k: string, v: string) => setForm((f) => ({ ...f, socials: { ...f.socials, [k]: v } }))
  const setCoaching = (k: string, v: string) => setForm((f) => ({ ...f, coaching: { ...f.coaching, [k]: v } }))

  // Date de naissance : 3 déroulants (jour / mois / année), recomposés en YYYY-MM-DD
  const [dob, setDob] = useState<{ d: string; m: string; y: string }>({ d: '', m: '', y: '' })
  const dobInit = useRef(false)
  useEffect(() => {
    if (!dobInit.current && form.birthDate) {
      const [y, m, d] = form.birthDate.split('-')
      setDob({ y: y ?? '', m: m ?? '', d: d ?? '' })
      dobInit.current = true
    }
  }, [form.birthDate])
  const setDobPart = (patch: Partial<{ d: string; m: string; y: string }>) => {
    const next = { ...dob, ...patch }
    if (next.d && parseInt(next.d, 10) > daysInMonth(next.m, next.y)) next.d = '' // jour invalide pour ce mois → réinitialisé
    setDob(next)
    set('birthDate', next.y && next.m && next.d ? `${next.y}-${next.m}-${next.d}` : '')
  }
  const dobDays = Array.from({ length: daysInMonth(dob.m, dob.y) }, (_, i) => ({ value: String(i + 1).padStart(2, '0'), label: String(i + 1) }))

  // Pseudo : vérif de dispo en direct (débounce) via /api/auth/username
  const [unameStatus, setUnameStatus] = useState<'idle' | 'checking' | 'ok' | 'taken' | 'invalid'>('idle')
  const unameTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initialUsername = useRef('')
  const onUsernameChange = (raw: string) => {
    const u = raw.toLowerCase().replace(/[^a-z0-9._]/g, '').slice(0, 20)
    set('username', u)
    if (unameTimer.current) clearTimeout(unameTimer.current)
    if (u === initialUsername.current) { setUnameStatus('idle'); return }
    if (u.length < 3) { setUnameStatus('invalid'); return }
    setUnameStatus('checking')
    unameTimer.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/auth/username?check=${encodeURIComponent(u)}`)
        const d = await r.json()
        setUnameStatus(!d.valid ? 'invalid' : d.available ? 'ok' : 'taken')
      } catch { setUnameStatus('idle') }
    }, 400)
  }

  // Avatar : redimensionne côté navigateur (carré 256px JPEG) puis stocke en data URL
  function handlePhoto(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new window.Image()
      img.onload = () => {
        const size = 256
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        const min = Math.min(img.width, img.height)
        ctx.drawImage(img, (img.width - min) / 2, (img.height - min) / 2, min, min, 0, 0, size, size)
        set('photoUrl', canvas.toDataURL('image/jpeg', 0.85))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  }

  async function save() {
    setSaving(true)
    try {
      // email se modifie dans Réglages › Connexion & sécurité — on ne le renvoie pas d'ici (éviter d'écraser un changement récent)
      const payload = { ...form }
      delete (payload as Partial<Form>).email
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        toast.success('Profil enregistré')
        initialUsername.current = form.username
        setUnameStatus('idle')
      }
      else if (res.status === 409) toast.error('Ce pseudo est déjà pris')
      else if (res.status === 400) toast.error('Pseudo invalide (3-20 caractères : a-z, 0-9, . _)')
      else toast.error('Échec de l’enregistrement')
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setSaving(false)
    }
  }

  async function doDelete() {
    setDeleting(true)
    try {
      const res = await fetch('/api/me', { method: 'DELETE' })
      if (res.ok) { await signOut({ callbackUrl: '/auth' }) }
      else { toast.error('Suppression impossible'); setDeleting(false) }
    } catch {
      toast.error('Erreur réseau')
      setDeleting(false)
    }
  }

  // Résultat du test couleur → enregistré immédiatement (Atlas s'en sert)
  async function savePersonality(color: string) {
    set('personality', color)
    try {
      await fetch('/api/me', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ personality: color }) })
      toast.success('Couleur enregistrée')
    } catch {
      toast.error('Erreur réseau')
    }
  }

  const initials = `${form.firstName[0] ?? ''}${form.lastName[0] ?? ''}`.toUpperCase()
  const pColor = form.personality ? PERSONALITY_COLORS[form.personality] : '#e5e7eb'

  // Remplissage par rubrique (compteur / coche sur les cartes)
  const nf = (vals: (string | undefined)[]) => vals.filter((v) => v && String(v).trim()).length
  const sec = {
    identite: nf([form.firstName, form.lastName, form.gender, form.birthDate, form.profession, form.education]),
    quitues: nf([form.bio, form.personality, form.coaching.passions]),
    coaching: nf([form.coaching.why, form.coaching.background, form.coaching.challenge, form.coaching.availability, form.coaching.level]),
    socials: SOCIALS_MAIN.filter((s) => form.socials[s.key] && String(form.socials[s.key]).trim()).length,
    adresse: nf([form.phone, form.address, form.postal, form.city, form.country]),
  }
  // Champs optionnels exclus du calcul (tél. secondaire, complément d'adresse) → 100 % réellement atteignable
  const tot = { identite: 6, quitues: 3, coaching: 5, socials: SOCIALS_MAIN.length, adresse: 5 }
  // Complétion = tout le profil (somme des rubriques) → le libellé « Profil complété » est honnête
  const totalFilled = sec.identite + sec.quitues + sec.coaching + sec.socials + sec.adresse
  const totalFields = tot.identite + tot.quitues + tot.coaching + tot.socials + tot.adresse
  const atlasPct = totalFields ? Math.round((totalFilled / totalFields) * 100) : 0

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* Header — titre centré + flèche retour (comme les pages du hub compte) */}
      <div className="sticky top-0 z-10 flex items-center justify-center bg-background/90 px-4 py-3 backdrop-blur" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
        <button type="button" onClick={() => router.back()} aria-label="Retour" className="absolute left-2 flex size-9 items-center justify-center rounded-full text-foreground active:bg-muted">
          <ChevronLeft className="size-5 stroke-[1.5]" />
        </button>
        <h1 className="text-lg font-semibold text-foreground">Profil</h1>
      </div>

      {loading ? (
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-5 px-4 pb-28 pt-4">
          {/* Avatar centré + nom */}
          <div className="flex flex-col items-center gap-2.5">
            <label className="relative cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhoto(f); e.target.value = '' }}
              />
              {form.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.photoUrl} alt="" className="size-20 shrink-0 rounded-full object-cover" />
              ) : (
                <div
                  className="grid size-20 shrink-0 place-items-center rounded-full text-2xl font-extrabold leading-none"
                  style={{ backgroundColor: pColor, color: form.personality ? '#fff' : '#6b7280' }}
                >
                  {initials || '?'}
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 grid size-7 place-items-center rounded-full bg-primary text-primary-foreground ring-2 ring-surface">
                <Camera className="size-3.5" />
              </span>
            </label>
            <p className="text-lg font-semibold text-foreground">{`${form.firstName} ${form.lastName}`.trim() || 'Ton profil'}</p>
            {form.photoUrl && (
              <button type="button" onClick={() => set('photoUrl', '')} className="text-xs font-medium text-muted-foreground transition-colors active:text-destructive">
                Retirer la photo
              </button>
            )}
          </div>

          {/* Complétion du profil — bandeau fin, sans carte */}
          <div className="px-1">
            <p className="mb-1.5 text-base font-semibold text-foreground">Profil complété à <span className="text-primary">{atlasPct}%</span></p>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${atlasPct}%` }} />
            </div>
          </div>

          {/* Cartes du profil — espacement resserré comme Formation (gap-2) */}
          <div className="flex flex-col gap-2">
          {/* 1 — Identité (état civil + contact) */}
          <Collapsible icon={UserIcon} title="Identité" filled={sec.identite} total={tot.identite} open={!!open.identite} onToggle={() => toggle('identite')}>
            <input className={inputCls} value={form.firstName} onChange={(e) => set('firstName', e.target.value)} placeholder="Prénom" />
            <input className={inputCls} value={form.lastName} onChange={(e) => set('lastName', e.target.value)} placeholder="Nom" />
            {/* Pseudo — modifiable, avec vérif de dispo en direct */}
            <div>
              <div className="relative flex items-center">
                <span className="pointer-events-none absolute left-4 text-lg text-muted-foreground">@</span>
                <input className={`${inputCls} pl-8 pr-10`} value={form.username} onChange={(e) => onUsernameChange(e.target.value)} placeholder="ton-pseudo" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2">
                  {unameStatus === 'checking' && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
                  {unameStatus === 'ok' && <Check className="size-4 text-[#22C55E]" />}
                  {(unameStatus === 'taken' || unameStatus === 'invalid') && <X className="size-4 text-destructive" />}
                </span>
              </div>
              {unameStatus === 'taken' && <p className="mt-1 px-1 text-xs text-destructive">Ce pseudo est déjà pris.</p>}
              {unameStatus === 'invalid' && <p className="mt-1 px-1 text-xs text-destructive">3-20 caractères : lettres, chiffres, . ou _</p>}
              {unameStatus === 'ok' && <p className="mt-1 px-1 text-xs text-[#22C55E]">Disponible</p>}
            </div>
            <SelectMenu className={inputCls} placeholder="Genre" value={form.gender} onChange={(v) => set('gender', v)} options={[{ value: 'M', label: 'Homme' }, { value: 'F', label: 'Femme' }, { value: 'N', label: 'Neutre' }]} />
            {/* Date de naissance — 3 déroulants (jour / mois / année), sans calendrier ni weekend */}
            <div className="grid grid-cols-[0.9fr_1.7fr_1.2fr] gap-2">
              <SelectMenu className={inputCls} placeholder="Jour" value={dob.d} onChange={(v) => setDobPart({ d: v })} options={dobDays} />
              <SelectMenu className={inputCls} placeholder="Mois" value={dob.m} onChange={(v) => setDobPart({ m: v })} options={DOB_MONTHS} />
              <SelectMenu className={inputCls} placeholder="Année" value={dob.y} onChange={(v) => setDobPart({ y: v })} options={DOB_YEARS} />
            </div>
            <input className={inputCls} value={form.profession} onChange={(e) => set('profession', e.target.value)} placeholder="Profession" />
            <SelectMenu className={inputCls} placeholder="Niveau d'études" value={form.education} onChange={(v) => set('education', v)} options={EDUCATIONS.map((o) => ({ value: o, label: o }))} />
          </Collapsible>

          {/* 2 — Coordonnées (tél + email + adresse) — aligné sur la fiche contact */}
          <Collapsible icon={Contact} title="Coordonnées" filled={sec.adresse} total={tot.adresse} open={!!open.adresse} onToggle={() => toggle('adresse')}>
            <input className={inputCls} type="tel" inputMode="numeric" value={form.phone} onChange={(e) => set('phone', formatPhone(e.target.value))} placeholder="Téléphone" />
            <input className={inputCls} type="tel" inputMode="numeric" value={form.phone2} onChange={(e) => set('phone2', formatPhone(e.target.value))} placeholder="Téléphone secondaire" />
            <div className="relative" data-email-field>
              <button type="button" onClick={() => setEmailInfo((o) => !o)} className={`${inputCls} flex items-center text-left`}>
                <span className={form.email ? 'truncate' : 'text-muted-foreground'}>{form.email || 'Email'}</span>
              </button>
              {emailInfo && (
                <div className="absolute inset-x-0 top-0 z-20 rounded-xl border border-border bg-background px-4 py-[7px] text-base leading-snug text-muted-foreground shadow-md">
                  Modifiable dans Réglages › Connexion &amp; sécurité
                </div>
              )}
            </div>
            <input className={inputCls} value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Adresse" />
            <input className={inputCls} value={form.address2} onChange={(e) => set('address2', e.target.value)} placeholder="Complément d'adresse" />
            <input className={inputCls} value={form.postal} onChange={(e) => set('postal', e.target.value)} placeholder="Code postal" />
            <input className={inputCls} value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="Ville" />
            <SelectMenu className={inputCls} placeholder="Pays" value={form.country} onChange={(v) => set('country', v)} options={[{ value: 'France', label: 'France' }, { value: 'Espagne', label: 'Espagne' }, { value: 'Allemagne', label: 'Allemagne' }, { value: 'Italie', label: 'Italie' }]} />
          </Collapsible>

          {/* 3 — Qui tu es (personnalité — sert le ton des agents) */}
          <Collapsible icon={Sparkles} title="Qui tu es" filled={sec.quitues} total={tot.quitues} open={!!open.quitues} onToggle={() => toggle('quitues')}>
            <AutoTextarea className={`${inputCls} min-h-[88px] resize-none overflow-hidden`} value={form.bio} onChange={(v) => set('bio', v)} placeholder="Bio — quelques mots sur toi…" />
            {form.personality ? (
              <div className="overflow-hidden rounded-xl border border-border bg-background">
                <div className="flex items-center gap-2.5 px-4 py-3">
                  <button type="button" onClick={() => setPersoOpen((o) => !o)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                    <span className="size-6 shrink-0 rounded-full" style={{ backgroundColor: PERSONALITY_COLORS[form.personality] }} />
                    <span className="flex-1 text-lg font-medium text-foreground">Personnalité</span>
                    <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform ${persoOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <button type="button" onClick={() => setQuizOpen(true)} className="shrink-0 text-base font-semibold text-primary">Refaire le test</button>
                </div>
                {persoOpen && (() => {
                  const info = describePersonality(form.personality, form.gender)
                  return info ? (
                    <div className="border-t border-border px-4 py-3">
                      <p className="text-lg font-semibold" style={{ color: info.color }}>{info.archetype}</p>
                      <p className="mt-1 text-lg leading-relaxed text-muted-foreground">{info.text}</p>
                    </div>
                  ) : null
                })()}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setQuizOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-3 text-base font-semibold text-primary"
              >
                <Sparkles className="size-4" />
                Découvre ta couleur (test)
              </button>
            )}
            <input className={inputCls} value={form.coaching.passions ?? ''} onChange={(e) => setCoaching('passions', e.target.value)} placeholder="Tes passions" />
          </Collapsible>

          {/* 4 — Ton coaching (contexte MLM pour Atlas) */}
          <Collapsible icon={Target} title="Ton coaching" filled={sec.coaching} total={tot.coaching} open={!!open.coaching} onToggle={() => toggle('coaching')}>
            {/* Le pourquoi = champ PROFOND : session avec Atlas (modèle de carte unifié) */}
            <AtlasSessionField title="Ton pourquoi" filled={!!form.coaching.why} onOpen={() => router.push('/atlas?session=why')}>
              <p className="whitespace-pre-wrap text-lg leading-relaxed text-foreground lg:text-sm">{form.coaching.why}</p>
            </AtlasSessionField>
            <AutoTextarea className={`${inputCls} min-h-[72px] resize-none overflow-hidden`} value={form.coaching.background ?? ''} onChange={(v) => setCoaching('background', v)} placeholder="Ton parcours" />
            <AutoTextarea className={`${inputCls} min-h-[72px] resize-none overflow-hidden`} value={form.coaching.challenge ?? ''} onChange={(v) => setCoaching('challenge', v)} placeholder="Ton principal défi — là où tu bloques en ce moment" />
            <SelectMenu className={inputCls} placeholder="Ta disponibilité" value={form.coaching.availability ?? ''} onChange={(v) => setCoaching('availability', v)} options={[{ value: 'Temps plein', label: 'Temps plein' }, { value: 'Temps partiel', label: 'Temps partiel' }, { value: 'Quelques heures / semaine', label: 'Quelques heures / semaine' }, { value: 'Soirs & week-ends', label: 'Soirs & week-ends' }]} />
            <SelectMenu className={inputCls} placeholder="Ton expérience en MLM" value={form.coaching.level ?? ''} onChange={(v) => setCoaching('level', v)} options={[{ value: 'Débutant', label: 'Débutant' }, { value: 'Intermédiaire', label: 'Intermédiaire' }, { value: 'Confirmé', label: 'Confirmé' }, { value: 'Expert', label: 'Expert' }]} />
          </Collapsible>

          {/* 5 — Réseaux sociaux (pour Nova) — 5 principaux + 4 optionnels */}
          <Collapsible icon={Share2} title="Réseaux sociaux" filled={sec.socials} total={tot.socials} open={!!open.socials} onToggle={() => toggle('socials')}>
            {[...SOCIALS_MAIN, ...(moreSocials ? SOCIALS_MORE : [])].map((s) => (
              <div key={s.key} className="flex items-center gap-2.5">
                {(() => { const Ico = SOCIAL_ICONS[s.key]; return Ico ? <Ico className="size-5 shrink-0 text-muted-foreground" /> : null })()}
                <span className="w-[100px] shrink-0 text-lg text-muted-foreground">{s.label}</span>
                <input
                  className={`${inputCls} min-w-0 flex-1`}
                  value={form.socials[s.key] ?? ''}
                  onChange={(e) => setSocial(s.key, e.target.value)}
                  placeholder={s.placeholder}
                />
              </div>
            ))}
            {!moreSocials && (
              <button type="button" onClick={() => setMoreSocials(true)} className="text-left text-base font-semibold text-primary">
                + Autres réseaux ({SOCIALS_MORE.length})
              </button>
            )}
          </Collapsible>

          </div>

          {/* Zone danger — séparée et discrète */}
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex items-center justify-center gap-1.5 text-base font-medium text-muted-foreground transition-colors active:text-destructive"
            >
              <Trash2 className="size-4" /> Supprimer mon compte
            </button>
          </div>
        </div>
      )}

      {/* Bouton Enregistrer flottant (même langage que le composeur) */}
      {!loading && (
        <div className="fixed inset-x-0 z-[48] px-4" style={{ bottom: 'max(20px, env(safe-area-inset-bottom))' }}>
          <button type="button" onClick={save} disabled={saving} className="mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-base font-bold text-primary-foreground shadow-lg transition-transform active:scale-[0.98] disabled:opacity-60">
            {saving ? <Loader2 className="size-5 animate-spin" /> : 'Enregistrer'}
          </button>
        </div>
      )}

      {quizOpen && (
        <PersonalityQuiz
          firstName={form.firstName}
          gender={form.gender}
          onClose={() => setQuizOpen(false)}
          onResult={(c) => { savePersonality(c); setQuizOpen(false) }}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 p-4" onClick={() => !deleting && setConfirmDelete(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-surface p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center">
              <span className="grid size-12 place-items-center rounded-full bg-destructive/10">
                <Trash2 className="size-6 text-destructive" />
              </span>
              <h2 className="mt-3 font-display text-lg font-semibold text-foreground">Supprimer ton compte ?</h2>
              <p className="mt-1.5 text-base text-muted-foreground">Cette action est définitive. Toutes tes données (contacts, activités, parrainage…) seront effacées et irrécupérables.</p>
            </div>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={doDelete}
                disabled={deleting}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-destructive py-3 text-base font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-60"
              >
                {deleting ? <Loader2 className="size-5 animate-spin" /> : 'Supprimer définitivement'}
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} disabled={deleting} className="w-full py-2.5 text-base font-medium text-muted-foreground">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
