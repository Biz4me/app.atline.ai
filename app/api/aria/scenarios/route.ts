import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { readFileSync } from 'fs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Bibliothèque de scénarios Aria (source unique : agent-config.json, éditée en admin,
// partagée avec l'agent vocal et le mode texte). Même serveur → lecture fichier directe.
const CONFIG_PATH = '/opt/atline/data/agent-config.json'

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.id) return NextResponse.json({ error: 'non authentifié' }, { status: 401 })

  try {
    const cfg = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8')) as {
      scenarios?: { id: string; label?: string; phase?: string }[]
    }
    const scenarios = (cfg.scenarios ?? [])
      .filter((s) => s.id)
      .map((s) => ({ id: s.id, label: s.label ?? s.id.replace(/_/g, ' '), phase: s.phase ?? 'invitation' }))
    return NextResponse.json({ scenarios })
  } catch {
    return NextResponse.json({ scenarios: [] })
  }
}
