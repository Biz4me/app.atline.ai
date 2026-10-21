import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Endpoint INTERNE — l'outil Atlas `chercher_formation`.
 *
 * 🔴 POURQUOI IL EXISTE. Atlas avait NEUF outils, et tous agissaient sur des
 * gens : `get_contact`, `create_relance`, `schedule_rdv`, `log_note`… Aucun ne
 * touchait la formation. La seule chose qu'il pouvait proposer concrètement,
 * c'était donc d'appeler quelqu'un — d'où le « appelle Jean, appelle Mélanie »
 * dont Patrice s'est plaint le 21 octobre, et qui n'était pas un défaut de
 * caractère mais un défaut d'outillage.
 *
 * Le RAG lui donne depuis peu le CONTENU des leçons, mais pas leurs
 * IDENTIFIANTS : il pouvait citer « le module 5 » sans pouvoir l'ouvrir. Cet
 * endpoint renvoie `moduleId` et `lessonId`, donc une route — et le marqueur
 * `[[OPEN]] /formation/<module>/<leçon> | libellé` existe déjà côté app.
 *
 * On lit aussi OÙ EN EST l'utilisateur : proposer de « revoir » une leçon
 * jamais ouverte, ou de « découvrir » une leçon déjà lue, sonne faux et
 * décrédibilise le coach en une phrase.
 */

type Trouvee = {
  moduleId: string
  moduleTitre: string
  moduleNumero: number
  lessonId: string
  lessonTitre: string
  deja: boolean
  route: string
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret')
  if (!process.env.INTERNAL_API_SECRET || secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const query = typeof body?.query === 'string' ? body.query.trim() : ''
  const userId = typeof body?.userId === 'string' ? body.userId : ''
  const limit = Math.min(Math.max(Number(body?.limit) || 4, 1), 8)

  // Les modules publiés, dans l'ordre : c'est lui qui donne le NUMÉRO que
  // l'utilisateur voit à l'écran. Renvoyer un autre numéro que celui affiché
  // serait pire que ne rien renvoyer.
  const modules = await db.lmsModule.findMany({
    where: { published: true },
    orderBy: { position: 'asc' },
    select: { id: true, title: true },
  })
  const numero = new Map(modules.map((m, i) => [m.id, i + 1]))

  /**
   * 🔴 ON NE CHERCHE QUE DANS LE PUBLIÉ.
   *
   * 82 leçons sont restées en brouillon pendant des mois sans que personne ne
   * les rencontre (16 octobre). Proposer d'ouvrir une leçon non publiée
   * recréerait exactement ce cul-de-sac, et cette fois avec la voix du coach.
   */
  const mots: string[] = query.split(/\s+/).filter((m: string) => m.length > 3).slice(0, 6)
  const lecons = await db.lmsLesson.findMany({
    where: {
      published: true,
      kind: 'LESSON',
      module: { published: true },
      ...(mots.length
        ? {
            OR: [
              ...mots.map((m: string) => ({ title: { contains: m, mode: 'insensitive' as const } })),
              ...mots.map((m: string) => ({ module: { title: { contains: m, mode: 'insensitive' as const } } })),
            ],
          }
        : {}),
    },
    orderBy: [{ moduleId: 'asc' }, { position: 'asc' }],
    select: { id: true, title: true, moduleId: true, module: { select: { id: true, title: true } } },
    take: 40,
  })

  // Les leçons déjà lues : une seule requête, pas une par leçon.
  const faites = userId
    ? new Set(
        (
          await db.userLessonProgress.findMany({
            where: { userId, done: true, lessonId: { in: lecons.map((l) => l.id) } },
            select: { lessonId: true },
          })
        ).map((p) => p.lessonId),
      )
    : new Set<string>()

  // Classement simple et explicable : une leçon dont le TITRE porte les mots
  // de la question passe devant une leçon dont seul le module les porte.
  const score = (l: (typeof lecons)[number]) => {
    const t = l.title.toLowerCase()
    const m = (l.module?.title ?? '').toLowerCase()
    return mots.reduce((n: number, mot: string) => n + (t.includes(mot.toLowerCase()) ? 2 : m.includes(mot.toLowerCase()) ? 1 : 0), 0)
  }

  const resultats: Trouvee[] = lecons
    .map((l) => ({ l, s: score(l) }))
    .filter((x) => x.s > 0 || !mots.length)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map(({ l }) => ({
      moduleId: l.moduleId,
      moduleTitre: l.module?.title ?? '',
      moduleNumero: numero.get(l.moduleId) ?? 0,
      lessonId: l.id,
      lessonTitre: l.title,
      deja: faites.has(l.id),
      route: `/formation/${l.moduleId}/${l.id}`,
    }))

  return NextResponse.json({
    lecons: resultats,
    modules: modules.map((m, i) => ({ id: m.id, numero: i + 1, titre: m.title })),
  })
}
