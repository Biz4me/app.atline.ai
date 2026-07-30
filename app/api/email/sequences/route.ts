import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { aValider, NB_ETAPES, INTERVALLES } from '@/lib/gmail/sequence'
import { envoisDuJour, PLAFOND_QUOTIDIEN } from '@/lib/gmail/envoyer'

export const dynamic = 'force-dynamic'

/**
 * QUI EN EST OÙ — la vue que réclamait Patrice : savoir d'un coup d'œil qui
 * est en étape 1, 3, 5 ou 7, et ce qu'il y a à décider aujourd'hui.
 *
 * Deux listes volontairement distinctes, parce qu'elles ne demandent pas la
 * même chose :
 *
 *   • `aValider` : ce qui attend un oui MAINTENANT. C'est du travail.
 *   • `enCours`  : tous les prospects en séquence et leur avancement.
 *                  C'est de l'information, pas une liste de tâches.
 *
 * Les mélanger ferait apparaître trente lignes là où trois demandent une
 * décision, et la vue deviendrait un mur qu'on n'ouvre plus.
 */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  const [decisions, fils, envoyesAujourdhui] = await Promise.all([
    aValider(userId),
    db.emailFil.findMany({
      where: { userId, issue: null, humainRepris: false },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    }),
    envoisDuJour(userId),
  ])

  const relances = fils.length
    ? await db.relance.findMany({
        where: { emailFilId: { in: fils.map((f) => f.id) }, channel: 'email', etape: { not: null } },
        select: { emailFilId: true, etape: true, status: true, dueAt: true },
      })
    : []

  const contacts = await db.contact.findMany({
    where: { id: { in: fils.map((f) => f.contactId).filter(Boolean) as string[] } },
    select: { id: true, name: true, firstName: true, lastName: true },
  })
  const nomDe = new Map(
    contacts.map((c) => [c.id, c.name || [c.firstName, c.lastName].filter(Boolean).join(' ') || 'Contact']),
  )

  const enCours = fils.map((f) => {
    const siennes = relances.filter((r) => r.emailFilId === f.id)
    const faites = siennes.filter((r) => r.status === 'SENT').length
    const prochaine = siennes.find((r) => r.status === 'PENDING' || r.status === 'VALIDATED')
    return {
      filId: f.id,
      contactId: f.contactId,
      contact: f.contactId ? nomDe.get(f.contactId) ?? 'Contact' : 'Contact',
      destinataire: f.destinataire,
      sujet: f.sujet,
      adresseEnvoi: f.adresseEnvoi,
      // « Relance 2 sur 4 déjà partie » : c'est le chiffre que le
      // distributeur cherche quand il ouvre cet écran.
      relancesFaites: faites,
      surTotal: NB_ETAPES,
      prochaineEtape: prochaine?.etape ?? null,
      prochaineLe: prochaine?.dueAt.toISOString() ?? null,
      enFile: prochaine?.status === 'VALIDATED',
      // Quatre relances sans réponse : le fil se tait, il n'est pas perdu.
      dormant: faites >= NB_ETAPES && !prochaine,
      dernierEnvoiAt: f.dernierEnvoiAt?.toISOString() ?? null,
    }
  })

  return NextResponse.json({
    cadence: INTERVALLES,
    nbEtapes: NB_ETAPES,
    // Le distributeur doit voir sa marge du jour : c'est ce qui explique
    // qu'une relance validée puisse attendre.
    envoisDuJour: envoyesAujourdhui,
    plafondQuotidien: PLAFOND_QUOTIDIEN,
    aValider: decisions,
    enCours,
  })
}
