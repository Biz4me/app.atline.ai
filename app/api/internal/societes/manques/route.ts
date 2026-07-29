import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * CE QUI MANQUE VRAIMENT — et seulement là où quelqu'un travaille.
 *
 * On a 697 sociétés en base et trois distributeurs. Enrichir les 694 autres,
 * c'est financer un stock qui ne sert à personne. Cet état des lieux ne
 * regarde donc QUE les sociétés réellement utilisées, et dit pour chacune
 * ce qui manque — pas ce qu'on pourrait imaginer manquer.
 *
 * C'est lui qui décidera s'il faut automatiser une recherche, et pour
 * combien de sociétés exactement. Pas une intuition : un tableau.
 */
export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret')
  if (!process.env.INTERNAL_API_SECRET || secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  // Les sociétés où quelqu'un est réellement inscrit.
  const activites = await db.userMlmBusiness.findMany({
    where: { companyId: { not: null } },
    select: {
      id: true, userId: true, mlmName: true, companyId: true,
      company: { select: { id: true, name: true, fiche: true } },
    },
  })

  const parSociete = new Map<string, { nom: string; distributeurs: Set<string>; activites: string[]; fiche: unknown }>()
  for (const a of activites) {
    if (!a.companyId) continue
    const e = parSociete.get(a.companyId) ?? {
      nom: a.company?.name ?? a.mlmName,
      distributeurs: new Set<string>(),
      activites: [] as string[],
      fiche: a.company?.fiche,
    }
    e.distributeurs.add(a.userId)
    e.activites.push(a.id)
    parSociete.set(a.companyId, e)
  }

  const lignes = []
  for (const [companyId, e] of parSociete) {
    const [produits, liens] = await Promise.all([
      db.mlmProduct.count({ where: { companyId, status: 'PUBLISHED' } }),
      db.toolboxLink.findMany({
        where: { mlmBusinessId: { in: e.activites }, linkType: { in: ['BOUTIQUE', 'PARRAINAGE'] } },
        select: { linkType: true, url: true, statutVerif: true, verifieAt: true },
      }),
    ])

    const fiche = (e.fiche ?? {}) as Record<string, unknown>
    const parrainages = liens.filter((l) => l.linkType === 'PARRAINAGE' && l.url)
    const boutiques = liens.filter((l) => l.linkType === 'BOUTIQUE' && l.url)

    lignes.push({
      societe: e.nom,
      distributeurs: e.distributeurs.size,
      // ce que LES DISTRIBUTEURS ont fourni — la source fiable
      liensParrainage: `${parrainages.length}/${e.activites.length}`,
      liensBoutique: `${boutiques.length}/${e.activites.length}`,
      liensVerifiesOK: liens.filter((l) => l.statutVerif === 'OK').length,
      liensAVerifier: liens.filter((l) => l.url && !l.verifieAt).length,
      liensEnDefaut: liens.filter((l) => l.statutVerif && l.statutVerif !== 'OK').length,
      // ce que NOUS croyons savoir — à compléter seulement si ça manque ici
      produits,
      aUnPitch: Boolean((fiche.recit as { pitch?: string } | undefined)?.pitch),
      aDesObjections: Boolean(fiche.objections),
      aLaRemuneration: Boolean(fiche.remuneration),
      aLaConformite: Boolean(fiche.conformite),
    })
  }

  lignes.sort((a, b) => b.distributeurs - a.distributeurs)

  const totalSocietes = await db.mlmCompany.count()
  return NextResponse.json({
    lecture:
      'Seules les sociétés où un distributeur est réellement inscrit. ' +
      'Les liens viennent des distributeurs (fiables) ; les produits et la fiche viennent de nous (à vérifier).',
    societesEnBase: totalSocietes,
    societesUtilisees: lignes.length,
    aEnrichirVraiment: lignes.filter((l) => !l.produits || !l.aDesObjections).length,
    societes: lignes,
  })
}
