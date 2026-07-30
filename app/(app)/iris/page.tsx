import { FamilleAccueil } from '@/components/famille-accueil'
import { FAMILLES } from '@/lib/familles'

// Racine de la famille — créée avec le portage de la nav à 5 familles.
// Tout le contenu vit dans lib/familles.ts : cette page n'est qu'un point d'entrée.
export default function Page() {
  return <FamilleAccueil famille={FAMILLES.find((f) => f.cle === 'iris')!} />
}
