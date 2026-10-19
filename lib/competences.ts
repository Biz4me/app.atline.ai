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

/**
 * LA SÉVÉRITÉ D'UN BLOCAGE OBSERVÉ.
 *
 * L'ancienne formule — `max(10, 55 - vu*10)` — SATURAIT dès la cinquième
 * observation. Constaté le 19 octobre : `objections` vu **15** fois et
 * `invitation` vu **7** à égalité, départagés par la position du module.
 *
 * `180 / (vu + 3)` ne sature jamais, garde les rendements décroissants, et
 * rejoint l'ancienne courbe aux deux bouts : vu 1 → 45, vu 15 → 10.
 *
 *   vu  1 → 45     vu  4 → 26     vu 10 → 14
 *   vu  2 → 36     vu  5 → 23     vu 15 → 10
 *   vu  3 → 30     vu  7 → 18     vu 30 → 5
 */
const penalite = (observations: number) =>
  Math.max(5, Math.round(180 / (Math.max(1, observations) + 3)))

/**
 * CE QUI EST VIEUX PÈSE MOINS.
 *
 * Sans ça, un blocage de juillet décide encore de la leçon du jour. Vu en
 * production : `conclusion`, dernière observation il y a **97 jours**,
 * pesait autant qu'un défaut d'hier. Un coach qui ne voit pas qu'on a
 * progressé n'est pas un coach.
 *
 * On n'EFFACE pas : l'observation reste lisible, elle cesse de peser.
 */
function fraicheur(jours: number): number {
  if (jours <= 30) return 1
  if (jours >= 120) return 0
  return (120 - jours) / 90
}

/** Le seuil neutre : au-dessus, on ne dérange personne. */
const NEUTRE = 55

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
      // `lastSeenAt` autant que le compteur : sans la date, un défaut de
      // juillet décide encore de la leçon d'aujourd'hui.
      _max: { supportCount: true, lastSeenAt: true },
    }).catch(() => [] as { competenceId: string | null; _max: { supportCount: number | null; lastSeenAt: Date | null } }[]),
  ])

  const mesure = new Map(niveaux.map((n) => [n.competenceId, n]))
  const maintenant = Date.now()
  const observe = new Map(
    blocages.filter((b) => b.competenceId).map((b) => {
      const vu = b._max.supportCount ?? 1
      const jours = b._max.lastSeenAt
        ? Math.floor((maintenant - new Date(b._max.lastSeenAt).getTime()) / 86_400_000)
        : 999
      // Une observation périmée remonte vers le neutre au lieu de disparaître
      // d'un coup : la bascule serait arbitraire.
      return [b.competenceId as string, NEUTRE - (NEUTRE - penalite(vu)) * fraicheur(jours)] as const
    }),
  )

  const etat = competences.map((c): EtatCompetence => {
    const m = mesure.get(c.id)
    const o = observe.get(c.id)
    const parMesure = m && m.mesures > 0 ? m.niveau : null
    const parObservation = o !== undefined ? Math.round(o) : null

    // 🔴 QUI L'EMPORTE, DE LA MESURE OU DE L'OBSERVATION ?
    //
    // Le `min()` d'origine laissait toujours gagner le plus sévère : « un
    // défaut qui revient quatre fois en conversation n'est pas démenti par une
    // bonne simulation isolée ». Juste pour UNE simulation. Faux à seize.
    //
    // Vu en production : `invitation`, niveau **42 mesuré sur 16 simulations**,
    // tiré à 10 par sept mentions en conversation, et recommandé n°1 devant
    // `objections` vu quinze fois le jour même. La mesure la plus solide du jeu
    // écrasée par du bavardage.
    //
    // À partir de cinq simulations, la mesure DIT quelque chose : on la suit.
    // En dessous, elle reste une impression, et le plus sévère gagne.
    const SIMULATIONS_FIABLES = 5
    const niveau = parMesure !== null && parObservation !== null
      ? (m!.mesures >= SIMULATIONS_FIABLES ? parMesure : Math.min(parMesure, parObservation))
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
