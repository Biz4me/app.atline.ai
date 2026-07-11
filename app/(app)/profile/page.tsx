import { redirect } from 'next/navigation'

// /profile n'a pas de page propre : tout vit dans /profile/edit.
// Redirection pour couvrir le rail desktop, les cartes Atlas et les anciens liens.
export default function ProfilePage() {
  redirect('/profile/edit')
}
