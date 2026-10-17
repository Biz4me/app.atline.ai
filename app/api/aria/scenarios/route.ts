import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { readFileSync } from 'fs'
import { db } from '@/lib/db'

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
    // Ce que chaque scénario ENTRAÎNE. Le lien vit en base (SimScenario), le
    // contexte envoyé au modèle vit dans agent-config.json : deux rôles, et le
    // slug est la jointure. Sans cette ligne, choisir un scénario pour
    // travailler un point faible demandait de deviner — « objection pyramide »
    // est rangé en phase « suivi » mais entraîne les objections.
    const parSlug = new Map<string, string[]>()
    try {
      const rows = await db.simScenario.findMany({
        select: { slug: true, competences: { select: { label: true }, orderBy: { position: 'asc' } } },
      })
      for (const r of rows) parSlug.set(r.slug, r.competences.map((c) => c.label))
    } catch { /* le catalogue reste utilisable sans les étiquettes */ }

    const scenarios = (cfg.scenarios ?? [])
      .filter((s) => s.id)
      .map((s) => ({
        id: s.id,
        label: s.label ?? s.id.replace(/_/g, ' '),
        phase: s.phase ?? 'invitation',
        competences: parSlug.get(s.id) ?? [],
      }))
    return NextResponse.json({ scenarios })
  } catch {
    return NextResponse.json({ scenarios: [] })
  }
}
