import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'

// Page-pivot d'entrée : route selon l'état d'onboarding.
// Onboardé → Atlas (l'accueil de l'app) ; sinon → onboarding. Non connecté → login.
// (Évite de toucher à l'onboarding qui code /home en dur.)
export default async function WelcomePage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/auth')
  redirect(session.user.onboardingCompleted ? '/atlas' : '/onboarding')
}
