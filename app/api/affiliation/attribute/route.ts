import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Attribution parrainage à partir du cookie atline_ref (couvre l'inscription Google,
// que l'adapter NextAuth ne peut pas traiter). Appelé au 1er chargement onboarding.
export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  const store = await cookies()
  const ref = store.get('atline_ref')?.value

  let attributed = false
  if (ref) {
    try {
      const referrer = await db.user.findUnique({ where: { username: ref.toLowerCase() }, select: { id: true } })
      // Mononiveau : un filleul a au plus UN parrain → on ne crée que s'il n'en a pas déjà
      if (referrer && referrer.id !== userId) {
        const already = await db.atlineReferral.findFirst({ where: { referredId: userId }, select: { id: true } })
        if (!already) {
          await db.atlineReferral.create({ data: { referrerId: referrer.id, referredId: userId, level: 1 } })
          attributed = true
        }
      }
    } catch {}
  }

  const res = NextResponse.json({ ok: true, attributed })
  res.cookies.delete('atline_ref')
  return res
}
