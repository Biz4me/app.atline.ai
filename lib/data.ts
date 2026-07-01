import type {
  Business,
  Contact,
  Post,
  InboxMessage,
  Pillar,
  NetworkMember,
} from './types'

export const currentUser = {
  firstName: 'Léa',
  lastName: 'Moreau',
  plan: 'pro' as const,
  streak: 12,
  level: 7,
  directReferrals: 8,
  avatarColor: 'var(--disc-yellow)',
}

export const businesses: Business[] = [
  { id: 'atline', name: 'Atline', initials: 'A', color: '#f97316', isAtline: true },
  { id: 'forever', name: 'Forever Living', initials: 'FL', color: '#22c55e' },
]

// --- Money formatting ----------------------------------------------------
export function euro(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(amount)
}

export const stageLabels: Record<string, string> = {
  nouveau: 'Nouveau',
  closing: 'Closing',
  prospect: 'Prospect',
  client: 'Client',
  partenaire: 'Partenaire',
}

export const platformLabels: Record<string, string> = {
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  whatsapp: 'WhatsApp',
}

export const discLabels: Record<string, string> = {
  D: 'Dominant',
  I: 'Influent',
  S: 'Stable',
  C: 'Consciencieux',
}

export const discColors: Record<string, string> = {
  D: 'var(--disc-red)',
  I: 'var(--disc-yellow)',
  S: 'var(--disc-green)',
  C: 'var(--disc-blue)',
}

// --- Contacts ------------------------------------------------------------
export const contacts: Contact[] = [
  {
    id: 'c1',
    firstName: 'Thomas',
    lastName: 'Bernard',
    stage: 'closing',
    stade: 'suivi',
    disc: 'D',
    source: 'Instagram',
    lastInteraction: 'Il y a 2 h',
    phone: '06 12 34 56 78',
    email: 'thomas.bernard@email.fr',
    city: 'Lyon',
    inCrm: true,
    businessId: 'atline',
    notes: 'Très intéressé par l’opportunité. Veut un rendez-vous cette semaine.',
    timeline: [
      { id: 't1', type: 'message', label: 'A répondu à ta story', date: 'Aujourd’hui · 14:20' },
      { id: 't2', type: 'call', label: 'Appel découverte 12 min', date: 'Hier · 18:05' },
      { id: 't3', type: 'stage', label: 'Passé en "Chaud"', date: 'Lundi' },
    ],
  },
  {
    id: 'c2',
    firstName: 'Camille',
    lastName: 'Dubois',
    stage: 'prospect',
    stade: 'invitation',
    disc: 'I',
    source: 'LinkedIn',
    lastInteraction: 'Hier',
    phone: '06 98 76 54 32',
    email: 'camille.dubois@email.fr',
    city: 'Paris',
    inCrm: true,
    businessId: 'atline',
    notes: 'Adore le côté communauté. À relancer avec un témoignage.',
    timeline: [
      { id: 't1', type: 'message', label: 'Échange sur LinkedIn', date: 'Hier · 10:30' },
      { id: 't2', type: 'note', label: 'Note ajoutée', date: 'Mardi' },
    ],
  },
  {
    id: 'c3',
    firstName: 'Karim',
    lastName: 'Haddad',
    stage: 'client',
    stade: 'démarré',
    disc: 'S',
    source: 'Recommandation',
    lastInteraction: 'Il y a 3 j',
    phone: '07 11 22 33 44',
    email: 'karim.haddad@email.fr',
    city: 'Marseille',
    inCrm: true,
    businessId: 'atline',
    notes: 'Client fidèle depuis 4 mois. Candidat parfait pour devenir partenaire.',
    timeline: [
      { id: 't1', type: 'meeting', label: 'RDV suivi produit', date: 'Lundi · 11:00' },
      { id: 't2', type: 'stage', label: 'Passé en "Client"', date: 'Il y a 3 mois' },
    ],
  },
  {
    id: 'c4',
    firstName: 'Sophie',
    lastName: 'Lefèvre',
    stage: 'partenaire',
    stade: 'démarré',
    disc: 'C',
    source: 'Événement',
    lastInteraction: 'Aujourd’hui',
    phone: '06 55 44 33 22',
    email: 'sophie.lefevre@email.fr',
    city: 'Bordeaux',
    inCrm: true,
    businessId: 'atline',
    notes: 'Construit son équipe rapidement. Très analytique, aime les chiffres.',
    timeline: [
      { id: 't1', type: 'message', label: 'A validé son plan Pro', date: 'Aujourd’hui · 09:15' },
      { id: 't2', type: 'call', label: 'Coaching équipe', date: 'Vendredi' },
    ],
  },
  {
    id: 'c5',
    firstName: 'Lucas',
    lastName: 'Petit',
    stage: 'nouveau',
    disc: null,
    source: 'Instagram',
    lastInteraction: 'Il y a 5 j',
    inCrm: true,
    businessId: 'atline',
    timeline: [
      { id: 't1', type: 'message', label: 'A liké 3 publications', date: 'Il y a 5 j' },
    ],
  },
  {
    id: 'c6',
    firstName: 'Emma',
    lastName: 'Rousseau',
    stage: 'prospect',
    stade: 'invitation',
    disc: null,
    source: 'Facebook',
    lastInteraction: 'Il y a 1 sem',
    inCrm: true,
    businessId: 'atline',
    timeline: [
      { id: 't1', type: 'message', label: 'Question sur les produits', date: 'Il y a 1 sem' },
    ],
  },
  {
    id: 'c7',
    firstName: 'Nadia',
    lastName: 'Benali',
    stage: 'closing',
    stade: 'présentation',
    disc: 'I',
    source: 'WhatsApp',
    lastInteraction: 'Il y a 4 h',
    phone: '07 88 99 00 11',
    city: 'Lille',
    inCrm: true,
    businessId: 'atline',
    notes: 'Énergie incroyable, prête à se lancer.',
    timeline: [
      { id: 't1', type: 'message', label: 'Vocal de 3 min envoyé', date: 'Aujourd’hui · 12:40' },
    ],
  },
  {
    id: 'c8',
    firstName: 'Hugo',
    lastName: 'Marchand',
    stage: 'client',
    disc: null,
    source: 'Recommandation',
    lastInteraction: 'Il y a 2 sem',
    inCrm: true,
    businessId: 'forever',
    timeline: [],
  },
  {
    id: 'c9',
    firstName: 'Marc',
    lastName: 'Fontaine',
    stage: 'prospect',
    disc: 'D',
    source: 'LinkedIn',
    lastInteraction: 'Il y a 2 j',
    phone: '06 33 44 55 66',
    email: 'marc.fontaine@email.fr',
    city: 'Nantes',
    inCrm: true,
    businessId: 'atline',
    notes: "Cherche un complément de revenu sérieux. Veut des chiffres concrets.",
    timeline: [
      { id: 't1', type: 'message', label: 'Message LinkedIn', date: 'Il y a 2 j' },
    ],
  },
  {
    id: 'c10',
    firstName: 'Julie',
    lastName: 'Martin',
    stage: 'closing',
    disc: 'I',
    source: 'Facebook',
    lastInteraction: 'Il y a 6 h',
    phone: '07 22 33 44 55',
    city: 'Toulouse',
    inCrm: true,
    businessId: 'atline',
    notes: "Très enthousiaste, a partagé ma story. Appel prévu demain.",
    timeline: [
      { id: 't1', type: 'message', label: 'A commenté une publication', date: "Aujourd'hui · 10:15" },
      { id: 't2', type: 'stage', label: 'Passée en "Chaud"', date: 'Hier' },
    ],
  },
  {
    id: 'c11',
    firstName: 'Pierre',
    lastName: 'Dupont',
    stage: 'client',
    disc: 'C',
    source: 'Recommandation',
    lastInteraction: 'Il y a 1 sem',
    phone: '06 77 88 99 00',
    email: 'pierre.dupont@email.fr',
    city: 'Nice',
    inCrm: true,
    businessId: 'atline',
    notes: "Analytique, lit tout avant d'acheter. Très satisfait des produits.",
    timeline: [
      { id: 't1', type: 'meeting', label: 'Suivi commande', date: 'Il y a 1 sem' },
      { id: 't2', type: 'stage', label: 'Passé en "Client"', date: 'Il y a 2 mois' },
    ],
  },
  {
    id: 'c12',
    firstName: 'Amina',
    lastName: 'Diallo',
    stage: 'partenaire',
    disc: 'S',
    source: 'Instagram',
    lastInteraction: 'Hier',
    phone: '06 11 00 99 88',
    email: 'amina.diallo@email.fr',
    city: 'Strasbourg',
    inCrm: true,
    businessId: 'atline',
    notes: "Profil relationnel fort. A déjà recruté 3 personnes dans son équipe.",
    timeline: [
      { id: 't1', type: 'call', label: 'Coaching mensuel', date: 'Hier · 14:00' },
      { id: 't2', type: 'stage', label: 'Passée en "Partenaire"', date: 'Il y a 1 mois' },
    ],
  },
  {
    id: 'c13',
    firstName: 'Romain',
    lastName: 'Leroy',
    stage: 'nouveau',
    disc: null,
    source: 'WhatsApp',
    lastInteraction: 'Il y a 3 j',
    inCrm: true,
    businessId: 'atline',
    timeline: [
      { id: 't1', type: 'message', label: 'Premier contact via groupe', date: 'Il y a 3 j' },
    ],
  },
]

// --- Posts (Nova calendar) ----------------------------------------------
export const posts: Post[] = [
  {
    id: 'p1',
    title: 'Ma routine matinale pour rester focus',
    type: 'lifestyle',
    platform: 'instagram',
    format: 'Reel',
    pillar: 'Inspiration',
    date: "Aujourd'hui · 18:00",
    status: 'planifie',
  },
  {
    id: 'p2',
    title: 'Le produit qui a changé mon énergie',
    type: 'produit',
    platform: 'instagram',
    format: 'Carrousel',
    pillar: 'Preuve sociale',
    date: 'Demain · 12:30',
    status: 'planifie',
  },
  {
    id: 'p3',
    title: 'Pourquoi j’ai choisi l’entrepreneuriat',
    type: 'opportunite',
    platform: 'linkedin',
    format: 'Post texte',
    pillar: 'Vision',
    date: 'Jeudi · 09:00',
    status: 'brouillon',
  },
  {
    id: 'p4',
    title: 'Behind the scenes de ma semaine',
    type: 'lifestyle',
    platform: 'instagram',
    format: 'Story',
    pillar: 'Coulisses',
    date: 'Vendredi · 19:00',
    status: 'planifie',
  },
  {
    id: 'p5',
    title: 'Témoignage de Karim après 3 mois',
    type: 'produit',
    platform: 'facebook',
    format: 'Vidéo',
    pillar: 'Preuve sociale',
    date: 'Samedi · 11:00',
    status: 'brouillon',
  },
]

// 70 / 20 / 10 balance derived from posts
export const contentBalance = { lifestyle: 64, produit: 27, opportunite: 9 }

// --- Inbox ---------------------------------------------------------------
export const inboxMessages: InboxMessage[] = [
  {
    id: 'm1',
    name: 'Julie Fontaine',
    platform: 'instagram',
    time: 'Il y a 15 min',
    quote:
      'Coucou ! J’ai vu ta story sur ta routine, ça m’intéresse trop. Tu fais quoi exactement ?',
    atlasScore: 92,
    novaSuggestion:
      'Score élevé : pose une question ouverte sur son objectif avant de présenter l’opportunité.',
    disc: 'I',
  },
  {
    id: 'm2',
    name: 'Marc Lemaire',
    platform: 'linkedin',
    time: 'Il y a 1 h',
    quote:
      'Bonjour, je cherche un complément de revenu sérieux. Est-ce que vous proposez de la formation ?',
    atlasScore: 78,
    novaSuggestion:
      'Profil analytique : envoie des données concrètes et un cadre clair de démarrage.',
    disc: 'C',
  },
  {
    id: 'm3',
    name: 'Inès Garnier',
    platform: 'facebook',
    time: 'Il y a 3 h',
    quote: 'Merci pour l’info ! Je vais y réfléchir tranquillement.',
    atlasScore: 45,
    novaSuggestion:
      'Score moyen : ne force pas. Propose une ressource utile et relance dans 3 jours.',
    disc: null,
  },
]

// --- Pillars -------------------------------------------------------------
export const pillars: Pillar[] = [
  { id: 'pi1', label: 'Inspiration', category: 'Lifestyle', color: 'var(--disc-yellow)' },
  { id: 'pi2', label: 'Coulisses', category: 'Lifestyle', color: 'var(--info)' },
  { id: 'pi3', label: 'Preuve sociale', category: 'Produit', color: 'var(--success)' },
  { id: 'pi4', label: 'Éducation produit', category: 'Produit', color: 'var(--violet)' },
  { id: 'pi5', label: 'Vision', category: 'Opportunité', color: 'var(--primary)' },
]

export const strategyGuides = [
  { id: 'g1', title: 'La règle des 70/20/10', desc: 'Équilibrer ton contenu pour vendre sans vendre' },
  { id: 'g2', title: 'Écrire des hooks qui arrêtent le scroll', desc: '5 structures qui fonctionnent' },
  { id: 'g3', title: 'Transformer une story en conversation', desc: 'Le funnel DM en 3 étapes' },
]

// --- Network -------------------------------------------------------------
export const networkStats = {
  directReferrals: 8,
  teamVolume: 142,
  monthCommission: 2847.5,
}

export const network: NetworkMember[] = [
  {
    id: 'n1',
    firstName: 'Sophie',
    lastName: 'Lefèvre',
    plan: 'leader',
    disc: 'C',
    teamVolume: 48,
    isAtlineLicensee: true,
    children: [
      { id: 'n1a', firstName: 'Paul', lastName: 'Girard', plan: 'pro', disc: 'D', teamVolume: 12, isAtlineLicensee: false },
      { id: 'n1b', firstName: 'Léna', lastName: 'Mercier', plan: 'distributeur', disc: 'I', teamVolume: 6, isAtlineLicensee: true },
    ],
  },
  {
    id: 'n2',
    firstName: 'Karim',
    lastName: 'Haddad',
    plan: 'pro',
    disc: 'S',
    teamVolume: 34,
    isAtlineLicensee: false,
    children: [
      { id: 'n2a', firstName: 'Yasmine', lastName: 'Roux', plan: 'distributeur', disc: null, teamVolume: 4, isAtlineLicensee: false },
    ],
  },
  {
    id: 'n3',
    firstName: 'Nadia',
    lastName: 'Benali',
    plan: 'distributeur',
    disc: 'I',
    teamVolume: 18,
    isAtlineLicensee: true,
    children: [],
  },
]

export const planLabels: Record<string, string> = {
  distributeur: 'Distributeur',
  pro: 'Pro',
  leader: 'Leader',
}

// --- Aria personas -------------------------------------------------------
export const ariaPersonas = [
  { id: 'sceptique', label: 'Le sceptique', desc: 'Doute de tout, teste ta conviction' },
  { id: 'occupe', label: 'L’occupé', desc: 'Pas le temps, va droit au but' },
  { id: 'curieux', label: 'Le curieux', desc: 'Pose beaucoup de questions' },
  { id: 'negociateur', label: 'Le négociateur', desc: 'Cherche la meilleure offre' },
]

export const ariaDifficulties = ['Facile', 'Moyen', 'Difficile', 'Pro']
