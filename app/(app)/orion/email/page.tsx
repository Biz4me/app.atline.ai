'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Mail, ShieldCheck, ShieldAlert, Send, Check, X, Clock, MoonStar } from 'lucide-react'
import { Ecran } from '@/components/ecran'
import { cn } from '@/lib/utils'

/**
 * MON CANAL E-MAIL — le premier écran qui rend visible tout ce qui a été
 * construit les 30 et 31 juillet.
 *
 * Jusqu'ici le canal fonctionnait de bout en bout — envoi, réception, réponse
 * automatique, détection d'issue — mais AUCUNE page ne le montrait. Il fallait
 * taper des URL à la main pour connecter Gmail. Un produit qui écrit au nom de
 * quelqu'un et ne lui montre rien n'est pas un produit.
 *
 * Trois blocs, dans l'ordre où on s'en préoccupe :
 *
 *   ① L'ÉTAT — depuis quelle adresse mes prospects me voient-ils, est-ce que
 *     je reçois bien leurs réponses, combien d'envois me reste-t-il aujourd'hui.
 *   ② CE QU'IL FAUT DÉCIDER — les relances arrivées à échéance, texte relu et
 *     modifiable. C'est du travail.
 *   ③ CE QUI SUIT SON COURS — qui en est à quelle étape. C'est de
 *     l'information, et ça ne doit pas noyer le point ②.
 */

type Statut = {
  connecte: boolean
  adresseEnvoi: string | null
  compteAtline: string | null
  adresseDifferente: boolean
  capacites: { cle: string; libelle: string; pourquoi: string; active: boolean }[]
  surveillance: { active: boolean; expireLe: string | null }
}

type AValider = {
  id: string
  contactId: string
  contact: string
  destinataire: string
  etape: number
  surTotal: number
  enRetardJours: number
  brouillon: string | null
  sujet: string
}

type EnCours = {
  filId: string
  contactId: string | null
  contact: string
  destinataire: string
  relancesFaites: number
  surTotal: number
  prochaineEtape: number | null
  prochaineLe: string | null
  enFile: boolean
  dormant: boolean
}

type Sequences = {
  envoisDuJour: number
  plafondQuotidien: number
  aValider: AValider[]
  enCours: EnCours[]
}

const jour = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) : ''

export default function Page() {
  const [statut, setStatut] = useState<Statut | null>(null)
  const [seq, setSeq] = useState<Sequences | null>(null)
  const [chargement, setChargement] = useState(true)
  const [message, setMessage] = useState<string | null>(null)

  const charger = useCallback(async () => {
    const [a, b] = await Promise.all([
      fetch('/api/google/statut').then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch('/api/email/sequences').then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ])
    setStatut(a)
    setSeq(b)
    setChargement(false)
  }, [])

  useEffect(() => {
    charger()
  }, [charger])

  const tester = async () => {
    setMessage('Envoi du test…')
    const r = await fetch('/api/google/verifier?envoyer=oui').then((x) => x.json()).catch(() => null)
    setMessage(r?.ok ? `Envoyé à ${r.destinataire}. Regarde ta boîte.` : r?.raison || 'Le test a échoué.')
    charger()
  }

  return (
    <Ecran titre="Mon canal e-mail">
      <div className="mx-auto w-full max-w-2xl space-y-3 pb-8">
        {chargement && <p className="py-8 text-center text-sm text-muted-foreground">Un instant…</p>}

        {!chargement && <CarteEtat statut={statut} seq={seq} onTester={tester} message={message} />}

        {!chargement && statut?.connecte && (
          <>
            <Decisions liste={seq?.aValider ?? []} onFait={charger} />
            <EnCoursListe liste={seq?.enCours ?? []} />
          </>
        )}
      </div>
    </Ecran>
  )
}

/** ① L'état du canal. La question la plus importante y est en premier :
 *  depuis quelle adresse les prospects me voient-ils. */
function CarteEtat({
  statut, seq, onTester, message,
}: { statut: Statut | null; seq: Sequences | null; onTester: () => void; message: string | null }) {
  if (!statut?.connecte) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-4 shadow-card">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Mail className="size-5 stroke-[1.75]" />
          </span>
          <div className="min-w-0">
            <p className="text-lg font-bold text-foreground">Ta boîte n’est pas connectée</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Une fois connectée, tes messages partiront de <strong>ta propre adresse</strong>, avec ton nom.
              Tes prospects te reconnaîtront, et leurs réponses reviendront ici.
            </p>
          </div>
        </div>
        <a
          href="/api/calendar/connect?pour=email"
          className="mt-4 block rounded-2xl bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground"
        >
          Connecter ma boîte Gmail
        </a>
      </div>
    )
  }

  const marge = seq ? seq.plafondQuotidien - seq.envoisDuJour : null
  const surveille = statut.surveillance.active

  return (
    <div className="rounded-2xl border border-border bg-surface shadow-card">
      <div className="border-b border-border px-4 py-3">
        <p className="text-2xs font-bold uppercase tracking-widest text-muted-foreground">
          Tes prospects te voient comme
        </p>
        <p className="mt-1 truncate text-lg font-bold text-foreground">{statut.adresseEnvoi}</p>
        {statut.adresseDifferente && (
          <p className="mt-1 text-xs text-muted-foreground">
            Ce n’est pas l’adresse de ton compte Atline ({statut.compteAtline}). C’est volontaire ? Alors tout va bien.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
        <div className="px-4 py-3">
          <div className="flex items-center gap-1.5">
            {surveille ? (
              <ShieldCheck className="size-4 shrink-0" style={{ color: '#22C55E' }} />
            ) : (
              <ShieldAlert className="size-4 shrink-0" style={{ color: '#EF4444' }} />
            )}
            <p className="text-xs font-semibold text-foreground">
              {surveille ? 'Réponses surveillées' : 'Réponses non surveillées'}
            </p>
          </div>
          <p className="mt-0.5 text-2xs text-muted-foreground">
            {surveille
              ? `jusqu’au ${jour(statut.surveillance.expireLe)}, renouvelé chaque nuit`
              : 'les réponses de tes prospects ne remonteront pas'}
          </p>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs font-semibold text-foreground">
            {seq ? `${seq.envoisDuJour} envoi${seq.envoisDuJour > 1 ? 's' : ''} aujourd’hui` : '—'}
          </p>
          <p className="mt-0.5 text-2xs text-muted-foreground">
            {marge !== null ? `il t’en reste ${marge} avant la limite du jour` : ''}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 px-4 py-3">
        <button
          type="button"
          onClick={onTester}
          className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-foreground active:bg-muted"
        >
          M’envoyer un test
        </button>
        <Link href="/compte" className="text-xs text-muted-foreground underline underline-offset-2">
          Gérer l’accès
        </Link>
      </div>
      {message && <p className="px-4 pb-3 text-xs text-muted-foreground">{message}</p>}
    </div>
  )
}

/** ② Ce qu'il faut décider. Séparé du reste : trois lignes qui demandent une
 *  décision ne doivent pas se noyer dans trente lignes d'information. */
function Decisions({ liste, onFait }: { liste: AValider[]; onFait: () => void }) {
  if (!liste.length) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-4 text-center shadow-card">
        <p className="text-sm font-semibold text-foreground">Rien à valider aujourd’hui</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Orion te préviendra quand une relance sera prête.
        </p>
      </div>
    )
  }
  return (
    <div className="space-y-2">
      <p className="px-1 text-2xs font-bold uppercase tracking-widest text-muted-foreground">
        À valider — {liste.length}
      </p>
      {liste.map((r) => (
        <Relance key={r.id} r={r} onFait={onFait} />
      ))}
    </div>
  )
}

function Relance({ r, onFait }: { r: AValider; onFait: () => void }) {
  const [texte, setTexte] = useState(r.brouillon ?? '')
  const [occupe, setOccupe] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const envoyer = async () => {
    setOccupe(true); setErreur(null)
    const res = await fetch(`/api/email/relances/${r.id}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ texte }),
    }).then((x) => x.json()).catch(() => null)
    setOccupe(false)
    if (res?.ok) onFait()
    else setErreur(res?.message ?? 'Envoi impossible')
  }

  const arreter = async () => {
    setOccupe(true)
    await fetch(`/api/email/relances/${r.id}`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ raison: 'refusée par le distributeur' }),
    }).catch(() => {})
    setOccupe(false)
    onFait()
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-card">
      <div className="flex items-baseline justify-between gap-2">
        <p className="min-w-0 truncate text-sm font-bold text-foreground">{r.contact}</p>
        <span className="shrink-0 text-2xs font-semibold text-muted-foreground">
          relance {r.etape} sur {r.surTotal}
        </span>
      </div>
      <p className="mt-0.5 truncate text-2xs text-muted-foreground">
        {r.destinataire}
        {r.enRetardJours > 0 && ` · en attente depuis ${r.enRetardJours} j`}
      </p>

      {r.brouillon === null ? (
        <p className="mt-3 text-xs text-muted-foreground">Orion prépare le texte, reviens dans un instant.</p>
      ) : (
        <textarea
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          rows={5}
          className="mt-3 w-full resize-none rounded-xl border border-border bg-background p-3 text-sm text-foreground"
        />
      )}

      {erreur && <p className="mt-2 text-xs" style={{ color: '#EF4444' }}>{erreur}</p>}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={occupe || !texte.trim()}
          onClick={envoyer}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-40"
        >
          <Send className="size-4 stroke-[1.75]" />
          Envoyer
        </button>
        <button
          type="button"
          disabled={occupe}
          onClick={arreter}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2.5 text-sm font-semibold text-muted-foreground disabled:opacity-40"
        >
          <X className="size-4 stroke-[1.75]" />
          Ne plus relancer
        </button>
      </div>
    </div>
  )
}

/** ③ Ce qui suit son cours. De l'information, pas une liste de tâches. */
function EnCoursListe({ liste }: { liste: EnCours[] }) {
  if (!liste.length) return null
  return (
    <div className="rounded-2xl border border-border bg-surface shadow-card">
      <p className="border-b border-border px-4 py-3 text-2xs font-bold uppercase tracking-widest text-muted-foreground">
        Conversations en cours — {liste.length}
      </p>
      <ul className="divide-y divide-border">
        {liste.map((c) => (
          <li key={c.filId} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {c.contactId ? <Link href={`/chats/${c.contactId}`}>{c.contact}</Link> : c.contact}
              </p>
              <p className="truncate text-2xs text-muted-foreground">{c.destinataire}</p>
            </div>
            <Etat c={c} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function Etat({ c }: { c: EnCours }) {
  if (c.dormant) {
    return (
      <span className="flex shrink-0 items-center gap-1 text-2xs text-muted-foreground">
        <MoonStar className="size-3.5" /> dormant
      </span>
    )
  }
  if (c.enFile) {
    return (
      <span className="flex shrink-0 items-center gap-1 text-2xs font-semibold" style={{ color: '#3B82F6' }}>
        <Check className="size-3.5" /> en file
      </span>
    )
  }
  if (c.prochaineEtape) {
    return (
      <span className="flex shrink-0 items-center gap-1 text-2xs text-muted-foreground">
        <Clock className="size-3.5" />
        relance {c.prochaineEtape} le {jour(c.prochaineLe)}
      </span>
    )
  }
  return (
    <span className={cn('shrink-0 text-2xs text-muted-foreground')}>
      {c.relancesFaites} relance{c.relancesFaites > 1 ? 's' : ''} sur {c.surTotal}
    </span>
  )
}
