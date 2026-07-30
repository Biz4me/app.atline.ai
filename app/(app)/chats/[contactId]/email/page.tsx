'use client'

import { use, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Mail, Send, CalendarCheck, UserPlus, ShoppingBag, Ban, HandHelping, MailX } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * LE FIL E-MAIL AVEC UN PROSPECT.
 *
 * ⚠️ À ne pas confondre avec `/chats/[contactId]`, qui est le fil où le
 * distributeur parle à ATLAS À PROPOS de ce contact. Ici, c'est l'échange réel
 * avec la personne — celui qu'Orion a mené en son nom.
 *
 * C'est l'écran qui manquait le plus : Orion écrivait « je transmets ça à
 * Patrice tout de suite », posait une issue, envoyait une notification… qui
 * menait vers une conversation ne montrant aucun e-mail. Le produit promettait
 * quelque chose qu'il ne montrait nulle part.
 *
 * Ce qu'on affiche, et rien d'autre : qui a écrit quoi, et où en est la
 * conversation. Pas de composeur pour l'instant — répondre à la main ici
 * demanderait de décider quoi faire de l'automatisme en cours, et cette
 * question mérite mieux qu'un bouton ajouté à la hâte.
 */

type Message = { role: 'user' | 'assistant'; content: string }

type Fil = {
  id: string
  sujet: string
  adresseEnvoi: string
  echanges: number
  issue: string | null
  humainRepris: boolean
  dernierEnvoiAt: string | null
  dernierRecuAt: string | null
  relancesFaites: number
  prochaineRelance: { etape: number | null; status: string; dueAt: string } | null
}

type Donnees = { contactId: string; nom: string; adresse: string | null; fil: Fil | null; messages: Message[] }

const ISSUES: Record<string, { texte: string; couleur: string; icone: typeof CalendarCheck }> = {
  RDV: { texte: 'Rendez-vous demandé — à toi de jouer', couleur: '#22C55E', icone: CalendarCheck },
  INSCRIPTION: { texte: 'Veut s’inscrire — accompagne-la maintenant', couleur: '#22C55E', icone: UserPlus },
  ACHAT: { texte: 'Veut acheter — envoie ton lien boutique', couleur: '#22C55E', icone: ShoppingBag },
  REFUS: { texte: 'A dit non — Orion s’est arrêté', couleur: '#EF4444', icone: Ban },
  HANDOFF: { texte: 'Attend une réponse humaine', couleur: '#F4B342', icone: HandHelping },
  INJOIGNABLE: { texte: 'Adresse inexistante — corrige-la', couleur: '#EF4444', icone: MailX },
}

const quand = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : ''

export default function Page({ params }: { params: Promise<{ contactId: string }> }) {
  const { contactId } = use(params)
  const [d, setD] = useState<Donnees | null>(null)
  const [chargement, setChargement] = useState(true)

  const charger = useCallback(async () => {
    const r = await fetch(`/api/email/fils/${contactId}`).then((x) => (x.ok ? x.json() : null)).catch(() => null)
    setD(r)
    setChargement(false)
  }, [contactId])

  useEffect(() => {
    charger()
  }, [charger])

  const issue = d?.fil?.issue ? ISSUES[d.fil.issue] : null

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* En-tête : le retour ramène au fil Atlas du contact, d'où l'on vient. */}
      <header
        className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-background/95 px-3 py-2.5 backdrop-blur"
        style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top))' }}
      >
        <Link
          href={`/chats/${contactId}`}
          aria-label="Retour"
          className="-ml-1 flex size-9 shrink-0 items-center justify-center rounded-full text-foreground active:bg-muted"
        >
          <ChevronLeft className="size-5 stroke-[1.5]" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-foreground">{d?.nom ?? '…'}</p>
          <p className="truncate text-2xs text-muted-foreground">{d?.adresse ?? 'e-mail'}</p>
        </div>
        <Link href="/orion/email" aria-label="Mon canal e-mail" className="shrink-0 text-muted-foreground">
          <Mail className="size-5 stroke-[1.75]" />
        </Link>
      </header>

      <div className="mx-auto w-full max-w-2xl flex-1 px-4 pb-28 pt-3 lg:pb-10">
        {chargement && <p className="py-10 text-center text-sm text-muted-foreground">Un instant…</p>}

        {!chargement && !d?.fil && (
          <div className="rounded-2xl border border-border bg-surface p-4 text-center shadow-card">
            <p className="text-sm font-semibold text-foreground">Aucun e-mail échangé</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {d?.adresse
                ? 'Orion peut ouvrir la conversation quand tu le décides.'
                : 'Ce contact n’a pas encore d’adresse e-mail.'}
            </p>
          </div>
        )}

        {!chargement && d?.fil && (
          <>
            {/* Le bandeau d'issue, en tête : c'est l'information qui a déclenché
                la notification, elle ne doit pas se chercher. */}
            {issue && (
              <div
                className="mb-3 flex items-center gap-2 rounded-2xl px-3 py-2.5"
                style={{ background: `${issue.couleur}14`, color: issue.couleur }}
              >
                <issue.icone className="size-4 shrink-0 stroke-[1.75]" />
                <p className="text-xs font-semibold">{issue.texte}</p>
              </div>
            )}

            {d.fil.humainRepris && !issue && (
              <div className="mb-3 rounded-2xl bg-muted px-3 py-2.5">
                <p className="text-xs text-muted-foreground">
                  Tu as repris la main sur ce fil. Orion n’y écrira plus.
                </p>
              </div>
            )}

            <p className="pb-2 text-2xs text-muted-foreground">{d.fil.sujet}</p>

            <div className="space-y-2">
              {d.messages.map((m, i) => (
                <Bulle key={i} message={m} />
              ))}
            </div>

            <Pied fil={d.fil} />
          </>
        )}
      </div>
    </div>
  )
}

/**
 * Une bulle. « assistant » = ce qui est parti de l'adresse du distributeur,
 * qu'Orion l'ait écrit ou lui-même : côté prospect, c'est la même personne.
 */
function Bulle({ message }: { message: Message }) {
  const deNous = message.role === 'assistant'
  return (
    <div className={cn('flex', deNous ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm',
          deNous
            ? 'bg-primary text-primary-foreground'
            : 'border border-border bg-surface text-foreground',
        )}
      >
        {message.content}
      </div>
    </div>
  )
}

/** L'état de la conversation, sous le fil : ce qui va se passer ensuite. */
function Pied({ fil }: { fil: Fil }) {
  const prochaine = fil.prochaineRelance
  return (
    <div className="mt-4 rounded-2xl border border-border bg-surface p-3 shadow-card">
      <div className="flex items-center gap-2">
        <Send className="size-3.5 shrink-0 text-muted-foreground" />
        <p className="text-2xs text-muted-foreground">
          Envoyé depuis <strong className="font-semibold text-foreground">{fil.adresseEnvoi}</strong>
          {' · '}
          {fil.echanges} message{fil.echanges > 1 ? 's' : ''}
          {fil.relancesFaites > 0 && ` · ${fil.relancesFaites} relance${fil.relancesFaites > 1 ? 's' : ''}`}
        </p>
      </div>
      <p className="mt-1.5 text-2xs text-muted-foreground">
        {fil.issue
          ? 'La conversation est close, plus aucun message automatique ne partira.'
          : prochaine
            ? `Prochaine relance le ${quand(prochaine.dueAt)} — tu la valideras avant qu’elle parte.`
            : 'Aucune relance programmée.'}
      </p>
    </div>
  )
}
