/**
 * LA MUTUALISATION — ce que 200 distributeurs savent et qu'aucun ne sait seul.
 *
 * Un distributeur produit quelques dizaines d'actions par mois : trop peu pour
 * qu'une IA apprenne quoi que ce soit de lui. Mais les distributeurs d'une même
 * société vendent les mêmes produits, affrontent les mêmes objections et parlent
 * aux mêmes marchés. Leurs résultats, mis en commun, disent des choses vraies.
 *
 * C'est ce que personne d'autre ne peut faire : ni un modèle généraliste, qui
 * n'a aucun résultat de terrain, ni un concurrent, qui n'a pas les 696 sociétés.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUI NE REMONTE JAMAIS
 *
 * Aucun message, aucun nom, aucun identifiant, aucun contenu. Les seules choses
 * qui quittent le périmètre d'un distributeur sont : un libellé de catégorie
 * (« le soir », « telegram »), et des comptages.
 *
 * Et rien ne se publie sous les seuils : une leçon exige au moins
 * MIN_DISTRIBUTEURS personnes distinctes et MIN_ACTIONS actions. En dessous, un
 * chiffre pourrait désigner quelqu'un — donc on se tait, même si le signal
 * paraît fort. C'est un refus délibéré d'information.
 */

import { db } from '@/lib/db'
import type { AgentName } from '@prisma/client'

const MIN_DISTRIBUTEURS = 5   // en dessous, une leçon peut désigner quelqu'un
const MIN_ACTIONS = 30        // en dessous, c'est du bruit
const ECART_MINIMAL = 0.15    // 15 points : sous cet écart, on ne conclut pas
const FENETRE_JOURS = 90

const REUSSITES = ['REPONDU', 'CLIQUE', 'ACHETE', 'RDV_PRIS', 'AVANCE']

type Groupe = { actions: number; reussites: number; gens: Set<string> }

/** Les trois questions qui se comparent d'une société à l'autre. */
function classer(sujet: string, a: { createdAt: Date; canal: string | null; contexte: unknown }): string | null {
  if (sujet === 'moment') {
    const h = a.createdAt.getHours()
    return h < 12 ? 'le matin' : h < 18 ? "l'après-midi" : 'le soir'
  }
  if (sujet === 'canal') return a.canal
  if (sujet === 'angle') return (a.contexte as { angle?: string } | null)?.angle ?? null
  return null
}

function enoncer(sujet: string, valeur: string, g: Groupe, tauxRef: number, agent: AgentName): string {
  const taux = Math.round((g.reussites / g.actions) * 100)
  const ref = Math.round(tauxRef * 100)
  const quoi: Record<string, string> = {
    moment: `écrire ${valeur}`,
    canal: `passer par ${valeur}`,
    angle: `l'angle « ${valeur} »`,
  }
  const metier: Record<string, string> = {
    NOVA: 'fait cliquer', ORION: 'fait répondre', IRIS: 'fait racheter',
    ECHO: 'fait avancer les filleuls', ATLAS: 'marche',
  }
  return `Chez les distributeurs de cette société, ${quoi[sujet] ?? valeur} ${metier[agent] ?? 'marche'} ` +
    `${taux}% du temps contre ${ref}% autrement (${g.actions} actions, ${g.gens.size} distributeurs).`
}

/**
 * Recalcule les leçons d'une société. Idempotent : on peut le relancer,
 * les leçons sont mises à jour ou effacées si elles ne tiennent plus.
 */
export async function calculerLecons(companyId: string) {
  const depuis = new Date(Date.now() - FENETRE_JOURS * 24 * 3600_000)

  // Qui appartient à cette société — c'est le seul lien qu'on suit.
  const membres = await db.userMlmBusiness.findMany({
    where: { companyId },
    select: { userId: true },
  })
  const userIds = [...new Set(membres.map((m) => m.userId))]
  if (userIds.length < MIN_DISTRIBUTEURS) {
    return { companyId, publiees: 0, raison: `moins de ${MIN_DISTRIBUTEURS} distributeurs` }
  }

  const actions = await db.agentAction.findMany({
    where: { userId: { in: userIds }, createdAt: { gte: depuis }, outcome: { not: 'EN_ATTENTE' } },
    select: { userId: true, agent: true, outcome: true, canal: true, contexte: true, createdAt: true },
  })
  if (actions.length < MIN_ACTIONS) {
    return { companyId, publiees: 0, raison: `moins de ${MIN_ACTIONS} actions mesurées` }
  }

  const retenues: {
    agent: AgentName; sujet: string; valeur: string
    actions: number; reussites: number; taux: number; tauxReference: number; distributeurs: number; enonce: string
  }[] = []

  const agents = [...new Set(actions.map((a) => a.agent))]
  for (const agent of agents) {
    const siennes = actions.filter((a) => a.agent === agent)

    for (const sujet of ['moment', 'canal', 'angle']) {
      const groupes = new Map<string, Groupe>()
      for (const a of siennes) {
        const cle = classer(sujet, a)
        if (!cle) continue
        const g = groupes.get(cle) ?? { actions: 0, reussites: 0, gens: new Set<string>() }
        g.actions += 1
        g.gens.add(a.userId)
        if (REUSSITES.includes(a.outcome)) g.reussites += 1
        groupes.set(cle, g)
      }
      if (groupes.size < 2) continue

      const total = [...groupes.values()].reduce((s, g) => ({ actions: s.actions + g.actions, reussites: s.reussites + g.reussites }), { actions: 0, reussites: 0 })

      for (const [valeur, g] of groupes) {
        // Les trois seuils, dans l'ordre où ils protègent : anonymat, bruit, écart.
        if (g.gens.size < MIN_DISTRIBUTEURS) continue
        if (g.actions < MIN_ACTIONS) continue

        const taux = g.reussites / g.actions
        const autresActions = total.actions - g.actions
        const autresReussites = total.reussites - g.reussites
        if (autresActions < MIN_ACTIONS) continue
        const tauxRef = autresReussites / autresActions
        if (taux - tauxRef < ECART_MINIMAL) continue

        retenues.push({
          agent, sujet, valeur,
          actions: g.actions, reussites: g.reussites, taux, tauxReference: tauxRef,
          distributeurs: g.gens.size,
          enonce: enoncer(sujet, valeur, g, tauxRef, agent),
        })
      }
    }
  }

  // On remplace : une leçon qui ne tient plus doit DISPARAÎTRE, pas survivre
  // parce qu'elle a été vraie une fois.
  await db.$transaction([
    db.mlmLecon.deleteMany({ where: { companyId } }),
    ...(retenues.length
      ? [db.mlmLecon.createMany({ data: retenues.map((r) => ({ companyId, ...r })) })]
      : []),
  ])

  return { companyId, publiees: retenues.length, distributeurs: userIds.length, actionsExaminees: actions.length }
}

/** Toutes les sociétés qui ont assez de monde pour que ça vaille le calcul. */
export async function calculerToutesLesLecons() {
  const groupes = await db.userMlmBusiness.groupBy({
    by: ['companyId'],
    where: { companyId: { not: null } },
    _count: { userId: true },
  })
  const eligibles = groupes.filter((g) => g._count.userId >= MIN_DISTRIBUTEURS && g.companyId)

  const resultats = []
  for (const g of eligibles) resultats.push(await calculerLecons(g.companyId!))
  return {
    societesExaminees: groupes.length,
    societesEligibles: eligibles.length,
    leconsPubliees: resultats.reduce((s, r) => s + r.publiees, 0),
    detail: resultats.filter((r) => r.publiees > 0),
  }
}

/**
 * Ce qu'un agent lit avant d'agir : ce que les autres de la même société
 * ont appris. Trois leçons au plus — au-delà, ça devient du bruit dans un prompt.
 */
export async function leconsPour(userId: string, agent?: AgentName): Promise<string> {
  const biz = await db.userMlmBusiness.findFirst({
    where: { userId, companyId: { not: null } },
    select: { companyId: true, company: { select: { name: true } } },
  })
  if (!biz?.companyId) return ''

  const lecons = await db.mlmLecon.findMany({
    where: { companyId: biz.companyId, ...(agent ? { agent } : {}) },
    orderBy: [{ distributeurs: 'desc' }, { actions: 'desc' }],
    take: 3,
    select: { enonce: true },
  })
  if (!lecons.length) return ''

  return `Ce que l'expérience collective montre chez ${biz.company?.name ?? 'ta société'} ` +
    `(comptages anonymes, aucun contenu personnel) :\n` +
    lecons.map((l) => `- ${l.enonce}`).join('\n')
}
