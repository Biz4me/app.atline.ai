import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { connexionDe, revoquer } from '@/lib/google/connexion'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const [conn, user] = await Promise.all([
    connexionDe(session.user.id),
    db.user.findUnique({ where: { id: session.user.id }, select: { username: true } }),
  ])
  return NextResponse.json({
    connected: !!conn,
    // L'adresse d'envoi : celle que Google a confirmée, celle que les prospects verront.
    email: conn?.email ?? null,
    scopes: conn?.scope ? conn.scope.split(' ').filter(Boolean) : [],
    username: user?.username ?? null,
  })
}

// Se déconnecter doit VRAIMENT couper l'accès : on prévient Google, on ne se
// contente pas d'oublier le jeton de notre côté. Sans ça, l'app affiche
// « déconnecté » pendant que l'autorisation reste vivante dans le compte
// Google du distributeur.
export async function DELETE() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const confirmeParGoogle = await revoquer(session.user.id)
  return NextResponse.json({ ok: true, confirmeParGoogle })
}
