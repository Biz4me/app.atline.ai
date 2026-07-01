import { redirect } from 'next/navigation'

export default function RootPage() {
  // Entrée de l'app = Atlas (le middleware renvoie les non-authentifiés vers /auth)
  redirect('/atlas')
}
