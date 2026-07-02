'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { ChevronLeft, ChevronRight, ChevronDown, MessageCircle, Send, Check, Sun, Moon, Monitor, Trash2, LifeBuoy } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const TITLES: Record<string, string> = {
  'preferences':               'Préférences',
  'securite':                  'Connexion & sécurité',
  'profil':                    'Profil',
  'notifications':             'Notifications',
  'comptes-lies':              'Comptes liés',
  'parrainage':                'Parrainage',
  'confidentialite':           'Confidentialité',
  'centre-aide':               "Centre d'aide",
  'contact':                   'Contact et remarques',
}

// ── Petit toggle réutilisable ──
function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} aria-pressed={on}
      className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200', on ? 'bg-primary' : 'bg-muted')}>
      <span className="absolute left-1 top-1 size-4 rounded-full bg-white shadow transition-transform duration-200" style={{ transform: on ? 'translateX(20px)' : 'translateX(0)' }} />
    </button>
  )
}

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <h2 className="mb-2 px-1 text-base font-semibold text-muted-foreground">{children}</h2>
)
const Sheet = ({ children }: { children: React.ReactNode }) => (
  <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">{children}</div>
)

// ── Préférences ──
function Preferences() {
  const { theme = 'system', setTheme } = useTheme()
  const [locale, setLocale] = useState('fr')
  const THEMES = [{ v: 'light', label: 'Clair', icon: Sun }, { v: 'dark', label: 'Sombre', icon: Moon }, { v: 'system', label: 'Système', icon: Monitor }]
  const LANGS = [{ v: 'fr', label: 'Français' }, { v: 'en', label: 'English' }]
  const setLang = (v: string) => {
    setLocale(v)
    fetch('/api/me', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ locale: v }) }).catch(() => {})
  }
  return (
    <div className="flex flex-col gap-6 px-4 pt-5 pb-8">
      <section>
        <Eyebrow>Apparence</Eyebrow>
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map(({ v, label, icon: Icon }) => {
            const active = theme === v
            return (
              <button key={v} type="button" onClick={() => setTheme(v)}
                className={cn('flex flex-col items-center gap-2 rounded-2xl border py-4 transition-colors', active ? 'border-primary bg-primary/5' : 'border-border bg-surface active:bg-muted')}>
                <Icon className={cn('size-6', active ? 'text-primary' : 'text-muted-foreground')} />
                <span className={cn('text-base font-medium', active ? 'text-primary' : 'text-foreground')}>{label}</span>
              </button>
            )
          })}
        </div>
      </section>
      <section>
        <Eyebrow>Langue</Eyebrow>
        <Sheet>
          {LANGS.map((l) => (
            <button key={l.v} type="button" onClick={() => setLang(l.v)} className="flex w-full items-center px-4 py-4 active:bg-muted">
              <span className="flex-1 text-left text-lg text-foreground">{l.label}</span>
              {locale === l.v && <Check className="size-5 text-primary" />}
            </button>
          ))}
        </Sheet>
      </section>
    </div>
  )
}

// ── Notifications (préférences de réception) ──
function NotifPrefs() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({ contacts: true, messages: true, commissions: true, atlas: true, communaute: false })
  const ITEMS = [
    { k: 'contacts', label: 'Nouveaux contacts', desc: 'Réponses, inscriptions via ton lien' },
    { k: 'messages', label: 'Messages', desc: 'Nouveaux messages directs' },
    { k: 'commissions', label: 'Commissions', desc: 'Gains, paliers, Fast Start' },
    { k: 'atlas', label: 'Rappels Atlas', desc: 'Relances et plan du jour' },
    { k: 'communaute', label: 'Communauté', desc: 'Réponses et mentions' },
  ]
  const toggle = (k: string) => setPrefs((p) => ({ ...p, [k]: !p[k] }))
  return (
    <div className="flex flex-col gap-3 px-4 pt-5 pb-8">
      <p className="px-1 text-base text-muted-foreground">Choisis ce qu&apos;Atline t&apos;envoie. Tu retrouves tout dans la cloche.</p>
      <Sheet>
        {ITEMS.map((it) => (
          <div key={it.k} className="flex items-center gap-3 px-4 py-3.5">
            <div className="min-w-0 flex-1">
              <p className="text-lg font-medium text-foreground">{it.label}</p>
              <p className="text-base text-muted-foreground">{it.desc}</p>
            </div>
            <Toggle on={!!prefs[it.k]} onToggle={() => toggle(it.k)} />
          </div>
        ))}
      </Sheet>
    </div>
  )
}

// ── Confidentialité ──
function Privacy() {
  const [p, setP] = useState<Record<string, boolean>>({ profil: true, stats: false, classement: true })
  const ITEMS = [
    { k: 'profil', label: 'Profil visible dans la communauté', desc: 'Ton nom et ta photo apparaissent aux autres membres' },
    { k: 'stats', label: 'Partager mes statistiques', desc: 'Volume et progression visibles par ton parrain' },
    { k: 'classement', label: 'Apparaître dans les classements', desc: 'Ton nom peut figurer dans les tops de la communauté' },
  ]
  const toggle = (k: string) => setP((x) => ({ ...x, [k]: !x[k] }))
  return (
    <div className="flex flex-col gap-5 px-4 pt-5 pb-8">
      <Sheet>
        {ITEMS.map((it) => (
          <div key={it.k} className="flex items-center gap-3 px-4 py-3.5">
            <div className="min-w-0 flex-1">
              <p className="text-lg font-medium text-foreground">{it.label}</p>
              <p className="text-base text-muted-foreground">{it.desc}</p>
            </div>
            <Toggle on={!!p[it.k]} onToggle={() => toggle(it.k)} />
          </div>
        ))}
      </Sheet>
      <Link href="/profile/edit" className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-4 active:bg-muted">
        <Trash2 className="size-5 shrink-0 text-destructive" />
        <span className="flex-1 text-lg font-medium text-destructive">Supprimer mon compte</span>
        <ChevronRight className="size-5 text-muted-foreground" />
      </Link>
    </div>
  )
}

// ── Centre d'aide (FAQ) ──
const FAQ = [
  { q: 'Comment ajouter un contact ?', a: 'Ouvre Contacts depuis le menu, puis le bouton « + » en haut à droite. Tu peux aussi importer un fichier ou laisser Atlas qualifier tes prospects.' },
  { q: 'À quoi sert Atlas ?', a: "Atlas est ton coach IA : il te donne ton plan du jour, ton prochain pas, prépare tes relances et répond à tes questions. Écris-lui depuis le composeur en bas de l'écran." },
  { q: 'Comment gérer plusieurs activités ?', a: 'Ouvre le switcher en haut du menu (ton activité en cours), puis « + Ajouter une activité ». Tu bascules entre elles à tout moment et « Gérer » ouvre le détail.' },
  { q: 'Comment fonctionnent les commissions ?', a: 'Tes gains apparaissent dans les notifications et le tableau de bord. Le détail dépend du plan de rémunération de ton activité.' },
  { q: 'Comment inviter un filleul ?', a: 'Va dans Parrainage depuis ton compte : tu y trouves ton lien et ton code à partager.' },
]
function Help() {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <div className="flex flex-col gap-3 px-4 pt-5 pb-8">
      <Sheet>
        {FAQ.map((f, i) => {
          const isOpen = open === i
          return (
            <div key={i}>
              <button type="button" onClick={() => setOpen(isOpen ? null : i)} className="flex w-full items-center gap-3 px-4 py-4 text-left active:bg-muted">
                <span className="flex-1 text-lg font-medium text-foreground">{f.q}</span>
                <ChevronDown className={cn('size-5 shrink-0 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
              </button>
              {isOpen && <p className="px-4 pb-4 text-base leading-relaxed text-muted-foreground">{f.a}</p>}
            </div>
          )
        })}
      </Sheet>
      <Link href="/settings/contact" className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-4 active:bg-muted">
        <LifeBuoy className="size-5 shrink-0 text-primary" />
        <span className="flex-1 text-lg font-medium text-foreground">Contacter le support</span>
        <ChevronRight className="size-5 text-muted-foreground" />
      </Link>
    </div>
  )
}

// ── Contact & remarques ──
function ContactForm() {
  const [type, setType] = useState('Suggestion')
  const [msg, setMsg] = useState('')
  const [sending, setSending] = useState(false)
  const TYPES = ['Bug', 'Suggestion', 'Question']
  const send = async () => {
    if (!msg.trim()) return
    setSending(true)
    try {
      await fetch('/api/feedback', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type, message: msg }) }).catch(() => {})
      toast.success('Merci ! Ton message est bien envoyé.')
      setMsg('')
    } finally { setSending(false) }
  }
  return (
    <div className="flex flex-col gap-5 px-4 pt-5 pb-8">
      <section>
        <Eyebrow>Type</Eyebrow>
        <div className="grid grid-cols-3 gap-2">
          {TYPES.map((t) => (
            <button key={t} type="button" onClick={() => setType(t)}
              className={cn('rounded-xl border py-3 text-base font-medium transition-colors', type === t ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-surface text-foreground active:bg-muted')}>
              {t}
            </button>
          ))}
        </div>
      </section>
      <section>
        <Eyebrow>Ton message</Eyebrow>
        <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={6} placeholder="Décris ton retour, une idée, un souci…"
          className="w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-lg text-foreground outline-none placeholder:text-muted-foreground focus:border-muted-foreground/40" />
      </section>
      <button type="button" onClick={send} disabled={!msg.trim() || sending}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-base font-bold text-primary-foreground shadow-sm transition-opacity active:opacity-90 disabled:opacity-40">
        <Send className="size-4" />{sending ? 'Envoi…' : 'Envoyer'}
      </button>
    </div>
  )
}

// ── Comptes liés (intégrations) ──
const INTEGRATIONS = [
  { id: 'whatsapp', label: 'WhatsApp', desc: 'Bot de prospection automatique', icon: MessageCircle, connected: true },
  { id: 'telegram', label: 'Telegram', desc: 'Bot de qualification + réponses FAQ', icon: Send, connected: false },
]
function LinkedAccounts() {
  return (
    <div className="flex flex-col gap-3 px-4 pt-5 pb-8">
      <p className="px-1 text-base text-muted-foreground">Connecte tes outils de prospection et de communication.</p>
      {INTEGRATIONS.map((it) => (
        <div key={it.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground"><it.icon className="size-5 stroke-[1.5]" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold text-foreground">{it.label}</p>
            <p className="text-base text-muted-foreground">{it.desc}</p>
          </div>
          {it.connected
            ? <span className="flex shrink-0 items-center gap-1 text-base font-bold text-success"><Check className="size-4" />Connecté</span>
            : <button type="button" className="shrink-0 rounded-xl bg-primary px-3.5 py-2 text-base font-bold text-primary-foreground active:opacity-90">Connecter</button>}
        </div>
      ))}
    </div>
  )
}

// ── Connexion & sécurité (email + mot de passe) ──
function Security() {
  const [email, setEmail] = useState('')
  const [hasPassword, setHasPassword] = useState(false)
  const [savingEmail, setSavingEmail] = useState(false)
  const [cur, setCur] = useState('')
  const [nw, setNw] = useState('')
  const [cf, setCf] = useState('')
  const [savingPw, setSavingPw] = useState(false)

  useEffect(() => {
    fetch('/api/me').then((r) => (r.ok ? r.json() : null)).then((u) => {
      if (u) { setEmail(u.email ?? ''); setHasPassword(!!u.hasPassword) }
    }).catch(() => {})
  }, [])

  const input = 'w-full rounded-xl border border-border bg-background px-4 py-[7px] text-lg text-foreground outline-none placeholder:text-muted-foreground'

  const saveEmail = async () => {
    const e = email.trim().toLowerCase()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) { toast.error('Email invalide'); return }
    setSavingEmail(true)
    try {
      const r = await fetch('/api/me', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: e }) })
      if (r.ok) toast.success('Email mis à jour')
      else if (r.status === 409) toast.error('Cet email est déjà utilisé')
      else toast.error('Email invalide')
    } catch { toast.error('Erreur réseau') } finally { setSavingEmail(false) }
  }

  const savePw = async () => {
    if (nw.length < 8) { toast.error('8 caractères minimum'); return }
    if (nw !== cf) { toast.error('Les mots de passe ne correspondent pas'); return }
    setSavingPw(true)
    try {
      const r = await fetch('/api/me/password', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ current: cur, next: nw }) })
      if (r.ok) { toast.success(hasPassword ? 'Mot de passe changé' : 'Mot de passe défini'); setCur(''); setNw(''); setCf(''); setHasPassword(true) }
      else if (r.status === 403) toast.error('Mot de passe actuel incorrect')
      else if (r.status === 400) toast.error('8 caractères minimum')
      else toast.error('Échec')
    } catch { toast.error('Erreur réseau') } finally { setSavingPw(false) }
  }

  return (
    <div className="flex flex-col gap-6 px-4 pt-5 pb-8">
      <section>
        <Eyebrow>Adresse email</Eyebrow>
        <div className="flex flex-col gap-2">
          <input className={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ton@email.com" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
          <button type="button" onClick={saveEmail} disabled={savingEmail} className="self-end rounded-xl bg-primary px-5 py-2.5 text-base font-bold text-primary-foreground active:opacity-90 disabled:opacity-60">
            {savingEmail ? 'Enregistrement…' : 'Mettre à jour l’email'}
          </button>
        </div>
      </section>

      <section>
        <Eyebrow>{hasPassword ? 'Changer le mot de passe' : 'Définir un mot de passe'}</Eyebrow>
        <div className="flex flex-col gap-2">
          {hasPassword && <input className={input} type="password" value={cur} onChange={(e) => setCur(e.target.value)} placeholder="Mot de passe actuel" />}
          <input className={input} type="password" value={nw} onChange={(e) => setNw(e.target.value)} placeholder="Nouveau mot de passe (8 car. min.)" />
          <input className={input} type="password" value={cf} onChange={(e) => setCf(e.target.value)} placeholder="Confirmer le nouveau" />
          <button type="button" onClick={savePw} disabled={savingPw} className="self-end rounded-xl bg-primary px-5 py-2.5 text-base font-bold text-primary-foreground active:opacity-90 disabled:opacity-60">
            {savingPw ? 'Enregistrement…' : hasPassword ? 'Changer le mot de passe' : 'Définir le mot de passe'}
          </button>
        </div>
      </section>
    </div>
  )
}

export default function SettingsSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const router = useRouter()
  const { section } = use(params)
  const title = TITLES[section] ?? 'Paramètres'

  return (
    <div
      className="lg:hidden fixed inset-0 z-[70] mx-auto max-w-[480px] bg-background overflow-y-auto animate-slide-in-right"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-10 relative flex items-center justify-center bg-background/90 px-4 py-3 backdrop-blur"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <button
          type="button"
          onClick={() => router.back()}
          className="absolute left-2 flex size-9 items-center justify-center rounded-full text-foreground active:bg-muted"
        >
          <ChevronLeft className="size-5 stroke-[1.5]" />
        </button>
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      </div>

      {section === 'comptes-lies' ? <LinkedAccounts />
        : section === 'securite' ? <Security />
        : section === 'preferences' ? <Preferences />
        : section === 'notifications' ? <NotifPrefs />
        : section === 'confidentialite' ? <Privacy />
        : section === 'centre-aide' ? <Help />
        : section === 'contact' ? <ContactForm />
        : (
          <div className="flex flex-col items-center justify-center px-6 pt-20 text-center">
            <p className="text-lg text-muted-foreground">Bientôt disponible</p>
          </div>
        )}
    </div>
  )
}
