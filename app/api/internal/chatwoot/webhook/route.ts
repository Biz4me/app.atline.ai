import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { traiterEvenement } from '@/lib/chatwoot/repondre'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * L'OREILLE D'ORION — ce que Chatwoot nous dit quand quelqu'un répond.
 *
 * Sans cet endpoint, Chatwoot serait un entrepôt muet : les prospects
 * écriraient, et personne ne le saurait. C'est la pièce qui décide si
 * Chatwoot peut porter Orion ou s'il reste une bibliothèque de plus.
 *
 * Trois règles qui évitent les catastrophes :
 *
 *   1. ON IGNORE NOS PROPRES MESSAGES. Chatwoot notifie aussi les envois
 *      sortants — répondre à ceux-là, c'est une boucle infinie où l'agent
 *      se parle à lui-même, factures d'IA à l'appui.
 *
 *   2. ON RÉPOND VITE, ON TRAVAILLE APRÈS. Chatwoot réessaie si on met
 *      trop de temps : deux réponses au même prospect. On accuse réception
 *      d'abord, on réfléchit ensuite.
 *
 *   3. ON NE FAIT JAMAIS CONFIANCE À LA CHARGE UTILE. Elle vient du réseau ;
 *      le compte, la conversation et l'expéditeur sont vérifiés avant usage.
 */

type ChargeChatwoot = {
  event?: string
  id?: number
  content?: string
  message_type?: string | number
  created_at?: string
  account?: { id?: number; name?: string }
  conversation?: { id?: number; status?: string; channel?: string }
  inbox?: { id?: number; name?: string; channel_type?: string }
  sender?: { id?: number; name?: string; identifier?: string | null; email?: string | null; phone_number?: string | null }
}

/** Un message entrant = écrit par le prospect. Chatwoot le dit de deux façons selon la version. */
function estEntrant(charge: ChargeChatwoot): boolean {
  const t = charge.message_type
  return t === 'incoming' || t === 0
}

export async function POST(req: NextRequest) {
  // Le secret est propre à chaque webhook Chatwoot ; il voyage en en-tête.
  const attendu = process.env.CHATWOOT_WEBHOOK_SECRET
  const recu = req.headers.get('x-chatwoot-signature') || req.headers.get('x-internal-secret')
  if (attendu && recu !== attendu) {
    return NextResponse.json({ error: 'signature invalide' }, { status: 403 })
  }

  let charge: ChargeChatwoot
  try {
    charge = (await req.json()) as ChargeChatwoot
  } catch {
    return NextResponse.json({ error: 'charge illisible' }, { status: 400 })
  }

  // Trace lisible : c'est elle qui nous apprend la forme réelle des événements.
  console.log('[chatwoot]', JSON.stringify({
    event: charge.event,
    compte: charge.account?.id,
    conversation: charge.conversation?.id,
    boite: charge.inbox?.channel_type,
    sens: charge.message_type,
    de: charge.sender?.name,
    identifiant: charge.sender?.identifier,
    extrait: (charge.content ?? '').slice(0, 80),
  }))

  if (charge.event !== 'message_created') {
    return NextResponse.json({ ok: true, ignore: `événement ${charge.event}` })
  }
  // Règle 1 — nos propres messages ne nous concernent pas.
  if (!estEntrant(charge)) {
    return NextResponse.json({ ok: true, ignore: 'message sortant' })
  }

  const comptePlateforme = charge.account?.id
  const idConversation = charge.conversation?.id
  if (!comptePlateforme || !idConversation) {
    return NextResponse.json({ ok: true, ignore: 'compte ou conversation absent' })
  }

  // À qui appartient ce compte Chatwoot ? Le lien vit dans UserMlmBusiness.
  const proprietaire = await db.userMlmBusiness.findFirst({
    where: { chatwootAccountId: comptePlateforme },
    select: { userId: true, id: true },
  })
  if (!proprietaire) {
    console.warn('[chatwoot] compte inconnu :', comptePlateforme)
    return NextResponse.json({ ok: true, ignore: 'compte non rattaché' })
  }

  // Et à quel contact Atline ? On a posé notre propre identifiant sur le
  // contact Chatwoot au moment de le créer — c'est lui qui fait le pont.
  const identifiant = charge.sender?.identifier ?? null
  const contact = identifiant
    ? await db.contact.findFirst({
        where: { id: identifiant, userId: proprietaire.userId },
        select: { id: true, name: true },
      })
    : null

  // Règle 2 — on accuse réception tout de suite. Le travail d'Orion viendra
  // d'un traitement séparé, qui lit ce qu'on vient d'enregistrer.
  try {
    const trace = await db.chatwootEvenement.create({
      data: {
        userId: proprietaire.userId,
        accountId: comptePlateforme,
        conversationId: idConversation,
        messageId: charge.id ?? null,
        contactId: contact?.id ?? null,
        canal: charge.inbox?.channel_type ?? null,
        expediteur: charge.sender?.name ?? null,
        contenu: (charge.content ?? '').slice(0, 4000),
        charge: charge as never,
      },
      select: { id: true },
    })
    // Orion travaille tout de suite, mais SANS faire attendre Chatwoot :
    // on a déjà la trace, le cron rattrapera si ça échoue.
    void traiterEvenement(trace.id).catch(() => {})
  } catch (e) {
    console.error('[chatwoot] enregistrement impossible', e)
    // On répond quand même 200 : sinon Chatwoot réessaie et le prospect
    // recevra deux réponses. Mieux vaut une trace perdue qu'un doublon.
  }

  return NextResponse.json({
    ok: true,
    recu: { conversation: idConversation, contact: contact?.name ?? '(inconnu)' },
  })
}
