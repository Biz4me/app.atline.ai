'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft, Camera, Music2, User, AtSign, Link2, Film, Lock } from 'lucide-react'
import { toast } from 'sonner'

const NOVA = '#8B5CF6'

type Guide = { icon: typeof User; label: string; desc: string }

const COMMON: Guide[] = [
  { icon: User, label: 'Photo de profil', desc: 'Ton visage (confiance) ou ton logo, lumineux et net.' },
  { icon: AtSign, label: 'Nom & @', desc: 'Clair et mémorisable, cohérent avec ton activité (ex. prénom + thème).' },
  { icon: Link2, label: 'Lien en bio', desc: 'Le SEUL appel à l’action : vers ta capture / ta réunion. Tout le trafic y atterrit.' },
]

const PLATFORMS: { key: string; name: string; icon: typeof Camera; bio: string; content: Guide }[] = [
  {
    key: 'instagram',
    name: 'Instagram',
    icon: Camera,
    bio: 'Qui tu aides + le bénéfice + « ⬇️ le lien en bio ». Ex. « J’aide les mamans à lancer une activité qui leur ressemble. Le lien pour en savoir plus ⬇️ ».',
    content: {
      icon: Film,
      label: 'Contenu',
      desc: 'Des Reels verticaux, une « À la une » qui rassure, et 1 post épinglé qui présente clairement ce que tu proposes.',
    },
  },
  {
    key: 'tiktok',
    name: 'TikTok',
    icon: Music2,
    bio: 'Qui tu aides en une ligne + le lien (dispo dès l’activation, sinon un lien unique en bio). Accroche courte et concrète.',
    content: {
      icon: Film,
      label: 'Contenu',
      desc: 'Format vertical, une accroche forte dès la 1re seconde, sous-titres, sons tendance. La régularité prime.',
    },
  },
]

function Line({ icon: Icon, label, desc }: Guide) {
  return (
    <div className="flex items-start gap-3">
      <span
        className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg"
        style={{ background: `${NOVA}1a`, color: NOVA }}
      >
        <Icon className="size-4 stroke-[1.5]" />
      </span>
      <div className="flex-1">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  )
}

export default function ComptesPage() {
  const router = useRouter()
  return (
    <>
      <header
        className="sticky top-0 z-30 flex items-center gap-3 bg-background/90 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur lg:px-6 lg:py-0 lg:h-[68px]"
      >
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
        <p className="mb-4 text-sm text-muted-foreground text-pretty">
          Avant de publier, prépare tes profils : un visiteur doit comprendre en 3 secondes qui tu es et où cliquer.
        </p>

        <div className="flex flex-col gap-4">
          {PLATFORMS.map((p) => (
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
              <div className="flex flex-col gap-3.5 p-4">
                {COMMON.map((g) => (
                  <Line key={g.label} {...g} />
                ))}
                <Line icon={AtSign} label="Bio" desc={p.bio} />
                <Line {...p.content} />
              </div>
            </div>
          ))}
        </div>

        <p className="mt-4 text-[10px] text-muted-foreground">
          La connexion directe (pour publier et capter depuis Atline) arrive avec la validation des accès Meta / TikTok.
        </p>
      </div>
    </>
  )
}
