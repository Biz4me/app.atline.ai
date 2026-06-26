'use client'

import { AppHeader } from '@/components/app-header'
import { Card, SectionTitle } from '@/components/card'
import {
  ShoppingBag, Share2, CalendarCheck, MessageSquare, Video,
  FileText, Link2, Bot, Copy, Check, ExternalLink, Plus, Trash2, Upload,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const quickLinks = [
  {
    id: 'boutique',
    icon: ShoppingBag,
    label: 'Ma boutique',
    desc: 'Partage tes produits',
    color: 'bg-primary/10 text-primary',
    url: 'https://boutique.atline.ai/lea-moreau',
  },
  {
    id: 'parrainage',
    icon: Share2,
    label: 'Lien parrainage',
    desc: 'Recrute ton équipe',
    color: 'bg-success/10 text-success',
    url: 'https://atline.ai/rejoindre/lea-moreau',
  },
  {
    id: 'rdv',
    icon: CalendarCheck,
    label: 'Prendre RDV',
    desc: 'Calendly intégré',
    color: 'bg-violet-50 text-violet-600',
    url: 'https://calendly.com/lea-moreau',
  },
  {
    id: 'whatsapp',
    icon: MessageSquare,
    label: 'WhatsApp',
    desc: 'Message direct',
    color: 'bg-emerald-50 text-emerald-600',
    url: 'https://wa.me/33612345678',
  },
  {
    id: 'zoom',
    icon: Video,
    label: 'Zoom',
    desc: 'Démonstration live',
    color: 'bg-blue-50 text-blue-600',
    url: 'https://zoom.us/j/lea-moreau',
  },
]

type Support = {
  id: string
  label: string
  type: string
  color: string
  uploaded?: boolean
}

const defaultSupports: Support[] = [
  { id: 's1', label: 'Présentation Atline', type: 'PDF · 2.4 MB', color: 'text-primary' },
  { id: 's2', label: 'Catalogue produits 2026', type: 'PDF · 5.1 MB', color: 'text-amber-500' },
  { id: 's3', label: 'Témoignages clients', type: 'PDF · 1.8 MB', color: 'text-success' },
  { id: 's4', label: 'Vidéo présentation 3 min', type: 'Lien vidéo', color: 'text-violet-500' },
]

const botLinks = [
  { id: 'wa-bot', platform: 'WhatsApp', desc: 'Bot de prospection automatique', active: true },
  { id: 'tg-bot', platform: 'Telegram', desc: 'Bot qualif + réponses FAQs', active: false },
]

function CopyableLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(url)
    setCopied(true)
    toast.success('Lien copié !')
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="mt-2 flex items-center gap-2 rounded-xl border border-border bg-muted px-3 py-2">
      <span className="flex-1 truncate text-xs font-medium text-foreground">{url}</span>
      <button
        type="button"
        onClick={handleCopy}
        className="shrink-0 rounded-lg p-1 text-primary transition-colors active:bg-primary/10"
      >
        {copied ? <Check className="size-3.5 stroke-2" /> : <Copy className="size-3.5 stroke-[1.5]" />}
      </button>
    </div>
  )
}

function formatFileType(file: File): string {
  const ext = file.name.split('.').pop()?.toUpperCase() ?? 'Fichier'
  const mb = (file.size / 1024 / 1024).toFixed(1)
  return `${ext} · ${mb} MB`
}

function fileColor(file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (['pdf'].includes(ext)) return 'text-primary'
  if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) return 'text-violet-500'
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'text-amber-500'
  return 'text-muted-foreground'
}

// ── Mobile Supports section avec upload ───────────────────────────────────────
function MobileSupports() {
  const [supports, setSupports] = useState<Support[]>(defaultSupports)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return

    setUploading(true)
    setTimeout(() => {
      const newSupports: Support[] = files.map((f) => ({
        id: `u-${Date.now()}-${f.name}`,
        label: f.name.replace(/\.[^.]+$/, ''),
        type: formatFileType(f),
        color: fileColor(f),
        uploaded: true,
      }))
      setSupports((prev) => [...prev, ...newSupports])
      setUploading(false)
      toast.success(`${files.length} fichier${files.length > 1 ? 's' : ''} ajouté${files.length > 1 ? 's' : ''}`)
      if (inputRef.current) inputRef.current.value = ''
    }, 800)
  }

  const remove = (id: string) => {
    setSupports((prev) => prev.filter((s) => s.id !== id))
    toast.success('Support supprimé')
  }

  return (
    <section>
      <SectionTitle>Supports de vente</SectionTitle>
      <Card className="divide-y divide-border p-0">
        {supports.map((s) => (
          <div key={s.id} className="flex w-full items-center gap-3 px-4 py-3.5">
            <FileText className={cn('size-5 shrink-0 stroke-[1.5]', s.color)} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{s.label}</p>
              <p className="text-xs text-muted-foreground">{s.type}</p>
            </div>
            {s.uploaded ? (
              <button
                type="button"
                onClick={() => remove(s.id)}
                className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors active:bg-muted active:text-destructive"
              >
                <Trash2 className="size-4 stroke-[1.5]" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => toast.info(`Ouvrir ${s.label}`)}
                className="shrink-0"
              >
                <ExternalLink className="size-4 text-muted-foreground" />
              </button>
            )}
          </div>
        ))}
      </Card>

      {/* Zone upload */}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.mp4,.mov"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={cn(
          'mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed py-3.5 text-sm font-semibold transition-colors',
          uploading
            ? 'border-primary/30 bg-primary/5 text-primary'
            : 'border-border text-muted-foreground active:bg-muted'
        )}
      >
        {uploading ? (
          <>
            <Upload className="size-4 animate-pulse" />
            Ajout en cours…
          </>
        ) : (
          <>
            <Plus className="size-4 stroke-2" />
            Ajouter un support
          </>
        )}
      </button>
    </section>
  )
}

// ── Contenu desktop (supports statiques) ─────────────────────────────────────
function DesktopSupports() {
  return (
    <section>
      <SectionTitle>Supports de vente</SectionTitle>
      <Card className="divide-y divide-border p-0">
        {defaultSupports.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => toast.info(`Ouvrir ${s.label}`)}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-muted"
          >
            <FileText className={cn('size-5 shrink-0 stroke-[1.5]', s.color)} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{s.label}</p>
              <p className="text-xs text-muted-foreground">{s.type}</p>
            </div>
            <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
          </button>
        ))}
      </Card>
    </section>
  )
}

function QuickLinksSection() {
  return (
    <section>
      <SectionTitle>Liens rapides</SectionTitle>
      <div className="flex flex-col gap-2">
        {quickLinks.map((link) => {
          const Icon = link.icon
          return (
            <Card key={link.id} className="p-4">
              <div className="flex items-center gap-3">
                <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', link.color)}>
                  <Icon className="size-5 stroke-[1.5]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground">{link.label}</p>
                  <p className="text-xs text-muted-foreground">{link.desc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => toast.info(`Ouvrir ${link.label}`)}
                  className="shrink-0 rounded-xl border border-border bg-surface p-2 transition-colors active:bg-muted"
                >
                  <ExternalLink className="size-4 stroke-[1.5] text-muted-foreground" />
                </button>
              </div>
              <CopyableLink url={link.url} />
            </Card>
          )
        })}
      </div>
    </section>
  )
}

function BotsSection() {
  return (
    <section>
      <SectionTitle>Bot de prospection</SectionTitle>
      <div className="flex flex-col gap-2">
        {botLinks.map((bot) => (
          <Card key={bot.id} className="flex items-center gap-3 p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
              <Bot className="size-5 stroke-[1.5] text-muted-foreground" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-foreground">{bot.platform}</p>
              <p className="text-xs text-muted-foreground">{bot.desc}</p>
            </div>
            <span className={cn(
              'rounded-full px-2.5 py-1 text-xs font-bold',
              bot.active ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'
            )}>
              {bot.active ? 'Actif' : 'Inactif'}
            </span>
          </Card>
        ))}
        <button
          type="button"
          onClick={() => toast.info('Configurer le bot')}
          className="rounded-2xl border border-dashed border-border py-3 text-sm font-semibold text-muted-foreground transition-colors active:bg-muted"
        >
          + Configurer un nouveau bot
        </button>
      </div>
    </section>
  )
}

export default function ToolboxPage() {
  return (
    <>
      {/* ── MOBILE ONLY ── */}
      <div className="lg:hidden">
        <AppHeader title="Boîte à outils" back />
        <div className="flex flex-col gap-5 px-4 pt-4 pb-8">
          <QuickLinksSection />
          <MobileSupports />
          <BotsSection />
        </div>
      </div>

      {/* ── DESKTOP ONLY ── */}
      <div className="hidden lg:block">
        <div className="px-8 pt-8 pb-8 max-w-5xl mx-auto">
          <h1 className="font-display text-[32px] font-extrabold tracking-tight text-foreground mb-6">
            Boîte à outils
          </h1>
          <div className="grid grid-cols-2 gap-6 items-start">
            {/* Colonne gauche */}
            <div className="flex flex-col gap-6">
              <QuickLinksSection />
              <BotsSection />
            </div>
            {/* Colonne droite */}
            <div className="flex flex-col gap-6">
              <MobileSupports />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
