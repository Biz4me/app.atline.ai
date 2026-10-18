import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ATLAS_URL = process.env.ATLAS_URL || 'http://127.0.0.1:8100'
const DELAI = 4000

/**
 * SANTÉ PUBLIQUE — le seul point que l'extérieur peut interroger.
 *
 * Pourquoi elle existe : la surveillance de `/opt/atline/surveillance.sh` tourne
 * SUR la machine. Si la machine meurt, elle se tait, et son silence ressemble
 * exactement à son calme. Une sonde extérieure qui appelle cette route est la
 * seule chose capable de dire « plus personne ne répond ».
 *
 * Règle héritée du 19 août : une route de santé qui ne PEUT PAS échouer ne sert
 * à rien. Chaque organe est vraiment interrogé, et un organe mort fait répondre
 * 503. C'est ce code que la sonde surveille, pas le texte.
 *
 * Deux organes seulement, et c'est volontaire :
 *   - la base, parce que sans elle l'app ne sert à rien ;
 *   - le cerveau, parce qu'il est déjà tombé en silence deux fois.
 * Le reste (Qdrant, Redis, embeddings, dégradations) est déjà surveillé depuis
 * la machine et remonte sur Telegram. Le dupliquer ici ferait sonner l'alarme
 * extérieure pour des choses qui n'empêchent pas l'app de servir.
 *
 * Route PUBLIQUE (le middleware laisse passer `/api/`) : elle ne renvoie que des
 * noms d'organes et des millisecondes. Jamais de message d'erreur brut, qui
 * pourrait contenir un hôte, un utilisateur ou une chaîne de connexion.
 */

type Organe = { nom: string; etat: 'ok' | 'ko'; ms: number }

async function mesure(nom: string, f: () => Promise<unknown>): Promise<Organe> {
  const t0 = Date.now()
  try {
    await Promise.race([
      f(),
      new Promise((_, rejette) => setTimeout(() => rejette(new Error('delai')), DELAI)),
    ])
    return { nom, etat: 'ok', ms: Date.now() - t0 }
  } catch {
    return { nom, etat: 'ko', ms: Date.now() - t0 }
  }
}

export async function GET() {
  const organes = await Promise.all([
    mesure('base', () => db.$queryRaw`SELECT 1`),
    mesure('cerveau', async () => {
      // Le service IA renvoie LUI-MÊME 503 quand il se juge hors service, et 200
      // quand il est seulement dégradé. On reprend sa décision telle quelle :
      // dégradé ne doit pas réveiller quelqu'un la nuit, mort doit le réveiller.
      const r = await fetch(`${ATLAS_URL}/health`, { cache: 'no-store' })
      if (!r.ok) throw new Error('hs')
    }),
  ])

  const pannes = organes.filter((o) => o.etat === 'ko').map((o) => o.nom)

  return NextResponse.json(
    { etat: pannes.length ? 'ko' : 'ok', organes, pannes },
    {
      status: pannes.length ? 503 : 200,
      headers: { 'cache-control': 'no-store, max-age=0' },
    },
  )
}
