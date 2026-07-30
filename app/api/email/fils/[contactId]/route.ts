import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { historiqueDuFil } from '@/lib/gmail/lire'

export const dynamic = 'force-dynamic'

/**
 * LA CONVERSATION E-MAIL AVEC UN PROSPECT.
 *
 * À ne pas confondre avec `/chats/[contactId]`, qui est le fil où le
 * distributeur parle à ATLAS À PROPOS de ce contact. Ici, c'est l'échange
 * réel avec la personne.
 *
 * Les messages sont relus chez Gmail plutôt que reconstitués depuis nos
 * traces : c'est la seule version complète et exacte, et elle inclut ce que le
 * distributeur a pu écrire lui-même depuis son téléphone. Chaque ouverture est
 * donc une LECTURE, journalisée comme telle — c'est cohérent avec ce qu'on a
 * déclaré à Google, et c'est la vérité.
 */
export async function GET(_: Request, ctx: { params: Promise<{ contactId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id
  const { contactId } = await ctx.params

  const [contact, fil] = await Promise.all([
    db.contact.findFirst({
      where: { id: contactId, userId },
      select: { id: true, name: true, firstName: true, email: true },
    }),
    db.emailFil.findFirst({
      where: { userId, contactId },
      orderBy: { updatedAt: 'desc' },
    }),
  ])
  if (!contact) return NextResponse.json({ error: 'contact introuvable' }, { status: 404 })

  const identite = {
    contactId: contact.id,
    nom: contact.name || [contact.firstName].filter(Boolean).join(' ') || 'Contact',
    adresse: fil?.destinataire ?? contact.email ?? null,
  }

  // Aucun échange encore : on le dit, l'écran proposera d'en ouvrir un.
  if (!fil) return NextResponse.json({ ...identite, fil: null, messages: [] })

  const relances = await db.relance.findMany({
    where: { emailFilId: fil.id, channel: 'email', etape: { not: null } },
    select: { etape: true, status: true, dueAt: true },
    orderBy: { dueAt: 'asc' },
  })

  const messages = fil.gmailThreadId ? await historiqueDuFil(userId, fil.gmailThreadId, 30) : []

  return NextResponse.json({
    ...identite,
    fil: {
      id: fil.id,
      sujet: fil.sujet,
      adresseEnvoi: fil.adresseEnvoi,
      echanges: fil.echanges,
      issue: fil.issue,
      humainRepris: fil.humainRepris,
      dernierEnvoiAt: fil.dernierEnvoiAt?.toISOString() ?? null,
      dernierRecuAt: fil.dernierRecuAt?.toISOString() ?? null,
      relancesFaites: relances.filter((r) => r.status === 'SENT').length,
      prochaineRelance: relances.find((r) => r.status === 'PENDING' || r.status === 'VALIDATED') ?? null,
    },
    messages,
  })
}
