import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'

// Page-pivot d'entrée : route selon l'état d'onboarding.
// Onboardé → la MESSAGERIE (l'accueil de l'app depuis la bascule nav) ; sinon → onboarding.
// /chats renvoie lui-même vers Atlas tant qu'aucun fil contact n'existe (règle d'ouverture T9).
export default async function WelcomePage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/auth')
  redirect(session.user.onboardingCompleted ? '/chats' : '/onboarding')
}
