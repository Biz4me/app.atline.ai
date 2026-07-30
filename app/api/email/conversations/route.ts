import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { redigerPremier } from '@/lib/gmail/orion'
import { envoyerMail } from '@/lib/gmail/envoyer'
import { programmerProchaine } from '@/lib/gmail/sequence'

export const dynamic = 'force-dynamic'

/**
 * OUVRIR UNE CONVERSATION AVEC UN CONTACT.
 *
 * C'est la porte d'entrée qui manquait : jusqu'ici toute la machinerie
 * existait mais rien ne pouvait démarrer un échange.
 *
 * Deux temps, volontairement séparés :
 *
 *   PUT  — Orion propose un texte. Rien n'est enregistré, rien ne part.
 *   POST — le distributeur envoie, après avoir relu et corrigé s'il veut.
 *
 * On ne fusionne pas les deux. Écrire à quelqu'un qu'il connaît engage sa
 * relation autant que sa réputation d'expéditeur : le premier message se
 * relit. Ensuite seulement, Orion prend la main tout seul.
 */

/** Le brouillon. Ne crée rien, n'envoie rien. */
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { contactId } = await req.json().catch(() => ({ contactId: null }))
  if (!contactId) return NextResponse.json({ error: 'contactId requis' }, { status: 400 })

  const redaction = await redigerPremier(session.user.id, contactId)
  if (!redaction) return NextResponse.json({ error: 'brouillon indisponible' }, { status: 502 })

  return NextResponse.json({ corps: redaction.texte })
}

/** L'envoi, avec le texte que le distributeur a validé. */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  const body = await req.json().catch(() => null)
  const contactId: string | undefined = body?.contactId
  const sujet: string = (body?.sujet ?? '').trim()
  const corps: string = (body?.corps ?? '').trim()
  if (!contactId || !sujet || !corps) {
    return NextResponse.json({ error: 'contactId, sujet et corps requis' }, { status: 400 })
  }

  const contact = await db.contact.findFirst({
    where: { id: contactId, userId },
    select: { email: true },
  })
  if (!contact?.email) {
    return NextResponse.json({ error: 'ce contact n’a pas d’adresse e-mail' }, { status: 400 })
  }

  const envoi = await envoyerMail({ userId, destinataire: contact.email, sujet, corps, contactId })
  if (!envoi.ok) {
    return NextResponse.json({ error: envoi.message, motif: envoi.motif }, { status: 400 })
  }

  // C'est ici que la séquence naît. `envoyerMail` ne l'appelle délibérément
  // pas : au moment où l'envoi revient, une relance en cours n'est pas encore
  // marquée envoyée, et le comptage reprogrammerait celle qui vient de partir.
  const etape = await programmerProchaine(envoi.filId)

  return NextResponse.json({
    ok: true,
    filId: envoi.filId,
    adresseEnvoi: envoi.adresseEnvoi,
    // Le distributeur doit savoir qu'une relance est déjà prévue, et quand.
    relanceProgrammee: etape,
  })
}
