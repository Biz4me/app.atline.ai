import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { proposeProfileUpdates } from '@/lib/atlas-memory'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * CE QU'IL Y AURAIT À GARDER APRÈS UN ÉCHANGE.
 *
 * ── 🧭 UNE ROUTE MINCE, PARCE QUE TOUT EXISTE DÉJÀ ───────────────────────
 *
 * `proposeProfileUpdates` appelle le service IA (`/api/atlas/propose-updates`)
 * depuis juillet, et la passe de nuit s'en sert pour écrire des cartes
 * `[[ACTION]]` à confirmer au réveil. Rien à réécrire : V2 n'a pas de clé de
 * modèle, et dupliquer le cerveau donnerait deux implémentations sur la même
 * base — exactement le piège des fichiers jumeaux.
 *
 * Cette route ne fait donc que **deux** choses que le service ne peut pas
 * faire : lui donner le profil DÉJÀ déclaré (sans quoi il propose ce qu'on
 * sait déjà), et ne rien écrire.
 *
 * ── 🔴 CE QU'ELLE NE FAIT PAS : ÉCRIRE ───────────────────────────────────
 *
 * Pas une ligne en base. C'est la doctrine de la maison, et c'est ce qui rend
 * la proposition acceptable : **le coach propose, le distributeur tranche.**
 * L'écriture passe par le geste de la personne, dans V2, par `modifierMoi`.
 *
 * ── ⚠️ POURQUOI LE FILTRE EST CHEZ L'APPELANT ────────────────────────────
 *
 * Mesuré sur les 12 propositions que la nuit a produites depuis juillet : le
 * service range des faits de CONTACT dans le profil de la personne —
 * `audience: "Jean, contact le plus avancé"`, `niveau: "Partenaire depuis
 * juillet, 90 jours sans contact"`. C'est le défaut déjà connu de la carte de
 * confirmation. V2 ne retient donc que les champs de SA table, et uniquement
 * ceux qui sont vides : ce qui ne correspond à rien tombe par construction.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret')
  if (!process.env.INTERNAL_API_SECRET || secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const userId = typeof body?.userId === 'string' ? body.userId : ''
  const echange = typeof body?.echange === 'string' ? body.echange.trim() : ''
  if (!userId || !echange) return NextResponse.json({ propositions: [] })

  // ⚠️ Un échange d'une phrase ne porte rien à garder, et l'appel au modèle
  // coûterait plus que ce qu'il rapporte.
  if (echange.length < 120) return NextResponse.json({ propositions: [] })

  const u = await db.user.findUnique({
    where: { id: userId },
    select: { firstName: true, bio: true, profession: true, city: true, coaching: true },
  })
  if (!u) return NextResponse.json({ propositions: [] })

  // La RÉFÉRENCE : ce qu'on sait déjà. Sans elle, le service repropose ce qui
  // est déjà en base, et la personne voit des cartes qui ne lui apprennent
  // rien — le plus sûr moyen de ne plus les lire.
  const co = (u.coaching ?? null) as Record<string, string> | null
  const reference = [
    u.firstName && `Prénom : ${u.firstName}`,
    u.profession && `Métier : ${u.profession}`,
    u.city && `Ville : ${u.city}`,
    u.bio && `En deux mots : ${u.bio}`,
    co?.why && `Son pourquoi : ${co.why}`,
    co?.background && `Son parcours : ${co.background}`,
    co?.passions && `Ses passions : ${co.passions}`,
    co?.availability && `Sa disponibilité : ${co.availability}`,
    co?.level && `Son expérience : ${co.level}`,
  ].filter(Boolean).join('\n')

  const brutes = await proposeProfileUpdates(reference, echange)

  // On ne rend que ce qui vise la PERSONNE. `activite` a son propre écran et
  // ses propres champs ; les mélanger ici ferait écrire un objectif de vente
  // dans une biographie.
  return NextResponse.json({
    propositions: brutes
      .filter((p) => p.cible === 'profile' && p.champ && p.valeur?.trim())
      .map((p) => ({ champ: p.champ, valeur: p.valeur.trim() })),
  })
}
