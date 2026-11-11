import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// Contexte : user connecté + activité MLM active (cloisonnement).
async function ctx() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  const prefs = await db.userPreferences.findUnique({ where: { userId: session.user.id } })
  return { userId: session.user.id, mlmBusinessId: prefs?.activeCompanyId ?? null }
}

export async function GET() {
  const c = await ctx()
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const campaigns = await db.campaign.findMany({
    where: { userId: c.userId, ...(c.mlmBusinessId ? { mlmBusinessId: c.mlmBusinessId } : {}) },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { posts: true } } },
  })

  // 🔴 INSCRITS ET CONVERTIS NE SONT PLUS CALCULÉS (11 novembre 2026).
  // Les deux sortaient de `Lead`, une table que **rien n'écrit dans les
  // quatre dépôts** : les deux regroupements rendaient toujours un tableau
  // vide, et l'écran affichait trois zéros sur quatre comme des résultats.
  // 🧭 Le moteur de campagnes — n8n — n'a jamais été codé ; ce n'est pas un
  // compteur à zéro, c'est un compteur sans source. On rend `null`, et
  // l'écran dit « — » au lieu de prétendre mesurer.

  const out = campaigns.map((c) => ({
    ...c,
    stats: {
      posts: c._count.posts,
      leads: null,
      inscrits: null,
      convertis: null,
    },
  }))
  return NextResponse.json({ campaigns: out })
}

export async function POST(req: Request) {
  const c = await ctx()
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!c.mlmBusinessId) return NextResponse.json({ error: 'Aucune activité MLM active' }, { status: 400 })
  const body = await req.json().catch(() => ({}))
  const goal = body?.goal === 'CLIENTS' ? 'CLIENTS' : 'PARTENAIRES'
  const campaign = await db.campaign.create({
    data: { userId: c.userId, mlmBusinessId: c.mlmBusinessId, goal, status: 'BROUILLON' },
  })
  return NextResponse.json({ campaign })
}
