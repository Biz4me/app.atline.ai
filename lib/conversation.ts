import { db } from '@/lib/db'

/**
 * LA CONVERSATION TELLE QU'ELLE S'EST TENUE.
 *
 * ⚠️ JUMEAU DE MIGRATION : `atline-v2/lib/conversation.ts` tient la même
 * `reconcilier`. Les deux DOIVENT rester en phase jusqu'à la bascule, où la
 * copie d'ici disparaît. Toute correction ici se reporte là-bas, et
 * réciproquement.
 *
 * Une conversation parlée n'arrive pas en base comme elle a été vécue. Le tour
 * de parole se fermait pendant que l'utilisateur cherchait ses mots : Atlas
 * répondait au fragment (« Ta phrase est restée en suspens »), puis la vraie
 * phrase arrivait et obtenait une seconde réponse. Mesuré le 21 octobre sur
 * les 397 tours parlés conservés : 89 sont le DÉBUT exact du suivant.
 *
 * 🔴 ON NE RÉÉCRIT PAS LA BASE, ON RÉCONCILIE À LA LECTURE.
 */

export type MessageBrut = {
  id: string
  role: 'USER' | 'ASSISTANT'
  content: string
  createdAt: Date
}

export type Tour = MessageBrut & {
  /** Recollé depuis plusieurs enregistrements (côté utilisateur seulement). */
  recolle: boolean
  /** Les fragments absorbés. Chacun est contenu dans `content`, par construction. */
  fragments: MessageBrut[]
  /** Cette réponse est tombée entre un fragment et sa suite : elle répondait à
   *  une phrase inachevée. RIEN N'EST SUPPRIMÉ en base. */
  repliable: boolean
}

/** « a » est-il le début de « b » ? (l'égalité compte : la même phrase redite) */
const prolonge = (a: string, b: string) => {
  const x = a.trim()
  const y = b.trim()
  return y.startsWith(x)
}

/**
 * Rend la conversation telle qu'elle s'est tenue.
 *
 * 🔴 LE RECOLLAGE TRAVERSE LA RÉPONSE INTERCALÉE, et c'est tout l'intérêt.
 * La forme la plus fréquente du défaut est précisément celle-ci :
 *
 *     VOUS   « Oui bonjour aujourd'hui j'aimerais que »
 *     ATLAS  « Ta phrase est restée en suspens… »        ← l'artefact
 *     VOUS   « Oui bonjour aujourd'hui j'aimerais que tu m'éclaires… »
 *
 * Une première version ne regardait que les messages CONSÉCUTIFS du même
 * rôle, et laissait donc passer le cas le plus visible. La preuve de
 * contenance ne dépend pas de ce qui se trouve entre les deux.
 */
export function reconcilier(messages: MessageBrut[]): Tour[] {
  const ordre = [...messages].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  )

  const absorbe = new Set<string>()        // fragments disparus dans leur suite
  const repliees = new Set<string>()       // réponses tombées sur un fragment
  const fragmentsDe = new Map<string, MessageBrut[]>()
  const debutDe = new Map<string, Date>()  // quand il a commencé à parler

  for (let i = 0; i < ordre.length; i++) {
    const m = ordre[i]
    if (m.role !== 'USER' || absorbe.has(m.id)) continue

    // Le prochain tour de l'utilisateur, quoi qu'il y ait entre les deux.
    const k = ordre.findIndex((x, n) => n > i && x.role === 'USER')
    if (k === -1) continue
    const suivant = ordre[k]
    if (!prolonge(m.content, suivant.content)) continue

    // Contenance prouvée : ce message est le début de l'autre.
    absorbe.add(m.id)
    const liste = fragmentsDe.get(suivant.id) ?? []
    fragmentsDe.set(suivant.id, [...(fragmentsDe.get(m.id) ?? []), ...liste, m])
    debutDe.set(suivant.id, debutDe.get(m.id) ?? m.createdAt)

    // Ce qu'Atlas a dit entre les deux répondait à la phrase inachevée.
    for (let n = i + 1; n < k; n++) {
      if (ordre[n].role === 'ASSISTANT') repliees.add(ordre[n].id)
    }
  }

  return (
    ordre
      .filter((m) => !absorbe.has(m.id))
      .map((m) => {
        const fragments = fragmentsDe.get(m.id) ?? []
        return {
          ...m,
          // Un tour recollé est daté du moment où il a COMMENCÉ à parler, pas
          // de celui où la transcription s'est complétée.
          createdAt: debutDe.get(m.id) ?? m.createdAt,
          recolle: fragments.length > 0,
          fragments,
          repliable: repliees.has(m.id),
        }
      })
      // 🔴 RETRIER. Le tour recollé reprend la date de son début, qui est
      // ANTÉRIEURE à la réponse tombée entre les deux : sans ce tri, la
      // réponse s'affiche avant la question qu'elle suit.
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  )
}

/** Ce que la consolidation s'est écrit à elle-même, et ne doit pas relire. */
const MARQUEUR_MACHINE = '[[ACTION]]'

export type Journee = {
  /** L'échange, prêt pour la réflexion. */
  texte: string
  /** Tours retenus après réconciliation. */
  tours: number
  /** Fragments recollés dans leur phrase complète. */
  recolles: number
  /** Réponses à une phrase inachevée, écartées. */
  repliees: number
  /** Marqueurs machine écartés. */
  machine: number
}

/**
 * CE QUE LA NUIT DOIT LIRE.
 *
 * 🔴 CORRIGE UN DÉFAUT MESURÉ LE 23 OCTOBRE. La consolidation lisait les
 * messages BRUTS : `findMany` sans filtre de contexte ni de rôle, et sans
 * réconciliation. Or 66 % des messages viennent d'appels vocaux, où le tour de
 * parole se referme en pleine phrase. Elle digérait donc des fragments et les
 * « ta phrase est restée en suspens » qui leur répondaient.
 *
 * Le symptôme était lisible à l'œil nu dans le profil produit :
 *
 *     « Il disait que son activité était une bagarre, mais affirme maintenant
 *       que cela touche Mélanie ou l'a coupé dans son élan pour l'appeler. »
 *
 * Trois gestes, et trois seulement :
 *   1. RECOLLER les fragments dans la phrase que l'utilisateur a réellement dite
 *   2. ÉCARTER les réponses tombées sur une phrase inachevée — elles répondent
 *      à une question qui n'a jamais été posée
 *   3. ÉCARTER les marqueurs `[[ACTION]]` que la consolidation s'est écrits
 *      la veille, sinon elle se relit elle-même
 *
 * ⚠️ UN SEUL PROPRIÉTAIRE. Les deux boucles de la consolidation, utilisateurs
 * et contacts, passent par ici. Deux copies auraient divergé au premier
 * correctif — c'est exactement le piège qui a coûté trois défauts le 21.
 *
 * ⚠️ CE QUI N'EST PAS TRAITÉ, et c'est assumé : Atlas redit dans ses réponses
 * ce que la mémoire lui a soufflé (« tu es à 11 % de la formation »), et la
 * nuit peut en ré-extraire un fait. Le supprimer coûterait le contexte des
 * questions, dont les réponses courtes de l'utilisateur dépendent. Le vrai
 * remède est de MARQUER ce qui vient de la mémoire à l'injection, pas de
 * deviner à la relecture.
 */
export async function lireLaJournee(
  convIds: string[],
  depuis: Date,
  plafond: number,
): Promise<Journee> {
  const vide: Journee = { texte: '', tours: 0, recolles: 0, repliees: 0, machine: 0 }
  if (!convIds.length) return vide

  const bruts = await db.atlasMessage.findMany({
    where: { conversationId: { in: convIds }, createdAt: { gte: depuis } },
    orderBy: { createdAt: 'asc' },
    take: plafond,
    select: { id: true, conversationId: true, role: true, content: true, createdAt: true },
  })
  if (!bruts.length) return vide

  const machine = bruts.filter((m) => m.content.startsWith(MARQUEUR_MACHINE)).length

  // Le recollage se fait DANS une conversation : un fragment et sa suite
  // appartiennent au même fil, jamais à deux fils différents.
  const parFil = new Map<string, MessageBrut[]>()
  for (const m of bruts) {
    if (m.content.startsWith(MARQUEUR_MACHINE)) continue
    const lot = parFil.get(m.conversationId) ?? []
    lot.push({ id: m.id, role: m.role as 'USER' | 'ASSISTANT', content: m.content, createdAt: m.createdAt })
    parFil.set(m.conversationId, lot)
  }

  let recolles = 0
  let repliees = 0
  const tours: Tour[] = []
  for (const lot of parFil.values()) {
    for (const t of reconcilier(lot)) {
      if (t.recolle) recolles += t.fragments.length
      if (t.repliable) { repliees++; continue }
      tours.push(t)
    }
  }
  tours.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())

  const texte = tours
    .map((t) => `${t.role === 'USER' ? 'Utilisateur' : 'Atlas'}: ${t.content.slice(0, 500)}`)
    .join('\n')

  return { texte, tours: tours.length, recolles, repliees, machine }
}
