import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Cerveau Atlas : FastAPI atline-ai-service, même serveur Hetzner (RAG Qdrant + Mem0 + Opus).
const ATLAS_URL = process.env.ATLAS_URL || 'http://127.0.0.1:8100'

// Titre lisible pour l'historique : les prompts internes (session, plan) ne doivent pas s'afficher bruts.
function convTitle(query: string): string {
  if (query.startsWith('[SESSION_POURQUOI]')) return 'Mon pourquoi'
  if (query.startsWith('[SESSION_RENCONTRE]')) return 'Ma rencontre'
  if (query.startsWith('[SESSION_MINDSET]')) return 'Mon état d’esprit'
  if (query.startsWith('[SESSION_OBJECTIFS]')) return 'Mes objectifs'
  if (query.startsWith('[SESSION_AUDIENCE]')) return 'Mon audience cible'
  if (query.startsWith('[SESSION')) return 'Session Atlas'
  if (query.startsWith('Voici mes priorités') || query.startsWith('Avant de courir après les contacts') || query.startsWith("Je n'ai aucune priorité")) return 'Mon plan du jour'
  if (query.startsWith('Tu es Atlas, coach en marketing de réseau. Rédige')) return 'Message rédigé'
  return query.slice(0, 60)
}

export async function POST(req: NextRequest) {
  // user_id réel depuis la session NextAuth — jamais fourni par le client.
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const userId = token?.id as string | undefined
  if (!userId) return NextResponse.json({ error: 'non authentifié' }, { status: 401 })

  let body: { query?: string; conversationId?: string; mlm_actif?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 })
  }
  const query = (body.query ?? '').trim()
  if (!query) return NextResponse.json({ error: 'query vide' }, { status: 400 })

  // Résoudre / créer la conversation (propriété vérifiée)
  let conversationId = body.conversationId
  if (conversationId) {
    const owned = await db.atlasConversation.findFirst({
      where: { id: conversationId, userId },
      select: { id: true },
    })
    if (!owned) conversationId = undefined
  }
  if (!conversationId) {
    const conv = await db.atlasConversation.create({
      data: { userId, title: convTitle(query), context: 'parcours' },
      select: { id: true },
    })
    conversationId = conv.id
  }
  const cid = conversationId

  // Historique DB (avant d'ajouter le message courant) → contexte conversationnel
  const prior = await db.atlasMessage.findMany({
    where: { conversationId: cid },
    orderBy: { createdAt: 'asc' },
    select: { role: true, content: true },
  })
  const conversation_history = prior.map((m) => ({
    role: m.role === 'USER' ? 'user' : 'assistant',
    content: m.content,
  }))

  // Sauver le message utilisateur
  await db.atlasMessage.create({
    data: { conversationId: cid, role: 'USER', content: query, qdrantChunks: [] },
  })

  // Appel FastAPI
  let resp: Response
  try {
    resp = await fetch(`${ATLAS_URL}/api/atlas/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        user_id: userId,
        mlm_actif: body.mlm_actif ?? 'Atline',
        conversation_history,
      }),
    })
  } catch {
    return NextResponse.json({ error: 'Atlas indisponible' }, { status: 502 })
  }
  if (!resp.ok || !resp.body) {
    return NextResponse.json({ error: 'Atlas indisponible' }, { status: 502 })
  }

  // tee : une branche pour le client, une branche consommée côté serveur.
  // La sauvegarde ne dépend PAS du client → si l'utilisateur quitte en plein streaming,
  // la réponse d'Atlas est quand même persistée (le fetch FastAPI continue côté serveur).
  const [toClient, toSave] = resp.body.tee()

  void (async () => {
    const decoder = new TextDecoder()
    let raw = ''
    const reader = toSave.getReader()
    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        raw += decoder.decode(value, { stream: true })
      }
    } catch {
      /* flux interrompu : on sauvegarde ce qu'on a */
    }
    let full = ''
    for (const line of raw.split('\n')) {
      if (!line.startsWith('data: ')) continue
      const p = line.slice(6).trim()
      if (!p || p === '[DONE]') continue
      try {
        const d = JSON.parse(p)
        if (d.text) full += d.text
      } catch {
        /* ligne SSE partielle, ignorée */
      }
    }
    try {
      if (full) {
        await db.atlasMessage.create({
          data: { conversationId: cid, role: 'ASSISTANT', content: full, qdrantChunks: [] },
        })
      }
      await db.atlasConversation.update({ where: { id: cid }, data: { updatedAt: new Date() } })
    } catch {
      /* persistance best-effort */
    }
  })()

  return new Response(toClient, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
      'X-Conversation-Id': cid,
    },
  })
}
