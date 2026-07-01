import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Proxy local → évite le CORS app.atline.ai vers admin.atline.ai côté client
export async function GET() {
  try {
    const r = await fetch('https://admin.atline.ai/api/public/mantras/random', { cache: 'no-store' })
    const d = await r.json()
    return NextResponse.json({ text: d?.text ?? '' })
  } catch {
    return NextResponse.json({ text: '' })
  }
}
