'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

const TITLES: Record<string, string> = {
  'preferences':               'Préférences',
  'profil':                    'Profil',
  'notifications':             'Notifications',
  'activite-mlm':              'Activité MLM',
  'comptes-lies':              'Comptes liés',
  'parrainage':                'Parrainage',
  'confidentialite':           'Confidentialité',
  'centre-aide':               "Centre d'aide",
  'contact':                   'Contact et remarques',
}

export default function SettingsSectionPage({ params }: { params: { section: string } }) {
  const router = useRouter()
  const title = TITLES[params.section] ?? 'Paramètres'

  return (
    <div
      className="lg:hidden fixed inset-0 z-[70] bg-background overflow-y-auto animate-slide-in-right"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-10 relative flex items-center justify-center border-b border-border bg-background/90 px-4 py-3 backdrop-blur"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <button
          type="button"
          onClick={() => router.back()}
          className="absolute left-2 flex size-9 items-center justify-center rounded-full text-foreground active:bg-muted"
        >
          <ChevronLeft className="size-5 stroke-[1.5]" />
        </button>
        <h1 className="text-sm font-semibold text-foreground">{title}</h1>
      </div>

      {/* Contenu à venir */}
      <div className="flex flex-col items-center justify-center px-6 pt-20 text-center">
        <p className="text-sm text-muted-foreground">Bientôt disponible</p>
      </div>
    </div>
  )
}
