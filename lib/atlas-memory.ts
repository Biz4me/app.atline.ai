import { db } from '@/lib/db'

// ── Mémoire vivante d'Atlas ─────────────────────────────────────────────────────
// Profil dialectique (UserPreferences.atlasProfile / Contact.atlasMemory) + faits
// atomiques (AtlasFact, vocabulaire fermé). Réflexion par le service (/api/atlas/reflect),
// réconciliation DÉTERMINISTE ici : match exact → confiance +0.05 ; objet différent sur
// catégorie stable → supersession (jamais de DELETE) ; sinon nouveau fait.

const ATLAS_URL = process.env.ATLAS_URL || 'http://127.0.0.1:8100'

// Catégories « stables » : une nouvelle valeur remplace l'ancienne (on ne vise pas
// 2000 € ET 5000 € par mois). Les autres (emotion, situation…) coexistent.
const STABLE_CATEGORIES = new Set(['identite', 'preference', 'objectif', 'contrainte', 'decision'])

export type ExtractedFact = {
  predicate: string
  object: string
  category: string
  importance?: number
  confidence?: number
  // Slug de compétence (table Competence) quand le fait en désigne une.
  // `object` garde la formulation libre — la nuance est utile — mais c'est
  // CE champ qui permet d'apparier et de compter.
  competence?: string | null
}

/**
 * LE POIDS D'UN FAIT — ce qui décide des 12 places d'Atlas.
 *
 * 🔴 UN TRI LEXICOGRAPHIQUE NE CLASSE PAS, IL ÉCRASE. Mesuré le 23 octobre :
 * `[importance, supportCount, lastSeenAt]` laissait l'importance tout décider,
 * et 8 faits seulement atteignent 0,95. Résultat : huit des douze places
 * portaient des faits vus 1 à 3 fois, pendant que « relance mélanie » (71
 * observations), « langage vert marche froide » (77) et « mauvaise réputation
 * marketing réseau » (49) n'entraient jamais.
 *
 * Le modèle donne 0,95 à ce qu'il vient d'entendre. L'importance dit donc
 * « ça compte », pas « ça compte PLUS que ». Il faut la combiner, pas la
 * classer :
 *
 *   poids = importance × ancrage × fraîcheur
 *
 * `ancrage` = log(1 + ré-observations) : revenir 70 fois pèse plus que revenir
 * 10 fois, sans écraser le reste. `fraîcheur` décroît de moitié en 30 jours
 * mais ne descend jamais sous 0,4 : un blocage de fond ne disparaît pas parce
 * qu'on n'en a pas parlé ce mois-ci.
 *
 * ⚠️ Prisma ne sait pas trier là-dessus : on tire une fenêtre bornée, on pèse
 * en mémoire, on coupe. La fenêtre est large devant la coupe, donc elle ne
 * peut pas exclure un fait lourd.
 */
/**
 * ── 🔴 LA FENÊTRE COUPAIT AVANT D'AVOIR PESÉ (16 novembre 2026) ───────────
 *
 * Elle valait **80**, et le commentaire au-dessus affirmait qu'« elle est large
 * devant la coupe, donc elle ne peut pas exclure un fait lourd ». C'était vrai
 * quand il y avait 200 faits. Mesuré ce jour-là sur un compte à **712 faits
 * actifs** : **deux des douze faits les plus lourds étaient coupés avant d'être
 * pesés.**
 *
 *     langage vert marche froide              vu 96×   (hors fenêtre)
 *     a_peur_de : mauvaise réputation …       vu 49×   (hors fenêtre)
 *
 * 🔴 ET LA CAUSE N'EST PAS LA TAILLE, C'EST L'ORDRE. `orderBy` plaçait
 * `importance` AVANT `supportCount` : un fait d'importance 0,95 vu **une fois**
 * passait donc devant un fait d'importance 0,85 vu **96 fois**. Dans la fenêtre,
 * l'importance allait de 0,85 à 0,95 ; dehors, le maximum était 0,85. Le tri
 * tranchait au milieu d'une bande d'importance, et la ré-observation ne comptait
 * plus.
 *
 * 🧭 C'EST LA MÊME FAMILLE QUE LE DÉFAUT DU 23 OCTOBRE. Là-bas, « on ne montrait
 * jamais le bon candidat à l'arbitre » ; ici, **on ne pesait jamais le bon
 * fait**. Dans les deux cas le calcul était juste et la présélection fausse.
 *
 * ⚠️ LE PLAFOND RESTE, mais il devient un garde-fou et non un filtre : 2 000
 * lignes étroites tiennent sans effort, et l'ordre est désormais
 * `supportCount` d'abord — si le plafond coupe un jour, il coupe le moins
 * observé, c'est-à-dire ce qui pèse le moins.
 */
const FENETRE = 2000

export function poids(f: { importance: number; supportCount: number; lastSeenAt: Date }): number {
  const jours = (Date.now() - f.lastSeenAt.getTime()) / 86_400_000
  const fraicheur = 0.4 + 0.6 * Math.pow(0.5, jours / 30)
  return f.importance * Math.log(1 + f.supportCount) * fraicheur
}

/** La fenêtre dans laquelle on pèse : jamais couper avant d'avoir pesé. */
const CADRE = {
  // 🔴 `supportCount` D'ABORD. Voir `FENETRE` au-dessus : l'importance en tête
  // faisait passer un fait vu une fois devant un fait vu 96 fois.
  orderBy: [{ supportCount: 'desc' as const }, { importance: 'desc' as const }],
  take: FENETRE,
  select: {
    predicate: true, object: true, category: true,
    importance: true, supportCount: true, lastSeenAt: true,
  },
}

/**
 * LES FAITS QUI PÈSENT LE PLUS — un seul propriétaire.
 *
 * Le chat les injecte, la fiche contact les montre, et la nuit s'en sert pour
 * REBÂTIR le profil. Trois usages, une seule définition : sans ça, « ce
 * qu'Atlas sait » dépendrait de qui pose la question.
 */
export async function faitsSaillants(
  userId: string,
  contactId: string | null,
  combien: number,
): Promise<string[]> {
  const fenetre = await db.atlasFact.findMany({
    where: { userId, contactId, status: 'active' },
    ...CADRE,
  })
  return fenetre
    .sort((a, b) => poids(b) - poids(a))
    .slice(0, combien)
    .map(
      (f) =>
        `- ${f.predicate.replace(/_/g, ' ')} : ${f.object} (${f.category}, vu ${f.supportCount}×, ${depuisQuand(f.lastSeenAt)})`,
    )
}

/**
 * ── 🔴 CHAQUE FAIT PART AVEC SA DATE (16 novembre 2026) ────────────────────
 *
 * C'est la vraie péremption, et elle ne supprime rien.
 *
 * Le fait servi s'écrivait `- situation : rendez-vous jean demain (projet)`.
 * **« Demain » était vrai le jour où on l'a dit.** Observé pour la dernière
 * fois il y a neuf jours, il annonce à Atlas un rendez-vous pour demain qui a
 * eu lieu la semaine dernière — et Atlas n'avait **aucun moyen** de le savoir.
 * Relevé : **19 faits actifs sur 712 portent un mot de temps relatif**
 * (« demain », « hier », « ce soir », une heure), dont un vieux de 126 jours.
 *
 * 🧭 ON N'A PAS BESOIN DE LES PÉRIMER, IL FAUT LES DATER. Amortir leur poids
 * ou les effacer jetterait une information vraie ; la date, elle, rend le fait
 * lisible pour ce qu'il est. **« rendez-vous jean demain (il y a 9 jours) » se
 * comprend tout seul**, et le modèle tranche mieux que n'importe quel seuil
 * qu'on choisirait à sa place.
 *
 * ⚠️ MESURÉ AVANT DE TOUCHER AU POIDS : les douze faits servis ont 0 à 26
 * jours, et **aucun** n'est à la fois périssable et vieux de plus d'un mois.
 * L'amortissement existant (moitié en 30 jours, plancher 0,4) fait donc son
 * travail. J'étais venu baisser le plancher des périssables ; la mesure dit que
 * le défaut était ailleurs. On ne règle pas un seuil qui marche.
 *
 * Et le coût est nul à l'échelle qui compte : douze lignes, quelques dizaines
 * de jetons.
 */
function depuisQuand(quand: Date): string {
  const jours = Math.floor((Date.now() - quand.getTime()) / 86_400_000)
  if (jours <= 0) return 'aujourd’hui'
  if (jours === 1) return 'hier'
  if (jours < 7) return `il y a ${jours} jours`
  if (jours < 60) return `il y a ${Math.round(jours / 7)} semaines`
  return `il y a ${Math.round(jours / 30)} mois`
}

// Bloc « mémoire vivante » injecté dans le chat : profil + faits saillants.
export async function buildUserModel(userId: string): Promise<string> {
  try {
    const [prefs, faits] = await Promise.all([
      db.userPreferences.findUnique({ where: { userId }, select: { atlasProfile: true } }),
      faitsSaillants(userId, null, 12),
    ])
    const lines: string[] = []
    if (prefs?.atlasProfile) lines.push(prefs.atlasProfile)
    if (faits.length) lines.push('Faits retenus :\n' + faits.join('\n'))
    return lines.join('\n\n')
  } catch {
    return ''
  }
}

// Faits saillants d'un contact (complètent le carnet atlasMemory dans le snapshot).
export async function contactFactLines(userId: string, contactId: string): Promise<string> {
  try {
    return (await faitsSaillants(userId, contactId, 8)).join('\n')
  } catch {
    return ''
  }
}

// Forme canonique d'un libellé : minuscules, espaces (jamais d'underscores/mots collés),
// ponctuation légère retirée — le match exact attrape ainsi la plupart des reformulations.
export function normalizeObject(raw: string): string {
  return raw
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    // 🔴 L'APOSTROPHE SE GARDE. Elle était retirée, et les mots se collaient :
    // « simulation d'invitation » devenait « simulation dinvitation ». Constaté
    // le 23 octobre sur 29 libellés actifs, qui partaient tels quels dans le
    // contexte d'Atlas — du mauvais français dans la tête du coach.
    //
    // Bénéfice second, et il compte autant : `motsPleins` découpe sur
    // l'apostrophe, donc « simulation d'invitation » et « simulation
    // invitation » donnent les MÊMES mots pleins et s'apparient enfin. Collés,
    // ils restaient deux faits distincts.
    .replace(/[‘’ʼ]/g, "'")   // apostrophes courbes → droite
    .replace(/[«»"]/g, '')
    .trim()
    .toLowerCase()
    .slice(0, 120)
}

// Arbitre LLM (pattern jarvis) : appelé UNIQUEMENT sur l'ambigu — même (predicate, category),
// objet différent. « same » = même concept reformulé. En échec/doute → different (prudence).
async function arbitrate(predicate: string, category: string, existingObject: string, newObject: string): Promise<'same' | 'different'> {
  try {
    const r = await fetch(`${ATLAS_URL}/api/atlas/arbitrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ predicate, category, existing_object: existingObject, new_object: newObject }),
      signal: AbortSignal.timeout(8000),
    })
    if (!r.ok) return 'different'
    const d = await r.json()
    return d?.verdict === 'same' ? 'same' : 'different'
  } catch {
    return 'different'
  }
}

// ── Choisir le bon candidat à montrer à l'arbitre ───────────────────────────
//
// 🔴 LE DÉFAUT QUE CECI CORRIGE, mesuré le 23 octobre sur 1 273 faits actifs.
//
// L'appariement prenait UN SEUL candidat, choisi par DATE :
//     findFirst({ where: { predicate, category }, orderBy: { lastSeenAt } })
// « appel mélanie guilbert » tombait donc face au dernier fait écrit dans la
// même catégorie, qui pouvait parler d'immobilier. L'arbitre répondait
// « different », une ligne de plus était créée — alors que « relance mélanie
// ce soir » existait trois lignes plus bas.
//
// Résultat en production : 60 lignes pour « mauvaise réputation marketing de
// réseau », 14 pour « transformation de jean en partenaire », et 87 % des
// faits actifs vus une seule fois. Les 12 places du contexte d'Atlas étaient
// occupées par quatre façons de dire « appeler Mélanie », pendant que
// « objection pyramide », observée 51 fois, n'y arrivait jamais.
//
// L'arbitre n'était pas mauvais. ON NE LUI MONTRAIT JAMAIS LE BON CANDIDAT.
//
// ⚠️ La ressemblance ne DÉCIDE pas, elle ORDONNE. C'est toujours l'arbitre qui
// tranche « même chose » ou non. Un score lexical médiocre suffit donc : il
// doit seulement placer le vrai jumeau devant les étrangers.

const MOTS_VIDES = new Set([
  'de','la','le','les','un','une','des','du','et','au','aux','en','avec','sur',
  'dans','par','se','sa','son','ses','est','etre','avoir','plus','pas','ne',
  'ce','cette','qui','que','pour','leur','mes','son',
])

/**
 * Mots pleins d'un libellé, sans accents ni ponctuation.
 *
 * Exporté pour que le nettoyage de l'existant utilise CE code et pas une
 * copie : un rattrapage qui collerait ses propres règles collapserait des
 * faits que la production, elle, garderait séparés.
 */
export function motsPleins(s: string): Set<string> {
  const plat = s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const tous = plat.match(/[a-z0-9]+/g) ?? []
  const pleins = tous.filter((m) => m.length > 2 && !MOTS_VIDES.has(m))
  return new Set(pleins.length ? pleins : tous)
}

/** Part de mots pleins communs, entre 0 et 1. Exporté, voir `motsPleins`. */
export function ressemblance(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0
  let communs = 0
  for (const m of a) if (b.has(m)) communs++
  return communs / (a.size + b.size - communs)
}

/** Sous ce score, on ne dérange pas l'arbitre : c'est un fait neuf. */
const PLANCHER_APPARIEMENT = 0.25
/**
 * Au-dessus, c'est si évidemment le même qu'un appel de modèle serait du
 * gaspillage. Exporté : le nettoyage de l'existant ne fusionne QUE ce que la
 * production fusionnerait sans même consulter l'arbitre. En dessous, il faut
 * un jugement, donc ça ne se rattrape pas en masse.
 */
export const CERTITUDE = 0.8
/** Garde-fou : le plus gros groupe mesuré en fait 508. */
const CANDIDATS_MAX = 500

type Candidat = Awaited<ReturnType<typeof db.atlasFact.findFirst>>

async function meilleurCandidat(
  userId: string,
  contactId: string | null,
  predicate: string,
  competenceId: string | null,
  category: string,
  object: string,
): Promise<{ fait: Candidat; score: number } | null> {
  /**
   * ── 🔴 LA CATÉGORIE NE BORNE PLUS LA RECHERCHE (16 novembre 2026) ────────
   *
   * Elle le faisait : `...(competenceId ? { competenceId } : { category })`.
   * **Deux faits au texte IDENTIQUE rangés dans deux catégories différentes ne
   * se rencontraient donc JAMAIS** — ni pour le match exact, ni devant
   * l'arbitre. Mesuré en production sur 725 faits actifs :
   *
   *     relancer mélanie            [projet]            vu 2×
   *     relancer mélanie            [decision/suivi]    vu 1×   ← ressemblance 1,00
   *     rendez-vous avec jean demain 14h  [projet]      vu 1×
   *     rendez-vous avec jean demain      [decision]    vu 1×   ← 0,80
   *     adaptation profil big al bleu [projet/adaptation] vu 92×
   *     adaptation ton profil bleu    [competence]        vu 1×  ← 0,60
   *
   * 68 paires de faits actifs au-dessus de 0,50 que la recherche ne POUVAIT pas
   * rapprocher. Et le dernier exemple est le plus coûteux : une observation
   * isolée à côté d'une ligne vue 92 fois, qui se disputent les douze places du
   * contexte d'Atlas.
   *
   * 🧭 CE N'ÉTAIT PAS LA NORMALISATION. J'avais annoncé qu'il fallait
   * normaliser avant de dédupliquer — `motsPleins` le fait déjà très bien
   * (« relance de mélanie » et « relance melanie » donnent 1,00). Et la
   * supersession en double est MORTE depuis le correctif du 23 octobre :
   * **1 230 supersessions avant, dont 51 % de doublons ; 50 après, dont 0.**
   * Le défaut qui restait n'était pas le nettoyage du texte, c'était le
   * PÉRIMÈTRE de la recherche.
   *
   * ⚠️ LE PRÉDICAT RESTE LA BORNE, et il suffit : « bloque sur X » et
   * « travaille sur X » doivent rester deux faits. C'est la ressemblance qui
   * ordonne ensuite, et l'arbitre qui tranche — rien de ce garde-fou ne bouge.
   */
  const candidats = await db.atlasFact.findMany({
    where: {
      userId, contactId, predicate, status: 'active',
      ...(competenceId ? { competenceId } : {}),
    },
    // Les faits les mieux établis d'abord : si le plafond coupe, il ne doit
    // jamais couper la ligne canonique au profit d'une variante récente.
    orderBy: [{ supportCount: 'desc' }, { lastSeenAt: 'desc' }],
    take: CANDIDATS_MAX,
  })
  if (!candidats.length) return null

  const cible = motsPleins(object)
  let meilleur = candidats[0]
  let score = -1
  for (const c of candidats) {
    const s = ressemblance(cible, motsPleins(c.object))
    if (s > score) { score = s; meilleur = c }
  }
  if (score >= PLANCHER_APPARIEMENT) return { fait: meilleur, score }

  // ⚠️ RIEN NE RESSEMBLE, ET LA SUITE DÉPEND DE LA CATÉGORIE.
  //
  // Une catégorie stable ne tolère pas deux valeurs actives : on ne vise pas
  // 2 000 € ET 5 000 € par mois. Même sans ressemblance, le nouveau REMPLACE
  // l'ancien, donc il faut rendre un candidat pour que la supersession ait
  // lieu. Sans ce rattrapage, le plancher aurait créé des objectifs qui
  // coexistent — une régression que le plancher seul introduisait.
  if (!competenceId && STABLE_CATEGORIES.has(category)) {
    /**
     * ⚠️ ICI LA CATÉGORIE REVIENT, ET C'EST VOLONTAIRE. Ce rattrapage SUPERSÈDE
     * sans ressemblance : « on ne vise pas 2 000 € ET 5 000 € par mois ». Avec
     * la recherche élargie, il irait remplacer le fait le plus récent du même
     * prédicat **quelle que soit sa catégorie** — un objectif effacerait une
     * décision. On ne le laisse donc agir que là où l'unicité est vraie.
     */
    const memeCategorie = candidats.filter((c) => c.category === category)
    if (memeCategorie.length) {
      const recent = memeCategorie.reduce((a, b) => (a.lastSeenAt > b.lastSeenAt ? a : b))
      return { fait: recent, score: 0 }
    }
  }
  return null
}

// Réconciliation : déterministe d'abord (match exact normalisé), arbitre LLM sur l'ambigu.
/** Ce qu'une réconciliation a réellement fait. Rendu pour que la nuit puisse
 *  en laisser une trace au lieu de travailler en silence. */
export type Bilan = { crees: number; confirmes: number; remplaces: number; rates: number }

export async function reconcileFacts(
  userId: string, contactId: string | null, facts: ExtractedFact[],
  source: 'atlas' | 'aria' | 'nova' = 'atlas',
): Promise<Bilan> {
  const bilan: Bilan = { crees: 0, confirmes: 0, remplaces: 0, rates: 0 }
  for (const f of facts) {
    const object = normalizeObject(f.object || '')
    if (!object || !f.predicate || !f.category) continue
    try {
      // L'appariement se faisait sur (predicate, category) — or pour Aria la
      // catégorie vaut TOUJOURS « competence ». Deux blocages sur deux sujets
      // différents se retrouvaient donc face à face, l'arbitre tranchait
      // « different », et on créait une ligne de plus. D'où, en production,
      // « perte de foi » / « manque de motivation » / « manque motivation » /
      // « manque motivation et foi » : quatre lignes, un seul défaut.
      // Quand le slug est connu, c'est LUI la clé : deux observations de la
      // même compétence se trouvent, quelle que soit la formulation.
      const competenceId = f.competence || null
      // 🔴 Le candidat est choisi par RESSEMBLANCE, plus par date. Voir
      // `meilleurCandidat` au-dessus pour ce que cela corrige.
      const trouve = await meilleurCandidat(
        userId, contactId, f.predicate, competenceId, f.category, object,
      )
      const existing = trouve?.fait ?? null

      const confirm = async (id: string, cur: { confidence: number; importance: number }) =>
        db.atlasFact.update({
          where: { id },
          data: {
            confidence: Math.min(cur.confidence + 0.05, 0.99),
            supportCount: { increment: 1 },
            lastSeenAt: new Date(),
            importance: Math.max(cur.importance, f.importance ?? 0),
          },
        })
      const create = () =>
        db.atlasFact.create({
          data: {
            userId, contactId, predicate: f.predicate, object, category: f.category, source,
            importance: f.importance ?? 0.5, confidence: f.confidence ?? 0.75,
            ...(competenceId ? { competenceId } : {}),
          },
        })

      if (!existing) {
        await create(); bilan.crees++
        continue
      }
      if (normalizeObject(existing.object) === object) {
        // Ré-observation identique → renforce la confiance
        await confirm(existing.id, existing); bilan.confirmes++
        continue
      }
      // Mêmes mots pleins à un article près — « énergie et chaleur EN ouverture
      // froide » contre « DANS ouverture froide ». Déranger l'arbitre pour ça
      // serait payer un appel de modèle pour une évidence.
      if ((trouve?.score ?? 0) >= CERTITUDE) {
        await confirm(existing.id, existing); bilan.confirmes++
        if (object.length < existing.object.length) {
          await db.atlasFact.update({ where: { id: existing.id }, data: { object } })
        }
        continue
      }
      // Ambigu : même (predicate, category), objet différent → l'arbitre tranche
      const verdict = await arbitrate(f.predicate, f.category, existing.object, object)
      if (verdict === 'same') {
        // Même concept reformulé → confirmation (et on garde le libellé le plus court = plus canonique)
        await confirm(existing.id, existing); bilan.confirmes++
        if (object.length < existing.object.length) {
          await db.atlasFact.update({ where: { id: existing.id }, data: { object } })
        }
      } else if (competenceId) {
        // ⚠️ APPARIÉ PAR SLUG : c'est le même sujet par construction. Une
        // formulation différente est une reformulation ou une PROGRESSION,
        // jamais un second blocage qui coexiste.
        //
        // 🔴 CE N'EST DONC PAS UNE SUPERSESSION, C'EST UNE OBSERVATION DE PLUS.
        // La version précédente créait ici un fait neuf et marquait l'ancien
        // superseded — ce qui RÉINITIALISAIT `supportCount` à 1. Constaté en
        // production le 19 octobre sur le même blocage :
        //     18/10  superseded  vu 15  « peur objection pyramide »
        //     19/10  ACTIVE      vu 1   « peur de l'objection pyramide »
        // Quinze observations remplacées par une, pour un mot d'écart. Et la
        // suite en dents de scie : 5 → 7 → 4 → 13 → 15 → 2 → 1.
        //
        // Or c'est `supportCount` qui donne la note du point faible
        // (`penalite = max(10, 55 - vu*10)` dans lib/competences.ts, agrégé
        // par compétence) : la recommandation changeait de module parce que la
        // mémoire oubliait, pas parce que le distributeur progressait. Un coach
        // qui oublie ce qu'il a constaté quinze fois n'est pas crédible.
        //
        // On met donc à jour SUR PLACE : le compteur monte, la confiance monte,
        // et le libellé adopte la formulation la plus récente — celle qui dit
        // où en est la personne aujourd'hui. Bénéfice second : la ligne garde
        // son `createdAt`, donc « depuis quand ça coince », que la chaîne de
        // supersessions effaçait.
        await confirm(existing.id, existing); bilan.confirmes++
        await db.atlasFact.update({ where: { id: existing.id }, data: { object } })
      } else if (STABLE_CATEGORIES.has(f.category)) {
        // Sans slug, une catégorie stable est un vrai REMPLACEMENT : on ne vise
        // pas 2 000 € ET 5 000 € par mois. Ici le compteur DOIT repartir — dire
        // « vu quinze fois » d'un objectif énoncé à l'instant serait faux.
        // Supersession traçable, jamais de DELETE.
        const neu = await create()
        await db.atlasFact.update({
          where: { id: existing.id },
          data: { status: 'superseded', supersededById: neu.id },
        })
        bilan.remplaces++
      } else {
        await create(); bilan.crees++
      }
    } catch {
      // Un fait raté ne bloque pas les autres — mais il se COMPTE, sinon
      // la nuit peut échouer à moitié sans que rien ne le dise.
      bilan.rates++
    }
  }
  return bilan
}

// Appel du service de réflexion (haiku) : profil réécrit + faits extraits.
// `reference` = données DÉJÀ déclarées (profil/contact structuré) → la réflexion reste
// cohérente avec elles et ne les redécouvre pas comme des faits. Utilisé par la passe
// nocturne (deep) ; vide sur le chemin live.
export async function reflect(
  kind: 'user' | 'contact',
  name: string,
  profile: string,
  exchange: string,
  deep = false,
  reference = '',
): Promise<{ profile: string; facts: ExtractedFact[] }> {
  try {
    const r = await fetch(`${ATLAS_URL}/api/atlas/reflect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, name, profile, exchange, deep, reference }),
      signal: AbortSignal.timeout(45000),
    })
    if (!r.ok) return { profile: '', facts: [] }
    const d = await r.json()
    return { profile: typeof d.profile === 'string' ? d.profile : '', facts: Array.isArray(d.facts) ? d.facts : [] }
  } catch {
    return { profile: '', facts: [] }
  }
}

// Réflexion utilisateur après un échange (fire-and-forget depuis la route chat).
// `source` = quel agent a mené l'échange (mémoire partagée, plumes multiples).
export async function reflectUserMemory(userId: string, query: string, answer: string, source: 'atlas' | 'aria' | 'nova' = 'atlas') {
  try {
    const prefs = await db.userPreferences.findUnique({
      where: { userId },
      select: { atlasProfile: true },
    })
    const user = await db.user.findUnique({ where: { id: userId }, select: { firstName: true } })
    const agentName = source === 'nova' ? 'Nova' : source === 'aria' ? 'Aria' : 'Atlas'
    const { profile, facts } = await reflect(
      'user',
      user?.firstName ?? '',
      prefs?.atlasProfile ?? '',
      `Utilisateur: ${query}\n${agentName}: ${answer}`,
    )
    if (profile) {
      await db.userPreferences.upsert({
        where: { userId },
        create: { userId, atlasProfile: profile, atlasProfileAt: new Date() },
        update: { atlasProfile: profile, atlasProfileAt: new Date() },
      })
    }
    if (facts.length) await reconcileFacts(userId, null, facts, source)
  } catch {
    /* mémoire best-effort */
  }
}

// Réflexion contact après un échange sur sa fiche (remplace l'ancien /contact-memory :
// même carnet + en plus des faits atomiques réconciliés).
export async function reflectContactMemory(userId: string, contactId: string, query: string, answer: string) {
  try {
    const cur = await db.contact.findFirst({
      where: { id: contactId, userId },
      select: { name: true, atlasMemory: true },
    })
    if (!cur) return
    const { profile, facts } = await reflect(
      'contact',
      cur.name,
      cur.atlasMemory ?? '',
      `Utilisateur: ${query}\nAtlas: ${answer}`,
    )
    if (profile) {
      await db.contact.update({
        where: { id: contactId },
        data: { atlasMemory: profile, atlasMemoryAt: new Date() },
      })
    }
    if (facts.length) await reconcileFacts(userId, contactId, facts)
  } catch {
    /* mémoire best-effort */
  }
}

// Suggestions d'écriture de champs STRUCTURÉS (profil/activité) que l'utilisateur a dits
// explicitement dans la journée et qui diffèrent du profil actuel. RIEN n'est écrit ici :
// la passe de nuit les persiste en cartes [[ACTION]] à confirmer au réveil (jamais auto).
export type ProfileProposal = { cible: 'profile' | 'activite'; champ: string; valeur: string }

export async function proposeProfileUpdates(reference: string, exchange: string): Promise<ProfileProposal[]> {
  if (!exchange.trim()) return []
  try {
    const r = await fetch(`${ATLAS_URL}/api/atlas/propose-updates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference, exchange }),
      signal: AbortSignal.timeout(30000),
    })
    if (!r.ok) return []
    const d = await r.json()
    return Array.isArray(d.proposals) ? (d.proposals as ProfileProposal[]) : []
  } catch {
    return []
  }
}
