'use client'

import { useState } from 'react'
import { AlarmClock, Briefcase, CalendarPlus, CircleUserRound, StickyNote, UserPen, Check, Loader2, X, type LucideIcon } from 'lucide-react'
import { toast } from 'sonner'

// Carte « action » — Atlas a proposé une action concrète (relance, RDV, note) via un outil.
// L'utilisateur garde la main : rien n'est exécuté sans son tap. Confirmé → POST /api/atlas/actions.

export type AtlasAction = { kind: string; params: Record<string, string> }

// 🔴 `champs` EXISTE PARCE QUE `desc` NE SUFFISAIT PAS.
//
// Les cartes qui ÉCRIVENT des champs (profil, activité, fiche contact) les
// résumaient sur une seule ligne `truncate`, valeurs collées par des points
// médians et coupées à 40 caractères. Avec trois champs, on ne voyait que le
// premier, amputé. Constaté le 20 octobre : l'activité de Patrice portait les
// produits d'un CONCURRENT (entendus pendant une analyse comparative), une
// note sur un seul contact rangée en « audience », et une phrase sans rapport
// en objectif mensuel. Il avait bien tapé « Confirmer » — sur une ligne qui ne
// montrait rien de tout ça.
//
// Une confirmation qui cache ce qu'elle confirme n'est pas une confirmation.
// Quand `champs` est là, la carte rend UNE LIGNE PAR CHAMP, valeur entière.
type Meta = {
  icon: LucideIcon
  label: (p: Record<string, string>) => string
  desc: (p: Record<string, string>) => string
  champs?: (p: Record<string, string>) => [string, string][]
}

const META: Record<string, Meta> = {
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
    desc: () => 'infos de la fiche',
    champs: (p) => remplis([
      ['telephone', 'téléphone'], ['telephone2', '2e téléphone'], ['email', 'email'],
      ['adresse', 'adresse'], ['ville', 'ville'], ['code_postal', 'code postal'], ['pays', 'pays'],
      ['profession', 'métier'], ['education', 'formation'], ['date_naissance', 'naissance'],
      ['genre', 'genre'], ['prenom', 'prénom'], ['nom', 'nom'], ['tags', 'tags'],
      ['marche', 'proximité'], ['couleur', 'couleur'], ['etape', 'étape'],
      ['situation', 'situation'], ['interets', 'intérêts'], ['motivation', 'motivation'],
      ['insatisfaction', 'insatisfaction'], ['reseau', 'réseau'], ['ouverture', 'ouverture'],
    ], p),
  },
  update_profile: {
    icon: CircleUserRound,
    label: () => 'Mettre à jour ton profil',
    desc: () => 'infos du profil',
    // La liste suit EXACTEMENT ce que `/api/atlas/actions` écrit pour ce
    // genre. Neuf champs manquaient ici — dont le téléphone et l'email — et
    // partaient donc en base sans jamais s'afficher.
    champs: (p) => [
      ...remplis([
        ['prenom', 'prénom'], ['nom', 'nom'],
        ['profession', 'métier'], ['education', 'formation'], ['bio', 'bio'],
        ['telephone', 'téléphone'], ['telephone2', '2e téléphone'], ['email', 'email'],
        ['adresse', 'adresse'], ['ville', 'ville'], ['code_postal', 'code postal'], ['pays', 'pays'],
        ['date_naissance', 'naissance'], ['genre', 'genre'], ['couleur', 'couleur'],
        ['pourquoi', 'pourquoi'], ['parcours', 'parcours'], ['mindset', 'mindset'],
        ['passions', 'passions'], ['dispo', 'disponibilité'], ['niveau', 'niveau'],
      ], p),
      ...reseaux(p),
    ],
  },
  update_activite: {
    icon: Briefcase,
    label: () => 'Mettre à jour ton activité',
    desc: () => "infos de l'activité",
    champs: (p) => remplis([
      ['mlm', 'société'], ['goal', 'objectif principal'],
      ['objectif_mensuel', 'objectif mensuel'], ['objectif_3m', 'objectif 3 mois'],
      ['objectif_6m', 'objectif 6 mois'], ['objectif_12m', 'objectif 12 mois'],
      ['produit', 'produit phare'], ['audience', 'audience'], ['rang', 'rang'],
      ['story', 'ta rencontre'], ['parrain', 'parrain'], ['date_demarrage', 'démarrage'],
    ], p),
  },
}

/** Les champs que l'action va écrire, avec LEUR VALEUR ENTIÈRE. Rien n'est coupé. */
function remplis(fr: [string, string][], p: Record<string, string>): [string, string][] {
  return fr.filter(([k]) => p[k]?.trim()).map(([k, l]) => [l, p[k].trim()])
}

/** `socials` est un objet et non une chaîne : une ligne par réseau renseigné. */
function reseaux(p: Record<string, unknown>): [string, string][] {
  const s = p.socials
  if (!s || typeof s !== 'object' || Array.isArray(s)) return []
  return Object.entries(s as Record<string, unknown>)
    .filter(([, v]) => typeof v === 'string' && v.trim())
    .map(([k, v]) => [k.toLowerCase(), (v as string).trim()])
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

  // Ce que la carte s'apprête à écrire. Quand il y en a, c'est ÇA qu'on
  // montre : une ligne par champ, valeur entière. Jamais un résumé tronqué.
  const champs = state === 'done' ? [] : (meta.champs?.(action.params) ?? [])

  return (
    <div className="flex w-full items-start gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        {state === 'done' ? <Check className="size-5 stroke-[1.5]" /> : <Icon className="size-5 stroke-[1.5]" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-semibold text-foreground lg:text-sm">
          {state === 'done' ? doneLabel : meta.label(action.params)}
        </span>

        {state === 'done' ? (
          <span className="block text-xs text-muted-foreground">Fait ✓</span>
        ) : champs.length ? (
          <span className="mt-1.5 block space-y-1">
            {champs.map(([label, valeur]) => (
              <span key={label} className="block">
                <span className="text-xs text-muted-foreground">{label} : </span>
                <span className="break-words text-sm text-foreground">{valeur}</span>
              </span>
            ))}
          </span>
        ) : (
          <span className="block text-xs text-muted-foreground">{meta.desc(action.params)}</span>
        )}
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
