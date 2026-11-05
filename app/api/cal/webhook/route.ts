/**
 * CE QUE CAL NOUS DIT QUAND QUELQU'UN RÉSERVE.
 *
 * Cal tient l'agenda public, les créneaux, la salle de visioconférence et le
 * lien pour déplacer. Atline tient la relation. Ce fichier est la couture
 * entre les deux, et il a trois obligations :
 *
 *   1. écrire le rendez-vous dans Atline, pour que l'écran Agenda ait enfin
 *      quelque chose à montrer ;
 *   2. envoyer au prospect un mot écrit par une personne, depuis la boîte du
 *      distributeur (voir `lib/cal/message.ts` pour pourquoi l'invitation
 *      d'agenda ne suffit pas) ;
 *   3. ne JAMAIS échouer en silence.
 *
 * ── L'IDEMPOTENCE N'EST PAS UN LUXE ───────────────────────────────────────
 *
 * Cal réessaie quand il n'obtient pas de réponse. Sans précaution, un envoi
 * Gmail un peu lent produirait deux rendez-vous et deux courriers chez le
 * prospect. On s'appuie donc sur `Appointment.calComEventId`, qui est UNIQUE
 * en base : on regarde si la ligne existe AVANT d'écrire, et on n'envoie le
 * courrier que la première fois.
 *
 * ── POURQUOI ON REFUSE BRUYAMMENT ─────────────────────────────────────────
 *
 * Si on ne sait pas à quel distributeur rattacher la réservation, répondre
 * 200 ferait disparaître le rendez-vous sans que personne ne l'apprenne. On
 * répond donc une erreur : Cal la montre dans son journal de webhooks, et le
 * défaut se VOIT. Une livraison en échec vaut mieux qu'un succès menteur.
 *
 * ── LA SIGNATURE ──────────────────────────────────────────────────────────
 *
 * Cal signe le corps brut : `HMAC-SHA256(secret, corps)` en hexadécimal, dans
 * l'en-tête `X-Cal-Signature-256` (vérifié dans `sendPayload.ts:296`). Il faut
 * donc lire le corps AVANT de l'analyser : un `await req.json()` suivi d'un
 * `JSON.stringify` ne redonne pas les mêmes octets, et la signature tomberait.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { db } from '@/lib/db'
import { connexionDe } from '@/lib/google/connexion'
import { envoyerTransactionnel } from '@/lib/gmail/transactionnel'
import { construireIcs } from '@/lib/cal/ics'
import { lieuDepuisGoogle, lieuLisible } from '@/lib/cal/evenement'
import {
  corpsAnnulation,
  corpsConfirmation,
  corpsDeplacement,
  sujetAnnulation,
  sujetConfirmation,
  sujetDeplacement,
  type Rendez,
} from '@/lib/cal/message'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Personne = { id?: number; name?: string; email?: string; timeZone?: string; username?: string }
type Charge = {
  uid?: string
  title?: string
  startTime?: string
  endTime?: string
  location?: string
  organizer?: Personne
  attendees?: Personne[]
  videoCallData?: { url?: string }
  metadata?: Record<string, unknown>
  cancellationReason?: string
  /**
   * Le nom du type de rendez-vous (« Premier échange ») et le texte que le
   * distributeur a écrit dans Cal pour dire ce qui va s'y passer.
   *
   * 🧭 C'est SA voix, et elle diffère pour chaque type. Un texte générique
   * qu'on écrirait ici serait le même pour tout le monde — et il faudrait un
   * déploiement pour le changer.
   */
  eventTitle?: string | null
  eventDescription?: string | null
  /** Qui a annulé, pour ne pas renvoyer au prospect le motif qu'il a écrit. */
  cancelledBy?: string
  /**
   * La séquence iCal que Cal pose sur l'événement Google. On la reprend telle
   * quelle : inventer la nôtre ferait diverger les deux descriptions du même
   * rendez-vous, et un client ignorerait la mise à jour comme un doublon.
   */
  iCalSequence?: number | null
}

function signatureValide(corps: string, recue: string | null, secret: string): boolean {
  if (!recue) return false
  const attendue = createHmac('sha256', secret).update(corps).digest('hex')
  const a = Buffer.from(attendue, 'utf8')
  const b = Buffer.from(recue, 'utf8')
  // `timingSafeEqual` LÈVE si les longueurs diffèrent : on compare d'abord.
  return a.length === b.length && timingSafeEqual(a, b)
}

/**
 * Le type de rendez-vous, déduit du lieu.
 *
 * ⚠️ Cal passe parfois le type brut (`integrations:google:meet`) et parfois
 * une version lisible (« Google Meet »), selon le chemin emprunté dans
 * `sendPayload.ts`. On reconnaît donc les deux formes.
 */
function typeDeLieu(lieu: string | undefined): 'VISIO' | 'CALL' | 'PRESENTIEL' | 'AUTRE' {
  const l = (lieu ?? '').toLowerCase()
  if (!l) return 'AUTRE'
  if (/meet|zoom|daily|video|visio|teams|whereby|jitsi|cal\.com/.test(l)) return 'VISIO'
  if (/phone|téléphone|telephone|appel/.test(l)) return 'CALL'
  if (/person|place|adresse|address|lieu/.test(l)) return 'PRESENTIEL'
  if (/^https?:\/\//.test(l)) return 'VISIO'
  return 'AUTRE'
}

function lienVisio(c: Charge): string | null {
  const m = c.metadata as { videoCallUrl?: unknown } | undefined
  const candidats = [c.videoCallData?.url, typeof m?.videoCallUrl === 'string' ? m.videoCallUrl : null, c.location]
  for (const v of candidats) {
    if (typeof v === 'string' && /^https?:\/\//.test(v)) return v
  }
  return null
}

export async function POST(req: NextRequest) {
  const secret = process.env.CAL_WEBHOOK_SECRET
  if (!secret) {
    console.error('[cal] CAL_WEBHOOK_SECRET absent : on refuse plutôt que d’accepter n’importe qui')
    return NextResponse.json({ error: 'webhook non configuré' }, { status: 503 })
  }

  // Le corps BRUT, avant toute analyse. Voir l'en-tête du fichier.
  const brut = await req.text()
  if (!signatureValide(brut, req.headers.get('x-cal-signature-256'), secret)) {
    return NextResponse.json({ error: 'signature invalide' }, { status: 401 })
  }

  let enveloppe: { triggerEvent?: string; payload?: Charge }
  try {
    enveloppe = JSON.parse(brut)
  } catch {
    return NextResponse.json({ error: 'corps illisible' }, { status: 400 })
  }

  const evenement = enveloppe.triggerEvent ?? ''
  const c = enveloppe.payload ?? {}
  const uid = c.uid
  if (!uid) return NextResponse.json({ error: 'réservation sans identifiant' }, { status: 400 })

  // ── à quel distributeur cette réservation appartient-elle ? ───────────────
  //
  // Le compte Cal n'a rien à voir avec le compte Atline : c'est `CalComConnection`
  // qui fait le pont, et elle seule. Sans elle, on ne devine pas.
  const orgId = c.organizer?.id != null ? String(c.organizer.id) : null
  const orgNom = c.organizer?.username ?? null
  const lien = await db.calComConnection.findFirst({
    where: {
      OR: [
        ...(orgId ? [{ calComUserId: orgId }] : []),
        ...(orgNom ? [{ bookingUrl: { endsWith: `/${orgNom}` } }] : []),
      ],
    },
    select: { userId: true, bookingUrl: true },
  })
  if (!lien) {
    console.error(`[cal] aucun distributeur pour l’organisateur id=${orgId} nom=${orgNom} (${evenement})`)
    return NextResponse.json(
      { error: 'organisateur Cal non rattaché à un compte Atline' },
      { status: 422 },
    )
  }
  const userId = lien.userId

  const existant = await db.appointment.findUnique({
    where: { calComEventId: uid },
    select: { id: true, contactId: true },
  })

  // Qui est le distributeur, et depuis quelle boîte écrit-il. Les deux
  // branches en ont besoin, alors on les lit une fois.
  const hote = await db.user.findUnique({
    where: { id: userId },
    select: { firstName: true, lastName: true },
  })
  const nomHote = [hote?.firstName, hote?.lastName].filter(Boolean).join(' ') || 'Ton contact'
  const boite = await connexionDe(userId)

  // ── l'annulation ──────────────────────────────────────────────────────────
  //
  // 🔴 Ce courrier n'est PAS une politesse. Google s'étant tu depuis le
  // correctif du fork, c'est notre `METHOD:CANCEL` qui retire l'événement de
  // l'agenda du prospect. Sans lui, le rendez-vous resterait posé chez lui
  // pour toujours, rappel compris.
  if (evenement === 'BOOKING_CANCELLED' || evenement === 'BOOKING_REJECTED') {
    const invite = c.attendees?.[0]
    const debut = c.startTime ? new Date(c.startTime) : null
    let courrier: { ok: boolean; message?: string } = { ok: false, message: 'rien à envoyer' }

    if (invite?.email && debut && !isNaN(debut.getTime()) && boite?.email) {
      const fin = c.endTime ? new Date(c.endTime) : new Date(debut.getTime() + 30 * 60_000)
      const rendez: Rendez = {
        invite: invite.name ?? '',
        hote: nomHote,
        typeNom: c.eventTitle ?? null,
        // Sur une annulation, on ne redit pas ce qui allait s'y passer.
        quoi: null,
        debut,
        fin,
        fuseau: invite.timeZone || 'Europe/Paris',
        visio: null,
        lieu: null,
        replanifier: null,
      }
      // Cal nomme l'annulant par son adresse ; si c'est l'invité, inutile de
      // lui relire le motif qu'il vient d'écrire.
      const parLeProspect =
        (c.cancelledBy ?? '').toLowerCase() === invite.email.toLowerCase()

      courrier = await envoyerTransactionnel({
        userId,
        destinataire: invite.email,
        sujet: sujetAnnulation(rendez),
        corps: corpsAnnulation(rendez, {
          motif: c.cancellationReason ?? null,
          parLeProspect,
          reserver: lien.bookingUrl || null,
        }),
        contactId: existant?.contactId ?? null,
        origine: `cal:${evenement}`,
        invitation: {
          methode: 'CANCEL',
          ics: construireIcs({
            uidReservation: uid,
            titre: c.title ?? 'Rendez-vous annulé',
            description: '',
            debut,
            fin,
            organisateurNom: nomHote,
            organisateurEmail: boite.email,
            inviteNom: invite.name ?? '',
            inviteEmail: invite.email,
            lieu: null,
            // 🔴 Une annulation doit porter une séquence SUPÉRIEURE à celle de
            // l'invitation, sinon le client la prend pour un doublon périmé et
            // ne retire rien.
            sequence: (c.iCalSequence ?? 0) + 1,
            methode: 'CANCEL',
          }),
        },
      })
    }

    if (existant) await db.appointment.delete({ where: { id: existant.id } })
    await db.notification.create({
      data: {
        userId,
        icon: 'atlas',
        color: '#EF4444',
        text: `${c.attendees?.[0]?.name ?? 'Un prospect'} a annulé le rendez-vous${
          c.cancellationReason ? ` : ${c.cancellationReason}` : ''
        }.${courrier.ok ? '' : " L'avis d'annulation N'EST PAS parti, préviens-le."}`,
        go: '/agenda',
      },
    })
    return NextResponse.json({
      ok: true,
      fait: existant ? 'supprimé' : 'inconnu, rien à supprimer',
      courrier: courrier.ok,
    })
  }

  if (evenement !== 'BOOKING_CREATED' && evenement !== 'BOOKING_RESCHEDULED') {
    return NextResponse.json({ ok: true, ignore: evenement })
  }

  const debut = c.startTime ? new Date(c.startTime) : null
  if (!debut || isNaN(debut.getTime())) {
    return NextResponse.json({ error: 'date de début illisible' }, { status: 400 })
  }
  const fin = c.endTime ? new Date(c.endTime) : null
  const invite = c.attendees?.[0]

  // ── le lieu, et il ne vient pas d'où on croit ────────────────────────────
  //
  // 🔴 Le webhook ne transporte PAS le lien de visioconférence : `location`
  // vaut `integrations:google:meet` et `metadata` arrive vide. Le 4 novembre
  // 2026, un prospect a donc reçu « On se retrouve ici :
  // integrations:google:meet ». On tente d'abord ce que Cal a bien voulu
  // donner, puis on demande l'événement à Google par son identifiant iCal.
  let visio = lienVisio(c)
  let lieuTexte = lieuLisible(c.location)
  if (!visio) {
    const g = await lieuDepuisGoogle({ userId, uidReservation: uid })
    visio = g.visio
    lieuTexte = lieuTexte ?? g.lieu
  }

  // ── le contact ────────────────────────────────────────────────────────────
  //
  // Même motif exactement que la page de réservation d'Atline
  // (`/api/booking/[slug]`) : deux chemins de réservation ne doivent pas
  // produire deux sortes de contacts.
  let contactId = existant?.contactId ?? null
  const business = await db.userMlmBusiness.findFirst({
    where: { userId, active: true },
    select: { id: true },
  })
  if (!contactId && business && invite?.email) {
    const deja = await db.contact.findFirst({
      where: { userId, email: { equals: invite.email, mode: 'insensitive' } },
      select: { id: true },
    })
    if (deja) {
      contactId = deja.id
    } else {
      const nom = (invite.name ?? invite.email).trim()
      const morceaux = nom.split(/\s+/)
      const prenom = morceaux[0] ?? ''
      const famille = morceaux.slice(1).join(' ')
      const cree = await db.contact.create({
        data: {
          userId,
          mlmBusinessId: business.id,
          kind: 'PROSPECT',
          name: nom,
          firstName: prenom || null,
          lastName: famille || null,
          initials: ((prenom[0] ?? '?') + (famille[0] ?? '')).toUpperCase(),
          accent: '#F97316',
          email: invite.email,
          source: 'RDV_INBOUND',
          prospectStage: 'PRESENTATION',
        },
        select: { id: true },
      })
      contactId = cree.id
    }
  }

  // ── le rendez-vous ────────────────────────────────────────────────────────
  const base = process.env.CAL_BASE_URL ?? 'https://cal.atline.ai'
  const replanifier = `${base}/booking/${uid}?changes=true`
  const champs = {
    userId,
    mlmBusinessId: business?.id ?? null,
    contactId,
    title: c.title ?? `Rendez-vous avec ${invite?.name ?? 'un prospect'}`,
    description: visio,
    startAt: debut,
    endAt: fin,
    type: typeDeLieu(c.location) as 'VISIO' | 'CALL' | 'PRESENTIEL' | 'AUTRE',
    calComEventId: uid,
    calComBookingUrl: replanifier,
  }

  if (existant) {
    await db.appointment.update({ where: { id: existant.id }, data: champs })
  } else {
    await db.appointment.create({ data: champs })
  }

  // 🔴 Une RELIVRAISON de Cal ne doit pas réécrire au prospect. On n'envoie
  // qu'à la première création, ou sur un vrai déplacement.
  const premiereFois = !existant && evenement === 'BOOKING_CREATED'
  const deplacement = evenement === 'BOOKING_RESCHEDULED'
  if (!premiereFois && !deplacement) {
    return NextResponse.json({ ok: true, fait: 'déjà connu, aucun courrier' })
  }

  const rendez: Rendez = {
    invite: invite?.name ?? '',
    hote: nomHote,
    typeNom: c.eventTitle ?? null,
    quoi: c.eventDescription ?? null,
    debut,
    fin,
    fuseau: invite?.timeZone || 'Europe/Paris',
    visio,
    // Jamais `c.location` brut : `lieuLisible` a déjà écarté les
    // `integrations:…`, et taire le lieu vaut mieux que l'écrire en jargon.
    lieu: visio ? null : lieuTexte,
    replanifier,
  }

  const corps = deplacement ? corpsDeplacement(rendez) : corpsConfirmation(rendez)

  // ── le courrier EST l'invitation ──────────────────────────────────────────
  //
  // 🔴 L'organisateur du `.ics` doit être l'adresse qui ENVOIE : c'est à elle
  // que le client du prospect adressera son « Oui ». On la lit donc chez
  // Google plutôt que de la déduire du compte Atline, qui peut être une tout
  // autre adresse.
  //
  // ⚠️ Hypothèse à surveiller : on suppose que la boîte raccordée à Atline et
  // l'agenda de destination de Cal sont le même compte Google. Ils le sont
  // aujourd'hui. S'ils divergeaient, la réponse du prospect arriverait dans
  // une boîte qui ne possède pas l'événement, et ne se rattacherait à rien.
  let invitation: { ics: string; methode: 'REQUEST' } | null = null
  if (boite?.email && invite?.email) {
    invitation = {
      methode: 'REQUEST',
      ics: construireIcs({
        uidReservation: uid,
        titre: champs.title,
        description: corps,
        debut,
        fin: fin ?? new Date(debut.getTime() + 30 * 60_000),
        organisateurNom: rendez.hote,
        organisateurEmail: boite.email,
        inviteNom: invite.name ?? '',
        inviteEmail: invite.email,
        lieu: visio ?? lieuTexte,
        // 🔴 On REPREND la séquence de Cal (`iCalSequence`, présente dans le
        // payload) plutôt que d'inventer la nôtre : les deux décrivent le même
        // événement, et une séquence qui diverge fait ignorer la mise à jour
        // comme un doublon périmé.
        sequence: c.iCalSequence ?? (deplacement ? 1 : 0),
      }),
    }
  }

  let courrier: { ok: boolean; message?: string } = { ok: false, message: 'aucune adresse' }
  if (invite?.email) {
    courrier = await envoyerTransactionnel({
      userId,
      destinataire: invite.email,
      sujet: deplacement ? sujetDeplacement(rendez) : sujetConfirmation(rendez),
      corps,
      contactId,
      origine: `cal:${evenement}`,
      invitation,
    })
  }

  // ── on le dit, dans les deux cas ──────────────────────────────────────────
  //
  // 🔴 Surtout quand le courrier n'est pas parti : le distributeur croirait
  // que son prospect a été confirmé alors que personne ne lui a écrit.
  await db.notification.create({
    data: {
      userId,
      icon: 'atlas',
      color: courrier.ok ? '#22C55E' : '#EF4444',
      text: courrier.ok
        ? `${invite?.name ?? 'Un prospect'} a réservé. Le mot de confirmation est parti de ta boîte.`
        : `${invite?.name ?? 'Un prospect'} a réservé, mais la confirmation N'EST PAS partie (${
            courrier.message ?? 'raison inconnue'
          }). Écris-lui.`,
      go: '/agenda',
    },
  })

  return NextResponse.json({ ok: true, courrier: courrier.ok, fait: deplacement ? 'déplacé' : 'créé' })
}
