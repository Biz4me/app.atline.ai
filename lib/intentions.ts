import { db } from '@/lib/db'

/**
 * LA MÉMOIRE PROSPECTIVE D'ATLAS.
 *
 * 🔴 SE SOUVENIR D'AGIR EST UNE AUTRE FACULTÉ QUE SE SOUVENIR D'UN FAIT.
 *
 * « Quand Mélanie reparle de son hésitation, ressors-lui la leçon sur les
 * hésitants » n'est pas un fait : c'est une instruction conditionnée à un
 * événement. Rangée en prose dans le profil, elle se dilue à mesure que le
 * contexte s'allonge, et le modèle finit soit par l'oublier, soit par la
 * ressortir à tort.
 *
 * On la compile donc hors du modèle, en champs vérifiables par machine.
 *
 * 🔴 AUCUN APPEL DE MODÈLE DANS CE FICHIER. La correspondance est sur le
 * chemin de réponse : elle doit être gratuite et bornée, sinon elle devient
 * une raison de plus pour Atlas de répondre lentement.
 *
 * ⚠️ DISTINCTION AVEC LA RELANCE, qui existe déjà :
 *     Relance  = une DATE      « rappeler Mélanie jeudi »
 *     Intention = un ÉVÉNEMENT « quand elle reparle de son hésitation »
 * Une date se met dans un agenda. Un événement ne s'y met pas.
 */

/** Jamais plus de trois rappels sur un même tour : au-delà c'est du harcèlement. */
const MAX_PAR_TOUR = 3
/** Fenêtre de candidats. Large devant la coupe, bornée devant une base qui grossit. */
const CANDIDATS_MAX = 60

const MOTS_VIDES = new Set([
  'de','la','le','les','un','une','des','du','et','au','aux','en','avec','sur',
  'dans','par','se','sa','son','ses','est','etre','avoir','plus','pas','ne',
  'ce','cette','qui','que','pour','leur','mes','je','tu','il','elle','on',
])

/** Les mots pleins d'un texte, sans accents ni ponctuation. */
function motsPleins(s: string): Set<string> {
  const plat = s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const tous = plat.match(/[a-z0-9]+/g) ?? []
  const pleins = tous.filter((m) => m.length > 2 && !MOTS_VIDES.has(m))
  return new Set(pleins.length ? pleins : tous)
}

export type IntentionTombee = { id: string; libelle: string; creeeLe: Date }

/**
 * Ce qui tombe sur ce tour de parole, et met à jour le cycle de vie.
 *
 * 🔴 TOUS LES DÉCLENCHEURS DOIVENT ÊTRE PRÉSENTS, pas un seul. Un déclencheur
 * unique et courant (« appel ») ferait tomber l'intention à chaque phrase :
 * l'exigence du ET est ce qui rend le rappel pertinent au lieu d'insistant.
 *
 * ⚠️ Une panne ici ne doit JAMAIS manger un tour : tout est enveloppé, et un
 * échec rend une liste vide plutôt qu'une erreur.
 */
export async function intentionsQuiTombent(
  userId: string,
  contactId: string | null,
  tour: string,
): Promise<IntentionTombee[]> {
  try {
    const maintenant = new Date()
    const candidates = await db.atlasIntention.findMany({
      where: {
        userId,
        etat: { in: ['ARMEE', 'TOMBEE'] },
        // Une intention bornée à un contact ne tombe que dans son fil ;
        // une intention générale tombe partout.
        OR: [{ contactId: null }, ...(contactId ? [{ contactId }] : [])],
      },
      orderBy: { createdAt: 'asc' },
      take: CANDIDATS_MAX,
      select: {
        id: true, libelle: true, declencheurs: true, etat: true, tombees: true,
        budget: true, reposHeures: true, derniereFois: true, expireLe: true,
        createdAt: true,
      },
    })
    if (!candidates.length) return []

    const mots = motsPleins(tour)
    const tombees: IntentionTombee[] = []
    const perimees: string[] = []

    for (const i of candidates) {
      // La péremption se constate ici : rien ne tourne en tâche de fond pour ça.
      if (i.expireLe <= maintenant) { perimees.push(i.id); continue }
      if (tombees.length >= MAX_PAR_TOUR) continue
      if (i.tombees >= i.budget) continue
      if (i.derniereFois
        && maintenant.getTime() - i.derniereFois.getTime() < i.reposHeures * 3_600_000) continue

      const cles = i.declencheurs.map((d) => motsPleins(d))
      const touche = cles.length > 0
        && cles.every((c) => c.size > 0 && [...c].every((m) => mots.has(m)))
      if (!touche) continue

      tombees.push({ id: i.id, libelle: i.libelle, creeeLe: i.createdAt })
    }

    if (perimees.length) {
      await db.atlasIntention.updateMany({
        where: { id: { in: perimees } }, data: { etat: 'EXPIREE' },
      }).catch(() => {})
    }
    for (const t of tombees) {
      const source = candidates.find((c) => c.id === t.id)!
      const apres = source.tombees + 1
      await db.atlasIntention.update({
        where: { id: t.id },
        data: {
          tombees: apres,
          derniereFois: maintenant,
          etat: apres >= source.budget ? 'TERMINEE' : 'TOMBEE',
        },
      }).catch(() => {})
    }
    return tombees
  } catch {
    // Une mémoire prospective en panne dégrade le rappel ; elle ne mange pas
    // un tour de conversation.
    return []
  }
}

/** Le bloc à glisser dans le contexte. Vide si rien ne tombe. */
export function enTexte(tombees: IntentionTombee[]): string {
  if (!tombees.length) return ''
  return tombees
    .map((t) => `- (noté le ${t.creeeLe.toLocaleDateString('fr-FR')}) ${t.libelle}`)
    .join('\n')
}

/**
 * Armer une intention.
 *
 * Les valeurs par défaut sont volontairement timides : trois déclenchements au
 * plus, un jour de repos entre deux, et une péremption à trois mois. Une
 * intention qu'on ne rencontre jamais doit s'éteindre toute seule.
 */
export async function armerIntention(args: {
  userId: string
  contactId?: string | null
  libelle: string
  declencheurs: string[]
  budget?: number
  reposHeures?: number
  jours?: number
}): Promise<string | null> {
  const libelle = args.libelle.trim()
  const declencheurs = args.declencheurs.map((d) => d.trim()).filter(Boolean)
  // Sans déclencheur, elle ne tomberait jamais — ou pire, tout le temps.
  if (!libelle || !declencheurs.length) return null
  try {
    const i = await db.atlasIntention.create({
      data: {
        userId: args.userId,
        contactId: args.contactId ?? null,
        libelle: libelle.slice(0, 300),
        declencheurs: declencheurs.slice(0, 6),
        budget: Math.min(Math.max(args.budget ?? 3, 1), 10),
        reposHeures: Math.min(Math.max(args.reposHeures ?? 24, 0), 720),
        expireLe: new Date(Date.now() + (args.jours ?? 90) * 86_400_000),
      },
      select: { id: true },
    })
    return i.id
  } catch {
    return null
  }
}

/**
 * Annuler.
 *
 * 🔴 L'ANNULATION NE S'INFÈRE JAMAIS D'UNE CONVERSATION. Un système proactif
 * se trompe bien plus souvent en devinant qu'une intention est caduque qu'en
 * la laissant s'éteindre par péremption. On n'annule que sur demande explicite.
 */
export async function annulerIntention(userId: string, id: string): Promise<boolean> {
  try {
    const r = await db.atlasIntention.updateMany({
      where: { id, userId }, data: { etat: 'ANNULEE' },
    })
    return r.count > 0
  } catch {
    return false
  }
}

/** Ce qui est encore en vie, pour la montrer ou l'annuler. */
export async function listerIntentions(userId: string) {
  try {
    return await db.atlasIntention.findMany({
      where: { userId, etat: { in: ['ARMEE', 'TOMBEE'] } },
      orderBy: { createdAt: 'desc' },
      take: 40,
      select: {
        id: true, libelle: true, declencheurs: true, contactId: true,
        tombees: true, budget: true, expireLe: true, createdAt: true,
      },
    })
  } catch {
    return []
  }
}
