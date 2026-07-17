// Catalogue des commandes de la nav messagerie — SOURCE UNIQUE partagée par
// la recherche plein écran (T3) et le menu « / » du composeur (T4).
// kind 'atlas'   → ouvre le fil Atlas et déclenche le flux (/atlas?cmd=…) ; `ask` = la phrase envoyée
// kind 'route'   → navigue (feuille = écran riche par-dessus le chat)
// kind 'prefill' → prépare le composeur d'Atlas (« Rédige un message pour … ») : l'utilisateur
//                  complète le nom, Atlas et ses OUTILS existants font le reste (pas de parseur maison)
// kind 'local'   → geste local à la surface appelante (ex. ouvrir AddContactSheet)

export type AtlasCommand = {
  cmd: string
  label: string
  desc: string
  emoji: string
  kind: 'atlas' | 'route' | 'prefill' | 'local'
  param?: string // ?cmd=… (kind atlas)
  ask?: string // phrase envoyée à Atlas (kind atlas, hors plan)
  to?: string // destination (kind route)
  prefill?: string // texte posé dans le composeur (kind prefill)
  action?: 'add-contact' // geste local (kind local)
  feuille?: boolean
}

export const ATLAS_COMMANDS: AtlasCommand[] = [
  { cmd: '/plan', label: 'Mon plan du jour', desc: 'Mes priorités calculées et classées', emoji: '🎯', kind: 'atlas', param: 'plan' },
  { cmd: '/brouillon', label: 'Rédiger un message', desc: 'Un brouillon prêt à envoyer pour un contact', emoji: '✍️', kind: 'prefill', prefill: 'Rédige un message pour ' },
  { cmd: '/debrief', label: 'Débriefer un RDV', desc: "Saisir le résultat d'un rendez-vous passé", emoji: '🤝', kind: 'prefill', prefill: 'On débriefe mon RDV avec ' },
  { cmd: '/relance', label: 'Programmer une relance', desc: 'Atlas pose le rappel pour toi', emoji: '⏰', kind: 'prefill', prefill: 'Programme une relance pour ' },
  { cmd: '/fiche', label: 'Le point sur un contact', desc: 'Atlas te fait le résumé complet', emoji: '👤', kind: 'prefill', prefill: 'Fais-moi le point sur ' },
  { cmd: '/objectif', label: 'Mon score du mois', desc: 'Partenaires signés vs mon objectif', emoji: '🏁', kind: 'atlas', param: 'objectif', ask: "Fais le point sur mon objectif de partenaires ce mois-ci : où j'en suis, et qu'est-ce qui ferait avancer le score ?" },
  { cmd: '/agenda', label: 'Mes rendez-vous', desc: "Ouvrir l'agenda", emoji: '📅', kind: 'route', to: '/agenda', feuille: true },
  { cmd: '/formation', label: 'Continuer ma formation', desc: "Reprendre là où j'en suis", emoji: '🎓', kind: 'route', to: '/formation', feuille: true },
  { cmd: '/contacts', label: 'Ma liste de contacts', desc: "L'outil de tri complet (segments, marché, stade)", emoji: '👥', kind: 'route', to: '/contacts', feuille: true },
  { cmd: '/nouveau', label: 'Ajouter un contact', desc: 'Créer une fiche dans ton CRM', emoji: '➕', kind: 'local', action: 'add-contact' },
]

// Filtre tolérant : minuscules + accents retirés (gros doigts, fautes légères).
export const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
export const matchCommand = (c: AtlasCommand, q: string) =>
  !q.trim() || norm(`${c.cmd} ${c.label} ${c.desc}`).includes(norm(q.trim()))
