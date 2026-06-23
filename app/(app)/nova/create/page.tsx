'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import {
  Heart,
  Package,
  Rocket,
  Camera,
  Briefcase,
  Globe,
  MessageCircle,
  Wand2,
  ImageUp,
  ScanLine,
  FolderUp,
  ImageOff,
  Check,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type PostType = 'lifestyle' | 'produit' | 'opportunite'

const STEPS = ['Type', 'Format', 'Sujet', 'Visuel', 'Génération']

const typeOptions: {
  id: PostType
  label: string
  ratio: string
  ratioColor: string
  desc: string
  icon: typeof Heart
  pillar: string
}[] = [
  { id: 'lifestyle', label: 'Lifestyle', ratio: '70%', ratioColor: 'text-success', pillarColor: 'bg-success', desc: 'Inspire et crée du lien', icon: Heart, pillar: 'Inspiration' },
  { id: 'produit', label: 'Produit', ratio: '20%', ratioColor: 'text-info', pillarColor: 'bg-info', desc: 'Montre la preuve sociale', icon: Package, pillar: 'Preuve sociale' },
  { id: 'opportunite', label: 'Opportunité', ratio: '10%', ratioColor: 'text-primary', pillarColor: 'bg-primary', desc: 'Présente le business', icon: Rocket, pillar: 'Vision' },
]

const platforms = [
  { id: 'instagram', label: 'Instagram', icon: Camera },
  { id: 'linkedin', label: 'LinkedIn', icon: Briefcase },
  { id: 'facebook', label: 'Facebook', icon: Globe },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
]

const formats = ['Reel', 'Carrousel', 'Story', 'Post texte', 'Vidéo']

export default function CreatePostPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [type, setType] = useState<PostType | null>(null)
  const [platform, setPlatform] = useState('instagram')
  const [format, setFormat] = useState('Reel')
  const [subject, setSubject] = useState('')
  const [visual, setVisual] = useState<'nova' | 'import' | 'none' | null>(null)
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)

  const selectedType = typeOptions.find((t) => t.id === type)

  function next() {
    if (step === 0 && !type) {
      toast.error('Choisis un type de contenu')
      return
    }
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1)
      if (step === 3 && !generated) runGeneration()
    } else {
      toast.success('Post publié et programmé')
      router.push('/nova')
    }
  }

  function back() {
    if (step === 0) router.back()
    else setStep((s) => s - 1)
  }

  function runGeneration() {
    setGenerating(true)
    setGenerated(false)
    setTimeout(() => {
      setGenerating(false)
      setGenerated(true)
    }, 1800)
  }

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Header + progress */}
      <header
        className="sticky top-0 z-30 border-b border-border bg-background/90 px-4 py-3 backdrop-blur"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={back}
            aria-label="Retour"
            className="-ml-1 flex size-9 items-center justify-center rounded-full text-fg-2 active:bg-muted"
          >
            <ChevronLeft className="size-5" />
          </button>
          <h1 className="font-display text-lg font-semibold">Créer un post</h1>
          <span className="ml-auto text-xs font-semibold text-muted-foreground">
            {step + 1} / {STEPS.length}
          </span>
        </div>
        <div className="mt-3 flex gap-1.5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors',
                i <= step ? 'bg-primary' : 'bg-border',
              )}
            />
          ))}
        </div>
      </header>

      <div className="flex-1 px-4 py-5 pb-32">
        {/* Step 1 — Type */}
        {step === 0 && (
          <Step title="Quel type de contenu ?" subtitle="L’équilibre 70/20/10 garde ton feed naturel.">
            <div className="flex flex-col gap-3">
              {typeOptions.map((o) => {
                const Icon = o.icon
                const active = type === o.id
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setType(o.id)}
                    className={cn(
                      'flex items-center gap-3 rounded-2xl border bg-surface p-4 text-left shadow-card transition-colors',
                      active ? 'border-primary ring-1 ring-primary' : 'border-border active:bg-muted',
                    )}
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                      <Icon className="size-5 stroke-[1.5]" />
                    </span>
                    <span className="flex-1">
                      <span className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground">{o.label}</span>
                        <span className={cn('text-xs font-bold', o.ratioColor)}>{o.ratio}</span>
                      </span>
                      <span className="block text-xs text-muted-foreground">{o.desc}</span>
                    </span>
                    {active && <Check className="size-5 text-primary" />}
                  </button>
                )
              })}
            </div>
          </Step>
        )}

        {/* Step 2 — Format */}
        {step === 1 && (
          <Step title="Plateforme et format" subtitle="Pilier présélectionné selon ton type de contenu.">
            <div className="flex flex-col gap-5">
              <div>
                <p className="eyebrow mb-2">Plateforme</p>
                <div className="grid grid-cols-4 gap-2">
                  {platforms.map((p) => {
                    const Icon = p.icon
                    const active = platform === p.id
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPlatform(p.id)}
                        className={cn(
                          'flex flex-col items-center gap-1.5 rounded-xl border bg-surface py-3 text-xs font-semibold transition-colors',
                          active ? 'border-primary text-primary' : 'border-border text-fg-2',
                        )}
                      >
                        <Icon className="size-5 stroke-[1.5]" />
                        {p.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <p className="eyebrow mb-2">Format</p>
                <div className="flex flex-wrap gap-2">
                  {formats.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFormat(f)}
                      className={cn(
                        'rounded-full px-4 py-1.5 text-sm font-semibold transition-colors',
                        format === f ? 'bg-primary/10 text-primary' : 'border border-border bg-surface text-fg-2',
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="eyebrow mb-2">Pilier éditorial</p>
                <div className="flex items-center gap-2 rounded-xl border border-border bg-accent/60 p-3">
                  <span className={`size-2.5 rounded-full ${selectedType?.pillarColor ?? 'bg-success'}`} />
                  <span className="text-sm font-bold text-foreground">
                    {selectedType?.pillar ?? 'Inspiration'}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">Présélectionné</span>
                </div>
              </div>
            </div>
          </Step>
        )}

        {/* Step 3 — Subject */}
        {step === 2 && (
          <Step title="De quoi veux-tu parler ?" subtitle="Optionnel — laisse vide et Nova trouve un sujet pour toi.">
            <textarea
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              rows={5}
              placeholder="Ex. Comment je gère mon énergie entre mon job et mon business…"
              className="w-full resize-none rounded-2xl border border-border bg-surface p-4 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            />
          </Step>
        )}

        {/* Step 4 — Visual */}
        {step === 3 && (
          <Step title="Et le visuel ?" subtitle="Choisis comment habiller ton post.">
            <div className="flex flex-col gap-3">
              <VisualOption
                active={visual === 'nova'}
                onClick={() => setVisual('nova')}
                icon={Wand2}
                title="Générer avec Nova"
                desc="Une image sur mesure en quelques secondes"
              />
              <VisualOption
                active={visual === 'import'}
                onClick={() => setVisual('import')}
                icon={ImageUp}
                title="Importer un visuel"
                desc="Depuis ton téléphone"
              />
              <VisualOption
                active={visual === 'none'}
                onClick={() => setVisual('none')}
                icon={ImageOff}
                title="Sans visuel"
                desc="Texte uniquement"
              />

              {visual === 'import' && (
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <ImportButton icon={ImageUp} label="Galerie" />
                  <ImportButton icon={FolderUp} label="Fichiers" />
                  <ImportButton icon={ScanLine} label="Scanner" />
                </div>
              )}
            </div>
          </Step>
        )}

        {/* Step 5 — Generation + preview */}
        {step === 4 && (
          <Step title="Ton post est prêt" subtitle="Relis, ajuste, puis publie ou programme.">
            {generating ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface py-16">
                <span className="flex size-12 animate-pulse items-center justify-center rounded-full bg-accent text-accent-foreground">
                  <Wand2 className="size-6" />
                </span>
                <p className="text-sm font-semibold text-foreground">Nova rédige ton post…</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
                <div className="flex aspect-square items-center justify-center bg-accent">
                  {visual === 'none' ? (
                    <ImageOff className="size-10 text-accent-foreground/50" />
                  ) : (
                    <Wand2 className="size-10 text-accent-foreground" />
                  )}
                </div>
                <div className="p-4">
                  <p className="text-sm leading-relaxed text-foreground">
                    {subject
                      ? subject
                      : 'Ce matin je me suis levée avec une seule question : et si aujourd’hui je faisais un pas de plus vers ma liberté ? Voici ma routine pour rester focus…'}
                  </p>
                  <p className="mt-2 text-xs text-info">#mindset #entrepreneuriat #liberté</p>
                </div>
              </div>
            )}
          </Step>
        )}
      </div>

      {/* Fixed continue button */}
      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 p-4 backdrop-blur lg:left-60"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <button
          type="button"
          onClick={next}
          disabled={generating}
          className="w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          {step === STEPS.length - 1 ? 'Publier le post' : 'Continuer'}
        </button>
      </div>
    </div>
  )
}

function Step({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-2xl font-semibold text-foreground text-balance">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">{subtitle}</p>
      </div>
      {children}
    </div>
  )
}

function VisualOption({
  active,
  onClick,
  icon: Icon,
  title,
  desc,
}: {
  active: boolean
  onClick: () => void
  icon: typeof Wand2
  title: string
  desc: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-2xl border bg-surface p-4 text-left shadow-card transition-colors',
        active ? 'border-primary ring-1 ring-primary' : 'border-border active:bg-muted',
      )}
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
        <Icon className="size-5 stroke-[1.5]" />
      </span>
      <span className="flex-1">
        <span className="block text-sm font-bold text-foreground">{title}</span>
        <span className="block text-xs text-muted-foreground">{desc}</span>
      </span>
      {active && <Check className="size-5 text-primary" />}
    </button>
  )
}

function ImportButton({ icon: Icon, label }: { icon: typeof ImageUp; label: string }) {
  return (
    <button
      type="button"
      onClick={() => toast(`${label} — bientôt disponible`)}
      className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-surface py-4 text-xs font-semibold text-fg-2 transition-colors active:bg-muted"
    >
      <Icon className="size-5 stroke-[1.5]" />
      {label}
    </button>
  )
}
