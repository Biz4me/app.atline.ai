import {
  Compass, Sparkles, MessagesSquare, HeartHandshake, Users2,
  Calendar, GraduationCap, Headphones, BookOpen, Map, Coins, Scale, Moon,
  CalendarDays, BarChart3, Images, Link2, FileText, PartyPopper, Repeat, AtSign,
  Zap, Mail, Shield, Briefcase, Contact, Leaf, RotateCw, Phone, Gift,
  Sprout, Landmark, Route, type LucideIcon,
} from 'lucide-react'

/**
 * LES CINQ FAMILLES — la navigation de l'app, et sa seule source de vérité.
 *
 * Portage du modèle validé sur la maquette (31 juillet 2026), né d'un constat
 * de Patrice : « il faut cliquer des tas de fois retour pour revenir sur
 * l'accueil des agents », et « il faut donner une grosse visibilité aux 5
 * familles, c'est ça qui donne la fluidité ».
 *
 * Le diagnostic était juste : le fil de conversations était le seul axe, tout
 * le reste dormait dans un tiroir de vingt entrées, et chaque écran ouvert
 * ajoutait un retour. On descendait, on ne circulait pas.
 *
 * ── CE QUI CHANGE ──────────────────────────────────────────────────────────
 *
 *   • Cinq onglets permanents, un par famille, en couleur.
 *   • UNE PILE PAR ONGLET : on quitte Orion au milieu d'une conversation, on
 *     revient, on y est encore.
 *   • Appui sur l'onglet ACTIF = retour à sa racine. L'accueil d'une famille
 *     est toujours à un doigt, jamais à quatre retours.
 *   • Chaque racine porte SES outils. Le tiroir se vide dans les familles,
 *     là où on les cherche.
 *
 * ── LES COULEURS ───────────────────────────────────────────────────────────
 *
 * Toutes viennent de la charte des sept, aucune n'est inventée. Le teal se
 * libère avec l'absorption d'Aria par Atlas ; le bleu et le vert sont ceux du
 * DISC, réemployés ici parce que la charte n'en autorise pas d'autres.
 *
 * ── LA RÈGLE DES OUTILS PAS ENCORE PRÊTS ───────────────────────────────────
 *
 * Un outil sans `href` est affiché mais grisé et non cliquable. Jamais un lien
 * mort, jamais une page blanche. Une grille où dix outils marchent et où trente
 * annoncent franchement leur arrivée se lit comme un produit en construction ;
 * quarante liens dont trente cassent se lisent comme un produit défaillant.
 */

export type Outil = {
  icone: LucideIcon
  nom: string
  sous: string
  /** Absent = pas encore codé. Affiché en « à venir », non cliquable. */
  href?: string
}

export type Famille = {
  cle: 'atlas' | 'nova' | 'orion' | 'iris' | 'echo'
  agent: string
  verbe: string
  couleur: string
  icone: LucideIcon
  racine: string
  /** Chemins qui appartiennent à cette famille, pour l'onglet actif. */
  territoire: string[]
  outils: Outil[]
}

export const FAMILLES: Famille[] = [
  {
    cle: 'atlas',
    agent: 'Atlas',
    verbe: 'Piloter',
    couleur: '#F97316',
    icone: Compass,
    // L'app n'ouvre plus sur le fil de conversations mais sur le tableau de
    // bord : c'est lui qui pilote la journée.
    racine: '/home',
    territoire: ['/home', '/atlas', '/agenda', '/formation', '/aria'],
    outils: [
      { icone: Compass, nom: 'Parler à Atlas', sous: 'ton copilote', href: '/atlas' },
      { icone: Calendar, nom: 'Mon agenda', sous: 'tes rendez-vous', href: '/agenda' },
      { icone: GraduationCap, nom: 'Ma formation', sous: 'onze modules', href: '/formation' },
      { icone: Headphones, nom: 'M’entraîner', sous: 'appel simulé', href: '/aria' },
      { icone: BookOpen, nom: 'Mes livres', sous: 'l’essentiel du métier', href: '/formation/library' },
      { icone: Map, nom: 'Plans d’action', sous: 'selon ta situation' },
      { icone: Coins, nom: 'Plan de rémunération', sous: 'comment tu gagnes' },
      { icone: Scale, nom: 'Ce que je peux dire', sous: 'les limites légales' },
      { icone: Moon, nom: 'Mon bilan du soir', sous: 'trois minutes' },
    ],
  },
  {
    cle: 'nova',
    agent: 'Nova',
    verbe: 'Attirer',
    couleur: '#8B5CF6',
    icone: Sparkles,
    racine: '/nova',
    territoire: ['/nova'],
    outils: [
      { icone: Repeat, nom: 'Ma campagne', sous: 'sept jours, sept angles', href: '/nova/campagne' },
      { icone: AtSign, nom: 'Mes comptes', sous: 'réseaux connectés', href: '/nova/comptes' },
      { icone: CalendarDays, nom: 'Calendrier éditorial', sous: 'le mois d’un coup d’œil' },
      { icone: BarChart3, nom: 'Mes publications', sous: 'ce qui a marché' },
      { icone: Images, nom: 'Banque d’images', sous: 'photos, officielles, IA' },
      { icone: Link2, nom: 'Ma page & mes liens', sous: 'ta vitrine publique' },
      { icone: FileText, nom: 'Supports & scripts', sous: 'ce que tu envoies' },
      { icone: PartyPopper, nom: 'Événements & lives', sous: 'à venir' },
    ],
  },
  {
    cle: 'orion',
    agent: 'Orion',
    verbe: 'Convertir',
    couleur: '#3B82F6',
    icone: MessagesSquare,
    racine: '/orion',
    territoire: ['/orion', '/chats', '/contacts'],
    outils: [
      { icone: MessagesSquare, nom: 'Mes conversations', sous: 'le fil complet', href: '/chats' },
      { icone: Contact, nom: 'Mes contacts', sous: 'ton carnet', href: '/contacts' },
      { icone: Zap, nom: 'Relances du jour', sous: 'à valider une par une' },
      { icone: Mail, nom: 'Séquences e-mail', sous: 'qui en est où' },
      { icone: Shield, nom: 'Banque d’objections', sous: 'les réponses prêtes' },
      { icone: Briefcase, nom: 'LinkedIn', sous: 'le canal des pros' },
    ],
  },
  {
    cle: 'iris',
    agent: 'Iris',
    verbe: 'Fidéliser',
    couleur: '#14B8A6',
    icone: HeartHandshake,
    racine: '/iris',
    territoire: ['/iris'],
    outils: [
      { icone: HeartHandshake, nom: 'Mes clients', sous: 'ceux qui ont acheté' },
      { icone: Leaf, nom: 'Catalogue produits', sous: 'la gamme officielle' },
      { icone: RotateCw, nom: 'Commandes récurrentes', sous: 'ce qui revient' },
      { icone: Phone, nom: 'Ses appels', sous: 'avec ton numéro' },
      { icone: Gift, nom: 'Parrainage clients', sous: 'd’où viennent tes clients' },
    ],
  },
  {
    cle: 'echo',
    agent: 'Echo',
    verbe: 'Dupliquer',
    couleur: '#22C55E',
    icone: Users2,
    racine: '/echo',
    territoire: ['/echo', '/communaute', '/network'],
    outils: [
      { icone: Landmark, nom: 'Communauté', sous: 'entre distributeurs', href: '/communaute' },
      { icone: Sprout, nom: 'Mon équipe', sous: 'tes filleuls' },
      { icone: Route, nom: 'Parcours de démarrage', sous: 'les trente premiers jours' },
    ],
  },
]

/** Le méta — profil, activité, abonnement, réglages. Hors familles, au pied du rail. */
export const TERRITOIRE_COMPTE = [
  '/compte', '/profile', '/settings', '/abonnement', '/mon-abonnement', '/activities', '/notifications',
]

export function familleDe(pathname: string): Famille | null {
  return (
    FAMILLES.find((f) =>
      f.territoire.some((p) => pathname === p || pathname.startsWith(p + '/')),
    ) ?? null
  )
}
