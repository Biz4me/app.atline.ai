import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const FORMAT = /^[a-z0-9._]{3,20}$/

// normalise (sans accents, alphanumérique uniquement) pour construire des suggestions
function norm(s: string): string {
  // NFD décompose les accents (é → e + ́), puis on retire tout ce qui n'est pas [a-z0-9]
  return s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '')
}

async function isFree(u: string): Promise<boolean> {
  if (!FORMAT.test(u)) return false
  const existing = await db.user.findUnique({ where: { username: u }, select: { id: true } })
  return !existing
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams

  // Vérification d'un identifiant saisi
  const check = sp.get('check')
  if (check !== null) {
    const u = check.toLowerCase().trim()
    return NextResponse.json({ available: await isFree(u), valid: FORMAT.test(u) })
  }

  // Suggestion d'un identifiant disponible
  const first = norm(sp.get('first') ?? '')
  const last = norm(sp.get('last') ?? '')
  const root = first && last ? `${first}.${last}` : first || last || 'membre'
  const rnd = () => Math.floor(Math.random() * 900 + 100)

  const candidates = [
    root,
    `${first}${last}`,
    `${first}.${last.slice(0, 1)}`,
    `${first.slice(0, 1)}${last}`,
    `${root}${rnd()}`,
    `${first}${rnd()}`,
  ].filter((c) => FORMAT.test(c))

  for (const c of candidates) {
    if (await isFree(c)) return NextResponse.json({ username: c })
  }
  // Fallback : root + nombre aléatoire jusqu'à trouver un libre
  for (let i = 0; i < 12; i++) {
    const c = `${root}${Math.floor(Math.random() * 99999)}`
    if (await isFree(c)) return NextResponse.json({ username: c })
  }
  return NextResponse.json({ username: `membre${Date.now().toString().slice(-6)}` })
}
