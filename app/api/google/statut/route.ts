import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { connexionDe, revoquer } from '@/lib/google/connexion'
import { cesserDeSurveiller } from '@/lib/gmail/surveiller'
import { CAPACITES, capacitesCouvertes, type Capacite } from '@/lib/google/oauth'

export const dynamic = 'force-dynamic'

/**
 * L'ÉTAT DE LA CONNEXION GOOGLE — tout ce que l'écran doit pouvoir dire.
 *
 * Cette route est le contrat de la phase 7 (les écrans). Elle répond à quatre
 * questions que le distributeur a le droit de se poser, et auxquelles une app
 * qui écrit en son nom doit répondre sans qu'il ait à les poser :
 *
 *   • Depuis quelle adresse mes prospects me voient-ils ?
 *   • Est-ce bien celle que je crois ?
 *   • Qu'est-ce qu'Atline a le droit de faire, exactement ?
 *   • Qu'est-ce qui est parti en mon nom ?
 */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  const [conn, compte, acces] = await Promise.all([
    connexionDe(userId),
    db.user.findUnique({ where: { id: userId }, select: { email: true } }),
    db.googleAcces.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { action: true, adresse: true, ressource: true, detail: true, createdAt: true },
    }),
  ])

  const couvertes = capacitesCouvertes(conn?.scope)
  const adresseEnvoi = conn?.email ?? null

  return NextResponse.json({
    connecte: !!conn,
    // L'adresse que le prospect verra. Volontairement nommée autrement que
    // « email » pour qu'aucun écran ne la confonde avec celle du compte.
    adresseEnvoi,
    compteAtline: compte?.email ?? null,
    // Signalé, jamais bloquant : s'inscrire perso et écrire pro est légitime.
    adresseDifferente:
      !!adresseEnvoi && compte?.email?.toLowerCase() !== adresseEnvoi.toLowerCase(),
    capacites: (Object.keys(CAPACITES) as Capacite[]).map((c) => ({
      cle: c,
      libelle: CAPACITES[c].libelle,
      pourquoi: CAPACITES[c].pourquoi,
      active: couvertes.includes(c),
    })),
    // La surveillance des réponses. Sans elle, le distributeur écrit dans le
    // vide sans le savoir : c'est l'information la plus importante de la carte
    // du canal, avant même les permissions.
    surveillance: conn?.watchExpiration
      ? { active: conn.watchExpiration > new Date(), expireLe: conn.watchExpiration.toISOString() }
      : { active: false, expireLe: null },
    // Une seule connexion Google : la révoquer coupe TOUT, pas seulement le
    // canal depuis lequel on clique. L'écran doit le dire avant de le faire.
    revocationCoupeTout: couvertes.length > 1,
    derniersAcces: acces,
  })
}

/**
 * Couper l'accès. On prévient Google, on ne se contente pas d'oublier le jeton
 * de notre côté — sinon l'app affiche « déconnecté » pendant que
 * l'autorisation reste vivante dans le compte Google du distributeur.
 */
export async function DELETE() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // On coupe la surveillance AVANT de révoquer : après, le jeton nécessaire
  // pour la couler proprement n'existe plus, et Google continuerait d'émettre
  // des notifications dans le vide pendant des jours.
  await cesserDeSurveiller(session.user.id)
  const confirmeParGoogle = await revoquer(session.user.id)
  return NextResponse.json({ ok: true, confirmeParGoogle })
}
