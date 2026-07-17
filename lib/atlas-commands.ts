// Catalogue des commandes de la nav messagerie — SOURCE UNIQUE partagée par
// la recherche plein écran (T3) et le menu « / » du composeur (T4).
// kind 'atlas'  → ouvre le fil Atlas et déclenche le flux (/atlas?cmd=…)
// kind 'route'  → navigue (feuille = écran riche par-dessus le chat)
// kind 'local'  → geste local à la surface appelante (ex. ouvrir AddContactSheet)

export type AtlasCommand = {
  cmd: string
  label: string
  desc: string
  emoji: string
  kind: 'atlas' | 'route' | 'local'
  param?: string // ?cmd=… (kind atlas)
  to?: string // destination (kind route)
  action?: 'add-contact' // geste local (kind local)
  feuille?: boolean
}

export const ATLAS_COMMANDS: AtlasCommand[] = [
  { cmd: '/plan', label: 'Mon plan du jour', desc: 'Mes priorités calculées et classées', emoji: '🎯', kind: 'atlas', param: 'plan' },
  { cmd: '/objectif', label: 'Mon score du mois', desc: 'Partenaires signés vs mon objectif', emoji: '🏁', kind: 'atlas', param: 'objectif' },
  { cmd: '/agenda', label: 'Mes rendez-vous', desc: "Ouvrir l'agenda", emoji: '📅', kind: 'route', to: '/agenda', feuille: true },
  { cmd: '/formation', label: 'Continuer ma formation', desc: "Reprendre là où j'en suis", emoji: '🎓', kind: 'route', to: '/formation', feuille: true },
  { cmd: '/contacts', label: 'Ma liste de contacts', desc: "L'outil de tri complet (segments, marché, stade)", emoji: '👥', kind: 'route', to: '/contacts', feuille: true },
  { cmd: '/nouveau', label: 'Ajouter un contact', desc: 'Créer une fiche dans ton CRM', emoji: '➕', kind: 'local', action: 'add-contact' },
]

// Filtre tolérant : minuscules + accents retirés (gros doigts, fautes légères).
export const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
export const matchCommand = (c: AtlasCommand, q: string) =>
  !q.trim() || norm(`${c.cmd} ${c.label} ${c.desc}`).includes(norm(q.trim()))
