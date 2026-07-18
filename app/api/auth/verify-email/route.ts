import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const APP_URL = process.env.NEXTAUTH_URL || 'https://app.atline.ai'

// Confirmation d'email : le token EST le secret (pas besoin d'être connecté — le clic depuis la boîte mail
// prouve l'accès à l'adresse). On pose emailVerified, on nettoie les tokens, puis on renvoie dans l'app.
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token')
  if (!token) return NextResponse.redirect(`${APP_URL}/auth?verify=invalid`)

  const row = await db.emailVerificationToken.findUnique({
    where: { token },
    select: { id: true, userId: true, expiresAt: true },
  })
  if (!row || row.expiresAt < new Date()) {
    if (row) await db.emailVerificationToken.delete({ where: { id: row.id } }).catch(() => {})
    return NextResponse.redirect(`${APP_URL}/auth?verify=expired`)
  }

  await db.user.update({ where: { id: row.userId }, data: { emailVerified: new Date() } })
  await db.emailVerificationToken.deleteMany({ where: { userId: row.userId } }).catch(() => {})
  return NextResponse.redirect(`${APP_URL}/welcome?verified=1`)
}
