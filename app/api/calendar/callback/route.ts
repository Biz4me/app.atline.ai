import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { echangerCode, adresseDuCompte, estCapacite, type Capacite } from '@/lib/google/oauth'
import { enregistrerConnexion, journaliser } from '@/lib/google/connexion'

const BASE = process.env.NEXTAUTH_URL || 'https://app.atline.ai'

/**
 * Retour de Google. Sert l'agenda ET la boîte mail : l'URL garde son nom
 * historique parce que c'est cette chaîne exacte qui est déclarée dans la
 * Google Cloud Console.
 *
 * Le point sensible de cette route tient en une ligne : l'adresse vient de
 * `adresseDuCompte()`, c'est-à-dire de ce que Google confirme. Jamais de
 * `User.email`. Le distributeur a pu délibérément choisir un autre compte, et
 * c'est cette adresse-là que ses prospects verront.
 */
function retour(capacite: Capacite, params: Record<string, string>) {
  const page = capacite === 'email' ? '/settings' : '/agenda'
  return `${BASE}${page}?${new URLSearchParams(params).toString()}`
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.redirect(`${BASE}/auth`)

  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const erreur = searchParams.get('error')

  const [alea, capaciteBrute] = (state ?? '').split('.')
  const capacite: Capacite = estCapacite(capaciteBrute) ? capaciteBrute : 'agenda'
  const cle = capacite === 'email' ? 'email' : 'cal'

  const attendu = (await cookies()).get('cal_oauth_state')?.value
  if (erreur || !code || !alea || !attendu || alea !== attendu) {
    // Refus de l'utilisateur ou état falsifié : les deux se soldent par un
    // retour silencieux, sans jamais enregistrer quoi que ce soit.
    return NextResponse.redirect(retour(capacite, { [cle]: 'err' }))
  }

  try {
    const tok = await echangerCode(code)
    const adresse = await adresseDuCompte(tok.access_token)

    if (!adresse) {
      // Une connexion sans adresse identifiée serait une connexion dont on ne
      // sait pas ce qu'elle enverra, ni au nom de qui. On refuse.
      await journaliser({
        userId: session.user.id,
        action: 'ERREUR',
        detail: 'adresse du compte Google non obtenue : connexion refusée',
      })
      return NextResponse.redirect(retour(capacite, { [cle]: 'sans-adresse' }))
    }

    await enregistrerConnexion({
      userId: session.user.id,
      email: adresse,
      accessToken: tok.access_token,
      refreshToken: tok.refresh_token ?? null,
      expiresIn: tok.expires_in,
      scope: tok.scope ?? null,
    })

    // Le compte Google choisi n'est pas celui de l'inscription ? C'est
    // légitime (adresse perso pour s'inscrire, adresse pro pour écrire), donc
    // on ne bloque pas — mais on le signale, parce que c'est cette adresse-là
    // que les prospects verront et qu'une erreur ici est invisible.
    const compte = await db.user.findUnique({
      where: { id: session.user.id },
      select: { email: true },
    })
    const differente = compte?.email?.toLowerCase() !== adresse.toLowerCase()

    const res = NextResponse.redirect(
      retour(capacite, { [cle]: 'ok', ...(differente ? { autreAdresse: '1' } : {}) }),
    )
    res.cookies.delete('cal_oauth_state')
    return res
  } catch {
    return NextResponse.redirect(retour(capacite, { [cle]: 'err' }))
  }
}
