/**
 * LES SCORES — ce que le cerveau lit pour décider.
 *
 * Chaque ouvrier a UNE métrique de réussite, et c'est elle qui définit sa force :
 *
 *   Nova   attire     → des clics par publication
 *   Orion  convertit  → des réponses obtenues
 *   Iris   fidélise   → des rachats déclenchés
 *   Echo   duplique   → des filleuls qui avancent
 *   Atlas  pilote     → la régularité de l'utilisateur
 *
 * Ce fichier ne juge pas, il compte. Le jugement appartient à la nuit.
 *
 * Le format de sortie est pensé pour être lu par un modèle : des phrases
 * courtes, des chiffres nus, aucune interprétation. C'est le cerveau qui
 * interprète — sinon on aurait deux avis pour un seul fait.
 */

import { db } from '@/lib/db'
import type { AgentName } from '@prisma/client'

const REUSSITES = ['REPONDU', 'CLIQUE', 'ACHETE', 'RDV_PRIS', 'AVANCE'] as const

export type ScoreAgent = {
  agent: AgentName
  actions: number
  reussites: number
  taux: number | null          // null quand rien n'est encore tranché : on ne divise pas par zéro
  enAttente: number
  delaiMedianMinutes: number | null
  valeurTotale: number | null  // clics cumulés, montants…
  parType: Record<string, { actions: number; reussites: number }>
  /** Ce qui distingue les réussites des échecs — la matière première de l'apprentissage. */
  signaux: { quoi: string; constat: string }[]
}

function mediane(nombres: number[]): number | null {
  if (!nombres.length) return null
  const t = [...nombres].sort((a, b) => a - b)
  const m = Math.floor(t.length / 2)
  return t.length % 2 ? t[m] : Math.round((t[m - 1] + t[m]) / 2)
}

/**
 * Compare deux populations sur un critère tiré du contexte, et ne renvoie
 * un constat que si l'écart est net ET l'échantillon suffisant. Sans ce
 * garde-fou, la nuit raconterait n'importe quoi dès la troisième action.
 */
function comparer(
  actions: { outcome: string; contexte: unknown; createdAt: Date }[],
  quoi: string,
  classer: (a: { contexte: unknown; createdAt: Date }) => string | null,
  minParGroupe = 5,
): { quoi: string; constat: string } | null {
  const groupes = new Map<string, { total: number; ok: number }>()
  for (const a of actions) {
    const cle = classer(a)
    if (!cle) continue
    const g = groupes.get(cle) ?? { total: 0, ok: 0 }
    g.total += 1
    if ((REUSSITES as readonly string[]).includes(a.outcome)) g.ok += 1
    groupes.set(cle, g)
  }
  const retenus = [...groupes.entries()]
    .filter(([, g]) => g.total >= minParGroupe)
    .map(([cle, g]) => ({ cle, taux: g.ok / g.total, total: g.total }))
    .sort((a, b) => b.taux - a.taux)

  if (retenus.length < 2) return null
  const meilleur = retenus[0]
  const pire = retenus[retenus.length - 1]
  if (meilleur.taux - pire.taux < 0.15) return null   // écart trop faible pour en tirer quoi que ce soit

  const fois = pire.taux > 0 ? (meilleur.taux / pire.taux).toFixed(1) : null
  return {
    quoi,
    constat: fois
      ? `${meilleur.cle} marche ${fois}× mieux que ${pire.cle} (${Math.round(meilleur.taux * 100)}% contre ${Math.round(pire.taux * 100)}%, sur ${meilleur.total} et ${pire.total} actions)`
      : `${meilleur.cle} obtient ${Math.round(meilleur.taux * 100)}% de réussite quand ${pire.cle} n'en obtient aucune (${meilleur.total} et ${pire.total} actions)`,
  }
}

/** Les scores d'un utilisateur, agent par agent, sur une fenêtre de jours. */
export async function scoresUtilisateur(userId: string, jours = 7): Promise<ScoreAgent[]> {
  const depuis = new Date(Date.now() - jours * 24 * 3600_000)
  const actions = await db.agentAction.findMany({
    where: { userId, createdAt: { gte: depuis } },
    select: {
      agent: true, type: true, outcome: true, delaiMinutes: true,
      valeur: true, contexte: true, createdAt: true, canal: true,
    },
  })

  const agents: AgentName[] = ['ATLAS', 'NOVA', 'ORION', 'IRIS', 'ECHO']
  return agents.map((agent) => {
    const mien = actions.filter((a) => a.agent === agent)
    const tranchees = mien.filter((a) => a.outcome !== 'EN_ATTENTE')
    const reussites = tranchees.filter((a) => (REUSSITES as readonly string[]).includes(a.outcome))

    const parType: Record<string, { actions: number; reussites: number }> = {}
    for (const a of tranchees) {
      const t = (parType[a.type] ??= { actions: 0, reussites: 0 })
      t.actions += 1
      if ((REUSSITES as readonly string[]).includes(a.outcome)) t.reussites += 1
    }

    // Les trois questions qui reviennent toujours : quand, sur quel canal, avec quel angle.
    const base = tranchees.map((a) => ({ outcome: a.outcome as string, contexte: a.contexte, createdAt: a.createdAt }))
    const signaux = [
      comparer(base, 'moment', (a) => {
        const h = a.createdAt.getHours()
        return h < 12 ? 'le matin' : h < 18 ? "l'après-midi" : 'le soir'
      }),
      comparer(
        tranchees.map((a) => ({ outcome: a.outcome as string, contexte: a.contexte, createdAt: a.createdAt, canal: a.canal })),
        'canal',
        (a) => ((a as { canal?: string | null }).canal ?? null),
      ),
      comparer(base, 'angle', (a) => {
        const c = a.contexte as { angle?: string } | null
        return c?.angle ?? null
      }),
    ].filter(Boolean) as { quoi: string; constat: string }[]

    const valeurs = mien.map((a) => a.valeur).filter((v): v is number => typeof v === 'number')

    return {
      agent,
      actions: mien.length,
      reussites: reussites.length,
      taux: tranchees.length ? reussites.length / tranchees.length : null,
      enAttente: mien.length - tranchees.length,
      delaiMedianMinutes: mediane(reussites.map((a) => a.delaiMinutes).filter((d): d is number => typeof d === 'number')),
      valeurTotale: valeurs.length ? valeurs.reduce((s, v) => s + v, 0) : null,
      parType,
      signaux,
    }
  })
}

/**
 * LE constat du jour : le signal le mieux étayé, tous agents confondus.
 * Sert au message du matin, qui reste déterministe — pas de LLM, pas
 * d'hallucination possible : c'est une phrase construite à partir de comptages.
 * Renvoie null tant qu'aucun écart n'est assez net pour mériter d'être dit.
 */
export function constatDuJour(scores: ScoreAgent[]): { agent: AgentName; quoi: string; constat: string } | null {
  const tous = scores.flatMap((s) => s.signaux.map((sig) => ({ agent: s.agent, ...sig, poids: s.actions })))
  if (!tous.length) return null
  // à écart comparable, on préfère le signal tiré du plus grand nombre d'actions
  tous.sort((a, b) => b.poids - a.poids)
  return tous[0]
}

/** La même chose, mise en phrases nues, prête à entrer dans un prompt. */
export function scoresEnTexte(scores: ScoreAgent[], jours = 7): string {
  const METIER: Record<string, string> = {
    ATLAS: 'piloter', NOVA: 'attirer', ORION: 'convertir', IRIS: 'fidéliser', ECHO: 'dupliquer',
  }
  const lignes: string[] = [`Résultats mesurés sur ${jours} jours (aucune interprétation, que des comptages) :`]

  for (const s of scores) {
    if (!s.actions) continue
    const taux = s.taux === null ? 'rien de tranché' : `${Math.round(s.taux * 100)}% de réussite`
    lignes.push(
      `- ${s.agent} (${METIER[s.agent]}) : ${s.actions} actions, ${taux}` +
      (s.enAttente ? `, ${s.enAttente} encore en attente` : '') +
      (s.delaiMedianMinutes !== null ? `, délai médian de réaction ${s.delaiMedianMinutes} min` : '') +
      (s.valeurTotale !== null ? `, valeur cumulée ${s.valeurTotale}` : ''),
    )
    for (const [type, t] of Object.entries(s.parType)) {
      lignes.push(`    · ${type} : ${t.reussites}/${t.actions}`)
    }
    for (const sig of s.signaux) lignes.push(`    → ${sig.quoi} : ${sig.constat}`)
  }

  if (lignes.length === 1) lignes.push('- aucune action mesurée sur la période.')
  return lignes.join('\n')
}
