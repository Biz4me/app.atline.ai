'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Check, Loader2, User as UserIcon, MapPin, Sparkles, Camera, Trash2, Share2 } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { Card } from '@/components/card'
import { PersonalityQuiz } from '@/components/personality-quiz'
import { toast } from 'sonner'

const PERSONALITY_COLORS: Record<string, string> = { ROUGE: '#EF4444', VERT: '#22C55E', BLEU: '#3B82F6', JAUNE: '#F4B342' }
const PERSONALITY_LABELS: Record<string, string> = { ROUGE: 'Rouge', VERT: 'Vert', BLEU: 'Bleu', JAUNE: 'Jaune' }

const EDUCATIONS = ['Primaire et secondaire', 'Supérieur court (Bac+2/3)', 'Supérieur long (Bac+5 et +)']
// Harmonise le genre sur M/F/N (rattrape les anciennes valeurs Homme/Femme/Autre)
const normGender = (g: string) => (g === 'Homme' ? 'M' : g === 'Femme' ? 'F' : g === 'Autre' || g === 'Neutre' ? 'N' : g)

const inputCls =
  'w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30'

const SOCIALS: { key: string; label: string; color: string; placeholder: string }[] = [
  { key: 'facebook',  label: 'Facebook',  color: '#1877F2', placeholder: 'facebook.com/ton-profil' },
  { key: 'instagram', label: 'Instagram', color: '#E4405F', placeholder: '@ton_pseudo' },
  { key: 'linkedin',  label: 'LinkedIn',  color: '#0A66C2', placeholder: 'linkedin.com/in/…' },
  { key: 'tiktok',    label: 'TikTok',    color: '#111111', placeholder: '@ton_pseudo' },
  { key: 'youtube',   label: 'YouTube',   color: '#FF0000', placeholder: 'ta chaîne' },
  { key: 'snapchat',  label: 'Snapchat',  color: '#FBC02D', placeholder: 'ton pseudo' },
  { key: 'telegram',  label: 'Telegram',  color: '#26A5E4', placeholder: '@ton_pseudo' },
  { key: 'whatsapp',  label: 'WhatsApp',  color: '#25D366', placeholder: 'ton numéro' },
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

function SectionHeader({ icon: Icon, title }: { icon: typeof UserIcon; title: string }) {
  return (
    <div className="flex items-center gap-2.5 border-b border-border px-4 py-3.5">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10">
        <Icon className="size-4 text-primary" />
      </span>
      <p className="text-sm font-semibold text-foreground">{title}</p>
    </div>
  )
}

export default function ProfileEditPage() {
  const router = useRouter()
  const [form, setForm] = useState<Form>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [quizOpen, setQuizOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let active = true
    fetch('/api/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => {
        if (!active || !u) { if (active) setLoading(false); return }
        setForm({
          firstName: u.firstName ?? '', lastName: u.lastName ?? '', username: u.username ?? '', email: u.email ?? '',
          gender: normGender(u.gender ?? ''), profession: u.profession ?? '', education: u.education ?? '', phone: u.phone ?? '', phone2: u.phone2 ?? '', photoUrl: u.photoUrl ?? '',
          address: u.address ?? '', address2: u.address2 ?? '', postal: u.postal ?? '', city: u.city ?? '', country: u.country ?? '',
          bio: u.bio ?? '', birthDate: u.birthDate ? String(u.birthDate).slice(0, 10) : '',
          personality: u.personality ?? '', locale: u.locale ?? 'fr',
          socials: (u.socials && typeof u.socials === 'object' && !Array.isArray(u.socials)) ? u.socials : {},
          coaching: (u.coaching && typeof u.coaching === 'object' && !Array.isArray(u.coaching)) ? u.coaching : {},
        })
        setLoading(false)
      })
      .catch(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const set = (k: keyof Form, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const setSocial = (k: string, v: string) => setForm((f) => ({ ...f, socials: { ...f.socials, [k]: v } }))
  const setCoaching = (k: string, v: string) => setForm((f) => ({ ...f, coaching: { ...f.coaching, [k]: v } }))

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
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) toast.success('Profil enregistré')
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

  // Complétion « connaissance Atlas » : champs à forte valeur pour le coaching
  const atlasFields = [form.personality, form.coaching.why, form.coaching.background, form.coaching.passions, form.coaching.audience, form.coaching.availability, form.coaching.level]
  const atlasFilled = atlasFields.filter((v) => v && String(v).trim()).length
  const atlasPct = Math.round((atlasFilled / atlasFields.length) * 100)

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* Header retour */}
      <div className="sticky top-0 z-10 flex items-center gap-2 bg-background px-2 py-3">
        <button type="button" onClick={() => router.back()} className="flex size-9 items-center justify-center rounded-full text-muted-foreground active:bg-muted">
          <ChevronLeft className="size-5" />
        </button>
        <h1 className="font-display text-lg font-semibold">Mon profil</h1>
      </div>

      {loading ? (
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-5 px-4 pb-28 pt-4">
          {/* Avatar uploadable + username */}
          <div className="flex items-center gap-4">
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
            <div className="min-w-0">
              {form.username && <p className="truncate text-sm font-medium text-muted-foreground">@{form.username}</p>}
              <p className="text-xs text-muted-foreground">Touchez la photo pour la changer</p>
            </div>
          </div>

          {/* Atlas te connaît à X% */}
          <div className="rounded-2xl border border-border bg-surface p-4 shadow-card">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Atlas te connaît à {atlasPct}%</p>
              <span className="text-xs font-bold text-primary">{atlasFilled}/{atlasFields.length}</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${atlasPct}%` }} />
            </div>
            {atlasPct < 100 && (
              <p className="mt-2 text-xs text-muted-foreground">Remplis ta couleur de personnalité et la section « Pour mieux te coacher » pour qu&apos;il t&apos;aide mieux.</p>
            )}
          </div>

          {/* Famille 1 — Identité */}
          <Card className="overflow-hidden p-0">
            <SectionHeader icon={UserIcon} title="Identité" />
            <div className="space-y-4 p-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Prénom"><input className={inputCls} value={form.firstName} onChange={(e) => set('firstName', e.target.value)} /></Field>
                <Field label="Nom"><input className={inputCls} value={form.lastName} onChange={(e) => set('lastName', e.target.value)} /></Field>
              </div>
              <Field label="Genre">
                <select className={inputCls} value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                  <option value="">—</option>
                  <option value="M">Homme</option>
                  <option value="F">Femme</option>
                  <option value="N">Neutre</option>
                </select>
              </Field>
              <Field label="Profession"><input className={inputCls} value={form.profession} onChange={(e) => set('profession', e.target.value)} placeholder="Ton activité principale" /></Field>
              <Field label="Niveau d'études">
                <select className={inputCls} value={form.education} onChange={(e) => set('education', e.target.value)}>
                  <option value="">—</option>
                  {EDUCATIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Téléphone"><input className={inputCls} type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="06 12 34 56 78" /></Field>
              <Field label="Téléphone secondaire"><input className={inputCls} type="tel" value={form.phone2} onChange={(e) => set('phone2', e.target.value)} placeholder="Optionnel" /></Field>
            </div>
          </Card>

          {/* Famille 2 — Adresse */}
          <Card className="overflow-hidden p-0">
            <SectionHeader icon={MapPin} title="Adresse" />
            <div className="space-y-4 p-4">
              <Field label="Adresse"><input className={inputCls} value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="N° et rue" /></Field>
              <Field label="Complément"><input className={inputCls} value={form.address2} onChange={(e) => set('address2', e.target.value)} placeholder="Bâtiment, étage…" /></Field>
              <div className="grid grid-cols-[1fr_2fr] gap-3">
                <Field label="Code postal"><input className={inputCls} value={form.postal} onChange={(e) => set('postal', e.target.value)} /></Field>
                <Field label="Ville"><input className={inputCls} value={form.city} onChange={(e) => set('city', e.target.value)} /></Field>
              </div>
              <Field label="Pays"><input className={inputCls} value={form.country} onChange={(e) => set('country', e.target.value)} placeholder="France" /></Field>
            </div>
          </Card>

          {/* Famille 3 — Profil perso */}
          <Card className="overflow-hidden p-0">
            <SectionHeader icon={Sparkles} title="Profil perso" />
            <div className="space-y-4 p-4">
              <Field label="Bio">
                <textarea className={`${inputCls} min-h-[88px] resize-none`} value={form.bio} onChange={(e) => set('bio', e.target.value)} placeholder="Quelques mots sur toi…" />
              </Field>
              <Field label="Date de naissance"><input className={inputCls} type="date" value={form.birthDate} onChange={(e) => set('birthDate', e.target.value)} /></Field>
              <div>
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Couleur de personnalité</span>
                {form.personality ? (
                  <div className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="size-6 rounded-full" style={{ backgroundColor: PERSONALITY_COLORS[form.personality] }} />
                      <span className="text-sm font-medium text-foreground">{PERSONALITY_LABELS[form.personality]}</span>
                    </div>
                    <button type="button" onClick={() => setQuizOpen(true)} className="text-sm font-semibold text-primary">Refaire le test</button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setQuizOpen(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary"
                  >
                    <Sparkles className="size-4" />
                    Découvre ta couleur (test)
                  </button>
                )}
              </div>
              <Field label="Langue">
                <select className={inputCls} value={form.locale} onChange={(e) => set('locale', e.target.value)}>
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                </select>
              </Field>
            </div>
          </Card>

          {/* Réseaux sociaux */}
          <Card className="overflow-hidden p-0">
            <SectionHeader icon={Share2} title="Réseaux sociaux" />
            <div className="space-y-3 p-4">
              {SOCIALS.map((s) => (
                <div key={s.key} className="flex items-center gap-2.5">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="w-[84px] shrink-0 text-sm text-muted-foreground">{s.label}</span>
                  <input
                    className={`${inputCls} min-w-0 flex-1`}
                    value={form.socials[s.key] ?? ''}
                    onChange={(e) => setSocial(s.key, e.target.value)}
                    placeholder={s.placeholder}
                  />
                </div>
              ))}
            </div>
          </Card>

          {/* Pour mieux te coacher (Atlas) */}
          <Card className="overflow-hidden p-0">
            <SectionHeader icon={Sparkles} title="Pour mieux te coacher" />
            <div className="space-y-4 p-4">
              <Field label="Ton pourquoi">
                <textarea className={`${inputCls} min-h-[72px] resize-none`} value={form.coaching.why ?? ''} onChange={(e) => setCoaching('why', e.target.value)} placeholder="Pourquoi tu fais ça ? (revenus, liberté, famille…)" />
              </Field>
              <Field label="Ton parcours">
                <textarea className={`${inputCls} min-h-[72px] resize-none`} value={form.coaching.background ?? ''} onChange={(e) => setCoaching('background', e.target.value)} placeholder="D'où tu viens (métier, expériences, forces)" />
              </Field>
              <Field label="Tes passions / centres d'intérêt">
                <input className={inputCls} value={form.coaching.passions ?? ''} onChange={(e) => setCoaching('passions', e.target.value)} placeholder="Sport, gaming, voyages… (séparés par des virgules)" />
              </Field>
              <Field label="Ton audience cible">
                <input className={inputCls} value={form.coaching.audience ?? ''} onChange={(e) => setCoaching('audience', e.target.value)} placeholder="À qui tu t'adresses (jeunes mamans, sportifs, étudiants…)" />
              </Field>
              <Field label="Ta disponibilité">
                <select className={inputCls} value={form.coaching.availability ?? ''} onChange={(e) => setCoaching('availability', e.target.value)}>
                  <option value="">—</option>
                  <option value="Temps plein">Temps plein</option>
                  <option value="Temps partiel">Temps partiel</option>
                  <option value="Quelques heures / semaine">Quelques heures / semaine</option>
                  <option value="Soirs & week-ends">Soirs &amp; week-ends</option>
                </select>
              </Field>
              <Field label="Ton niveau en MLM">
                <select className={inputCls} value={form.coaching.level ?? ''} onChange={(e) => setCoaching('level', e.target.value)}>
                  <option value="">—</option>
                  <option value="Débutant">Débutant</option>
                  <option value="Intermédiaire">Intermédiaire</option>
                  <option value="Confirmé">Confirmé</option>
                  <option value="Expert">Expert</option>
                </select>
              </Field>
            </div>
          </Card>

          {/* Zone danger */}
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 py-3 text-sm font-semibold text-destructive transition-colors active:bg-destructive/5"
          >
            <Trash2 className="size-4" /> Supprimer mon compte
          </button>
        </div>
      )}

      {/* Save bar */}
      {!loading && (
        <div className="fixed inset-x-0 bottom-0 z-[40] bg-background px-4 py-3">
          <div className="mx-auto max-w-2xl">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-base font-bold text-primary-foreground shadow-md transition-transform active:scale-[0.98] disabled:opacity-60"
            >
              {saving ? <Loader2 className="size-5 animate-spin" /> : <><Check className="size-5" />Enregistrer</>}
            </button>
          </div>
        </div>
      )}

      {quizOpen && (
        <PersonalityQuiz
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
              <p className="mt-1.5 text-sm text-muted-foreground">Cette action est définitive. Toutes tes données (contacts, activités, parrainage…) seront effacées et irrécupérables.</p>
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
              <button type="button" onClick={() => setConfirmDelete(false)} disabled={deleting} className="w-full py-2.5 text-sm font-medium text-muted-foreground">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
