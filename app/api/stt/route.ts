import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ATLAS_URL = process.env.ATLAS_URL || 'http://127.0.0.1:8100'

// Transcription vocale (push-to-talk) : proxy vers NOTRE STT (Deepgram Nova-3, service /api/stt/transcribe).
export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.id) return NextResponse.json({ error: 'non authentifié' }, { status: 401 })

  const audio = await req.arrayBuffer()
  if (!audio.byteLength) return NextResponse.json({ error: 'audio vide' }, { status: 400 })
  const contentType = req.headers.get('content-type') || 'audio/webm'

  try {
    const resp = await fetch(`${ATLAS_URL}/api/stt/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': contentType },
      body: audio,
    })
    if (!resp.ok) return NextResponse.json({ error: 'transcription indisponible' }, { status: 502 })
    const d = await resp.json().catch(() => ({}))
    return NextResponse.json({ text: typeof d.text === 'string' ? d.text : '' })
  } catch {
    return NextResponse.json({ error: 'transcription indisponible' }, { status: 502 })
  }
}
