import { redirect } from 'next/navigation'

export default function RootPage() {
  // Entrée de l'app → page-pivot /welcome (route onboardé→Atlas / sinon→onboarding ;
  // le middleware renvoie les non-authentifiés vers /auth)
  redirect('/welcome')
}
