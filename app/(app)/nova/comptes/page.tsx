'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Camera, Music2, User, Copy, Sparkles, Loader2, Lock, Check } from 'lucide-react'
import { toast } from 'sonner'

const NOVA = '#8B5CF6'

type Kit = { bio: string; handles: string[]; linkCta: string; content: string }
type FullKit = { instagram?: Kit; tiktok?: Kit }

const PLATFORMS: { key: 'instagram' | 'tiktok'; name: string; icon: typeof Camera }[] = [
  { key: 'instagram', name: 'Instagram', icon: Camera },
  { key: 'tiktok', name: 'TikTok', icon: Music2 },
]

function copy(text: string) {
  navigator.clipboard?.writeText(text).then(
    () => toast.success('Copié'),
    () => toast.error('Copie impossible'),
  )
}

function CopyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="eyebrow mb-1">{label}</p>
      <button
        type="button"
        onClick={() => copy(value)}
        className="flex w-full items-start gap-2 rounded-xl border border-border bg-background p-3 text-left active:bg-muted"
      >
        <span className="flex-1 whitespace-pre-line text-sm text-foreground">{value}</span>
        <Copy className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      </button>
    </div>
  )
}

export default function ComptesPage() {
  const router = useRouter()
  const [kit, setKit] = useState<FullKit | null>(null)
  const [loading, setLoading] = useState(false)

  async function generate() {
    setLoading(true)
    try {
      const res = await fetch('/api/nova/profile-kit', { method: 'POST' })
      const d = await res.json()
      if (!res.ok || !d.kit) throw new Error()
      setKit(d.kit)
    } catch {
      toast.error('Nova n’a pas pu générer, réessaie')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center gap-3 bg-background/90 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur lg:px-6 lg:py-0 lg:h-[68px]">
        <button
          type="button"
          onClick={() => router.push('/nova')}
          aria-label="Retour"
          className="-ml-1 flex size-9 items-center justify-center rounded-full text-muted-foreground active:bg-muted"
        >
          <ChevronLeft className="size-5 stroke-[1.5]" />
        </button>
        <h1 className="font-display text-lg font-bold text-foreground lg:text-2xl">Mes comptes</h1>
      </header>

      <div className="px-4 pt-2 pb-24 lg:px-8 lg:pt-4 lg:max-w-3xl lg:mx-auto">
        <p className="mb-3 text-sm text-muted-foreground text-pretty">
          Nova te prépare le contenu de tes profils, prêt à copier-coller. Un visiteur doit comprendre en 3 secondes qui tu es et où cliquer.
        </p>

        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-60"
          style={{ background: NOVA }}
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {loading ? 'Nova rédige…' : kit ? 'Régénérer avec Nova' : 'Générer mes profils avec Nova'}
        </button>

        <div className="flex flex-col gap-4">
          {PLATFORMS.map((p) => {
            const k = kit?.[p.key]
            return (
              <div key={p.key} className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
                <div className="flex items-center gap-3 border-b border-border p-4">
                  <span
                    className="flex size-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: `${NOVA}1a`, color: NOVA }}
                  >
                    <p.icon className="size-5 stroke-[1.5]" />
                  </span>
                  <span className="flex-1 text-sm font-bold text-foreground">{p.name}</span>
                  <button
                    type="button"
                    onClick={() => toast('Connexion des comptes — bientôt disponible')}
                    className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground active:bg-muted"
                  >
                    <Lock className="size-3" />
                    Connecter
                  </button>
                </div>

                <div className="flex flex-col gap-4 p-4">
                  {/* Photo : Nova ne peut pas la générer → conseil */}
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg" style={{ background: `${NOVA}1a`, color: NOVA }}>
                      <User className="size-4 stroke-[1.5]" />
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">Photo de profil</p>
                      <p className="text-xs text-muted-foreground">Ton visage (confiance) ou ton logo, lumineux et net.</p>
                    </div>
                  </div>

                  {k ? (
                    <>
                      <CopyField label="Bio" value={k.bio} />
                      {k.handles?.length > 0 && (
                        <div>
                          <p className="eyebrow mb-1">Idées de @</p>
                          <div className="flex flex-wrap gap-2">
                            {k.handles.map((h) => (
                              <button
                                key={h}
                                type="button"
                                onClick={() => copy(h)}
                                className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground active:bg-muted"
                              >
                                {h}
                                <Copy className="size-3 text-muted-foreground" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <CopyField label="Texte du lien en bio" value={k.linkCta} />
                      <CopyField label="Approche de contenu" value={k.content} />
                    </>
                  ) : (
                    <p className="flex items-start gap-2 rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
                      <Check className="mt-0.5 size-3.5 shrink-0" style={{ color: NOVA }} />
                      Clique « Générer » : Nova rédige ta bio, tes @, le texte de ton lien et ton approche de contenu, adaptés à ton activité.
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <p className="mt-4 text-[10px] text-muted-foreground">
          La connexion directe (pour publier et capter depuis Atline) arrive avec la validation des accès Meta / TikTok.
        </p>
      </div>
    </>
  )
}
