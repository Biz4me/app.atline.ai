import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

const AI_SERVICE = 'http://localhost:8100'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  const { query, conversationHistory, conversationId } = await req.json()
  if (!query?.trim()) return NextResponse.json({ error: 'Query required' }, { status: 400 })

  // Contexte utilisateur minimal
  const [user, business] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true, plan: true } }),
    db.userMlmBusiness.findFirst({ where: { userId, active: true }, select: { mlmName: true, role: true, goal: true } }),
  ])

  const payload = {
    query,
    user_id: userId,
    mlm_actif: business?.mlmName ?? '',
    distributeur: {
      prenom: user?.firstName ?? '',
      nom: user?.lastName ?? '',
      role: business?.role ?? '',
      objectif: business?.goal ?? '',
    },
    conversation_history: conversationHistory ?? [],
  }

  // Persist user message
  let convId = conversationId
  if (!convId) {
    const conv = await db.atlasConversation.create({
      data: { userId, mlmBusinessId: null, title: query.slice(0, 60) },
    })
    convId = conv.id
  }
  await db.atlasMessage.create({
    data: { conversationId: convId, role: 'USER', content: query, qdrantChunks: [] },
  })

  // Stream from FastAPI
  const upstream = await fetch(`${AI_SERVICE}/api/atlas/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!upstream.ok) {
    return NextResponse.json({ error: 'AI service unavailable' }, { status: 502 })
  }

  // Collect full response to persist, stream to client
  const encoder = new TextEncoder()
  let fullText = ''

  const stream = new ReadableStream({
    async start(controller) {
      // Send conversationId first so client can track it
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ convId })}\n\n`))

      const reader = upstream.body!.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        fullText += chunk
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`))
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()

      // Persist atlas response
      await db.atlasMessage.create({
        data: { conversationId: convId, role: 'ASSISTANT', content: fullText, qdrantChunks: [] },
      }).catch(() => {})
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Conv-Id': convId,
    },
  })
}
