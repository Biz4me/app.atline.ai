import { db } from '@/lib/db'

/**
 * Où en est un distributeur, compétence par compétence.
 *
 * Deux sources disent où ça coince, et elles ne se valent pas :
 *   · UserCompetence — MESURÉ par les simulations Aria, avec un nombre
 *     d'observations qui dit si le chiffre est fiable ;
 *   · AtlasFact `bloque_sur` — OBSERVÉ par le coach en conversation. De loin
 *     la plus abondante (141 faits contre 3 niveaux au 17 octobre), mais sans
 *     note : on en dérive une pénalité d'autant plus forte que le blocage
 *     revient souvent.
 *
 * Ce calcul vivait en double — dans le plan du jour et nulle part ailleurs.
 * Il est ici pour que l'écran qui AFFICHE le niveau et le plan qui RECOMMANDE
 * ne puissent jamais dire deux choses différentes.
 */

/** Vu 1 fois → 45, vu 2 → 35, vu 4 et plus → 10. Jamais en dessous. */
const penalite = (observations: number) => Math.max(10, 55 - observations * 10)

/** Sous ce seuil, on considère que ça coince et qu'il y a quelque chose à faire. */
export const SEUIL_FAIBLESSE = 60

export type EtatCompetence = {
  id: string
  label: string
  position: number
  /** 0-100, ou null si rien ne permet encore d'en juger. */
  niveau: number | null
  /** Nombre de simulations qui soutiennent le niveau (0 si déduit d'une conversation). */
  mesures: number
  source: 'simulation' | 'conversation' | null
  module: { id: string; title: string } | null
  exercice: { slug: string; titre: string } | null
}

export async function etatDesCompetences(userId: string): Promise<EtatCompetence[]> {
  const [competences, niveaux, blocages] = await Promise.all([
    db.competence.findMany({
      orderBy: { position: 'asc' },
      select: {
        id: true, label: true, position: true,
        // Seuls les modules PUBLIÉS comptent : renvoyer vers un brouillon
        // serait renvoyer vers rien (cf. la formation restée invisible).
        modules: { where: { published: true }, select: { id: true, title: true }, take: 1 },
        scenarios: {
          where: { actif: true }, orderBy: { position: 'asc' },
          select: { slug: true, titre: true }, take: 1,
        },
      },
    }),
    db.userCompetence.findMany({
      where: { userId },
      select: { competenceId: true, niveau: true, mesures: true },
    }).catch(() => []),
    db.atlasFact.groupBy({
      by: ['competenceId'],
      where: {
        userId, contactId: null, predicate: 'bloque_sur',
        status: 'active', competenceId: { not: null },
      },
      _max: { supportCount: true },
    }).catch(() => [] as { competenceId: string | null; _max: { supportCount: number | null } }[]),
  ])

  const mesure = new Map(niveaux.map((n) => [n.competenceId, n]))
  const observe = new Map(
    blocages.filter((b) => b.competenceId).map((b) => [b.competenceId as string, b._max.supportCount ?? 1]),
  )

  const etat = competences.map((c): EtatCompetence => {
    const m = mesure.get(c.id)
    const o = observe.get(c.id)
    // La mesure prime sur l'observation quand les deux existent, SAUF si le
    // blocage est plus sévère : un défaut qui revient quatre fois en
    // conversation n'est pas démenti par une bonne simulation isolée.
    const parMesure = m && m.mesures > 0 ? m.niveau : null
    const parObservation = o !== undefined ? penalite(o) : null
    const niveau = parMesure !== null && parObservation !== null
      ? Math.min(parMesure, parObservation)
      : parMesure ?? parObservation
    return {
      id: c.id,
      label: c.label,
      position: c.position,
      niveau,
      mesures: m?.mesures ?? 0,
      source: niveau === null ? null : (niveau === parMesure ? 'simulation' : 'conversation'),
      module: c.modules[0] ?? null,
      exercice: c.scenarios[0] ?? null,
    }
  })

  // Le plus faible d'abord — c'est ce qu'on vient chercher. Ce qui n'a jamais
  // été mesuré va à la fin : une case vide n'est pas une mauvaise note.
  return etat.sort((a, b) => {
    if (a.niveau === null && b.niveau === null) return a.position - b.position
    if (a.niveau === null) return 1
    if (b.niveau === null) return -1
    return a.niveau - b.niveau
  })
}
