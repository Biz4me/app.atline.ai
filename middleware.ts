import { getToken } from 'next-auth/jwt'
import { NextResponse, type NextRequest } from 'next/server'

// 🔴 CE FICHIER NE LAISSE PLUS PASSER TOUT `/api/`.
//
// Il contenait `pathname.startsWith('/api/')` dans sa liste de routes
// publiques, juste sous `/api/auth`. L'intention était de laisser passer
// NextAuth ; l'effet était de désactiver la grille pour les 109 routes d'API.
// Chacune était donc SEULE gardienne d'elle-même, sans deuxième ligne de
// défense, et l'audit du 1er novembre 2026 a trouvé trois routes qui servaient
// leur contenu à un navigateur anonyme : 69 Ko de synthèses de livres,
// 4 329 caractères de doctrine Nova, et 134 652 caractères de leçons pour le
// seul module 1 — sur les 772 599 que compte la formation.
//
// Désormais `/api/` exige une session, SAUF ce que les deux listes ci-dessous
// nomment. `scripts/verifier-gardes-api.sh` les LIT (il ne les recopie pas) et
// refuse tout déploiement portant une route que rien ne garde.

// Publiques par conception : aucune session, et c'est voulu.
const API_PUBLIQUE = [
  '/api/auth/', // NextAuth, inscription, vérification d'e-mail, pseudo
  '/api/booking/', // prise de rendez-vous depuis un lien public
  '/api/health', // sondé par GitHub Actions et UptimeRobot, sans compte
  '/api/mantras/random', // une phrase affichée avant que la session existe
]

// 🔴 Celles-ci n'ont pas de session : elles s'authentifient par LEUR PROPRE
// jeton (service IA, n8n, Gmail Pub/Sub, Chatwoot, relances) et le vérifient
// elles-mêmes. Exiger une session ici les couperait TOUTES EN SILENCE :
// l'appelant externe recevrait un 401 et personne ne le verrait — exactement
// la classe de panne qu'on passe des journées à retrouver.
const API_A_JETON = [
  '/api/internal/', // INTERNAL_API_SECRET, x-chatwoot-signature, GMAIL_PUSH_TOKEN, RADAR_SECRET
  // ⚠️ Préfixe et non chemins exacts : au moment où le middleware voit l'URL,
  // le segment dynamique est RÉSOLU (`/api/relances/abc-123/done`), donc une
  // entrée `/api/relances/[id]/done` ne matcherait jamais rien.
  '/api/relances/', // RELANCE_API_TOKEN sur /due et /[id]/done (n8n)
  '/api/stt/ticket', // INTERNAL_API_SECRET
  '/api/atlas/chat', // INTERNAL_API_SECRET, et session acceptée aussi
]

// Une entrée finissant par `/` est un préfixe ; sinon c'est un chemin exact.
function dansListe(chemin: string, liste: string[]): boolean {
  return liste.some((e) =>
    e.endsWith('/') ? chemin.startsWith(e) || chemin === e.slice(0, -1) : chemin === e
  )
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Statique et pages publiques : rien à vérifier.
  if (
    pathname.startsWith('/auth') ||
    pathname.startsWith('/r/') ||
    pathname.startsWith('/rdv/') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/brand') ||
    pathname.match(/\.(png|jpg|svg|ico|webp|webmanifest)$/)
  ) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/api/')) {
    if (dansListe(pathname, API_PUBLIQUE) || dansListe(pathname, API_A_JETON)) {
      return NextResponse.next()
    }
    const jeton = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    // 🔴 On RÉPOND 401, on ne redirige pas. Un `fetch` suivrait la redirection
    // vers /auth, recevrait du HTML, et son `.json()` casserait sur un message
    // incompréhensible au lieu de dire franchement « non authentifié ».
    if (!jeton) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.next()
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  // Non authentifié → login
  if (!token) {
    return NextResponse.redirect(new URL('/auth', req.url))
  }

  // Gate onboarding DÉSACTIVÉ temporairement : il bouclait (JWT périmé onboardingCompleted=false
  // alors que la base = true → /onboarding rebondit vers /home → middleware re-redirige → page blanche).
  // L'entrée vers /onboarding pour les nouveaux comptes sera rebranchée proprement (sans boucle) ensuite.
  // if (!token.onboardingCompleted && pathname !== '/onboarding') {
  //   return NextResponse.redirect(new URL('/onboarding', req.url))
  // }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
}
