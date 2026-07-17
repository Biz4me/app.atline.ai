'use client'

import { useState } from 'react'
import { AlarmClock, Briefcase, CalendarPlus, CircleUserRound, StickyNote, UserPen, Check, Loader2, X, type LucideIcon } from 'lucide-react'
import { toast } from 'sonner'

// Carte « action » — Atlas a proposé une action concrète (relance, RDV, note) via un outil.
// L'utilisateur garde la main : rien n'est exécuté sans son tap. Confirmé → POST /api/atlas/actions.

export type AtlasAction = { kind: string; params: Record<string, string> }

const META: Record<string, { icon: LucideIcon; label: (p: Record<string, string>) => string; desc: (p: Record<string, string>) => string }> = {
  create_relance: {
    icon: AlarmClock,
    label: (p) => `Programmer la relance de ${p.contact_name ?? ''}`,
    desc: (p) => `${frDate(p.date)}${p.time ? ` à ${p.time}` : ''}${p.message ? ` · « ${p.message} »` : ''}`,
  },
  schedule_rdv: {
    icon: CalendarPlus,
    label: (p) => `Poser le RDV : ${p.title ?? ''}`,
    desc: (p) => `${frDate(p.date)} à ${p.time ?? ''}${p.contact_name ? ` · avec ${p.contact_name}` : ''}`,
  },
  log_note: {
    icon: StickyNote,
    label: (p) => `Noter sur la fiche de ${p.contact_name ?? ''}`,
    desc: (p) => `« ${(p.note ?? '').slice(0, 120)} »`,
  },
  update_contact: {
    icon: UserPen,
    label: (p) => `Mettre à jour la fiche de ${p.contact_name ?? ''}`,
    desc: (p) => {
      const FR: [string, string][] = [
        ['telephone', 'téléphone'], ['telephone2', '2e téléphone'], ['email', 'email'],
        ['adresse', 'adresse'], ['ville', 'ville'], ['code_postal', 'code postal'], ['pays', 'pays'],
        ['profession', 'métier'], ['education', 'formation'], ['date_naissance', 'naissance'],
        ['genre', 'genre'], ['prenom', 'prénom'], ['nom', 'nom'], ['tags', 'tags'],
        ['marche', 'proximité'], ['couleur', 'couleur'], ['etape', 'étape'],
        ['situation', 'situation'], ['interets', 'intérêts'], ['motivation', 'motivation'],
        ['insatisfaction', 'insatisfaction'], ['reseau', 'réseau'], ['ouverture', 'ouverture'],
      ]
      const parts = FR.filter(([k]) => p[k]).map(([, l]) => l)
      return parts.length ? parts.join(' · ') : 'infos de la fiche'
    },
  },
  update_profile: {
    icon: CircleUserRound,
    label: () => 'Mettre à jour ton profil',
    desc: (p) => {
      const FR: [string, string][] = [
        ['profession', 'métier'], ['education', 'formation'], ['ville', 'ville'],
        ['date_naissance', 'naissance'], ['genre', 'genre'], ['couleur', 'couleur'], ['bio', 'bio'],
        ['pourquoi', 'pourquoi'], ['parcours', 'parcours'], ['passions', 'passions'],
        ['dispo', 'disponibilité'], ['niveau', 'niveau'],
      ]
      const parts = FR.filter(([k]) => p[k]).map(([, l]) => l)
      return parts.length ? parts.join(' · ') : 'infos du profil'
    },
  },
  update_activite: {
    icon: Briefcase,
    label: () => 'Mettre à jour ton activité',
    desc: (p) => {
      const FR: [string, string][] = [
        ['objectif_mensuel', 'objectif mensuel'], ['objectif_3m', 'objectif 3 mois'],
        ['objectif_6m', 'objectif 6 mois'], ['objectif_12m', 'objectif 12 mois'],
        ['produit', 'produit phare'], ['audience', 'audience'], ['rang', 'rang'],
        ['story', 'ta rencontre'], ['parrain', 'parrain'],
      ]
      const parts = FR.filter(([k]) => p[k]).map(([, l]) => l)
      return parts.length ? parts.join(' · ') : "infos de l'activité"
    },
  },
}

function frDate(d?: string): string {
  if (!d) return ''
  const dt = new Date(`${d}T12:00:00`)
  if (isNaN(dt.getTime())) return d
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(dt)
}

export function AtlasActionCard({ action }: { action: AtlasAction }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'dismissed'>('idle')
  const [doneLabel, setDoneLabel] = useState('')
  const meta = META[action.kind]
  if (!meta) return null
  const Icon = meta.icon

  async function confirm() {
    setState('busy')
    try {
      const r = await fetch('/api/atlas/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) {
        toast.error(d?.error ?? "L'action n'a pas pu être exécutée")
        setState('idle')
        return
      }
      setDoneLabel(d?.done ?? 'Fait')
      setState('done')
    } catch {
      toast.error('Réseau indisponible, réessaie')
      setState('idle')
    }
  }

  if (state === 'dismissed') return null

  return (
    <div className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        {state === 'done' ? <Check className="size-5 stroke-[1.5]" /> : <Icon className="size-5 stroke-[1.5]" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-lg font-semibold text-foreground lg:text-sm">
          {state === 'done' ? doneLabel : meta.label(action.params)}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {state === 'done' ? 'Fait ✓' : meta.desc(action.params)}
        </span>
      </span>
      {state !== 'done' && (
        <span className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setState('dismissed')
              // Écarter = consommer la proposition persistée (elle ne reviendra pas au refresh)
              void fetch('/api/atlas/actions/dismiss', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: action.kind }) }).catch(() => {})
            }}
            aria-label="Ignorer"
            className="grid size-8 place-items-center rounded-full text-muted-foreground active:bg-muted"
          >
            <X className="size-4" />
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={state === 'busy'}
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.97] disabled:opacity-60"
          >
            {state === 'busy' ? <Loader2 className="size-4 animate-spin" /> : 'Confirmer'}
          </button>
        </span>
      )}
    </div>
  )
}
