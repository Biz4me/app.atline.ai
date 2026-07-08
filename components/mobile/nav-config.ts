import {
  LayoutDashboard, TrendingUp, ContactRound, Users, MessageSquare, Calendar, BookOpen, Library,
  User, Briefcase, CreditCard, Share2, Bell, Link2, Lock, HelpCircle, Mail,
  Sparkles, Mic, SquarePen,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type NavPage = { href: string; label: string; icon: LucideIcon; mobile?: 'drawer' | 'topbar' | 'hidden'; mobileLabel?: string }
export type NavGroup = { label: string; head: string; icon: LucideIcon; visKey: string; items: NavPage[] }
export type NavItem = { href: string; label: string; icon: LucideIcon }

// ─────────────────────────────────────────────────────────────
// SOURCE DE VÉRITÉ UNIQUE — mobile ET desktop lisent d'ici.
// Groupes = les 4 rubriques desktop. Chaque item porte un rôle mobile.
// ─────────────────────────────────────────────────────────────
export const NAV_GROUPS: NavGroup[] = [
  { label: 'Tableau de bord', head: '/home', icon: LayoutDashboard, visKey: 'home', items: [
    { href: '/home', label: 'Tableau de bord', icon: LayoutDashboard, mobile: 'drawer' },
    { href: '/rapport', label: 'Rapport', icon: TrendingUp, mobile: 'hidden' },
  ] },
  { label: 'Terrain', head: '/contacts', icon: Users, visKey: 'contacts', items: [
    { href: '/contacts', label: 'Contacts', icon: ContactRound, mobile: 'drawer' },
  ] },
  { label: 'Échanges', head: '/messages', icon: MessageSquare, visKey: 'messages', items: [
    { href: '/messages', label: 'Messages', icon: MessageSquare, mobile: 'drawer' },
    { href: '/communaute', label: 'Communauté', icon: Users, mobile: 'drawer' },
    { href: '/agenda', label: 'Agenda', icon: Calendar, mobile: 'drawer' },
  ] },
  { label: 'Formation', head: '/formation', icon: BookOpen, visKey: 'formation', items: [
    { href: '/formation', label: 'Mes modules', icon: BookOpen, mobile: 'drawer', mobileLabel: 'Formation' },
    { href: '/formation/library', label: 'Bibliothèque', icon: Library, mobile: 'hidden' },
  ] },
]

const ALL_PAGES = NAV_GROUPS.flatMap((g) => g.items)

// Rail desktop : les têtes de groupe
export const RAIL = NAV_GROUPS.map((g) => ({
  href: g.head, label: g.label, icon: g.icon, visKey: g.visKey, match: g.items.map((i) => i.href),
}))

// Tiroir mobile : items marqués 'drawer', à plat (label mobile prioritaire)
// + raccourci Nova (agent) pour lancer une campagne en un tap (mobile uniquement, desktop a son rail d'agents)
export const DRAWER_SECTIONS: NavItem[] = [
  ...ALL_PAGES.filter((i) => i.mobile === 'drawer').map((i) => ({ href: i.href, label: i.mobileLabel ?? i.label, icon: i.icon })),
  { href: '/nova', label: 'Nova', icon: SquarePen },
]

// Agents IA — composeur (bas) + switcher (badge)
export const AGENTS: { href: string; label: string; sub: string; icon: LucideIcon; color: string }[] = [
  { href: '/atlas', label: 'Atlas', sub: 'Coach IA', icon: Sparkles, color: '#F97316' },
  { href: '/aria', label: 'Aria', sub: 'Simulateur terrain', icon: Mic, color: '#14B8A6' },
  { href: '/nova', label: 'Nova', sub: 'Réseaux sociaux', icon: SquarePen, color: '#8B5CF6' },
]
export const AGENT_PATHS = AGENTS.map((a) => a.href)

// Hub compte (via avatar) — l'ancien menu « Plus »
export const HUB_ATLINE: NavItem[] = [
  { href: '/profile/edit', label: 'Profil', icon: User },
  { href: '/activities', label: 'Activité MLM', icon: Briefcase },
  { href: '/mon-abonnement', label: 'Abonnement', icon: CreditCard },
]
export const HUB_COMPTE: NavItem[] = [
  { href: '/settings/preferences', label: 'Préférences', icon: Bell },
  { href: '/settings/parrainage', label: 'Parrainage', icon: Share2 },
  { href: '/settings/comptes-lies', label: 'Comptes liés', icon: Link2 },
  { href: '/settings/confidentialite', label: 'Confidentialité', icon: Lock },
  { href: '/settings/centre-aide', label: "Centre d'aide", icon: HelpCircle },
  { href: '/settings/contact', label: 'Contact', icon: Mail },
]

const matches = (pathname: string, href: string) => pathname === href || pathname.startsWith(href + '/')

// Groupe desktop courant selon la route (remplace l'ancien getSidebarSection hardcodé)
export function groupForPath(pathname: string): NavGroup | null {
  if (pathname === '/') return NAV_GROUPS[0]
  return NAV_GROUPS.find((g) => g.items.some((i) => matches(pathname, i.href))) ?? null
}

// Titre de la barre du haut (agent, ou page) — label mobile prioritaire
export function titleForPath(pathname: string): string {
  // Pages agent : pas de titre dans la barre du haut (l'agent aura son propre traitement)
  if (isAgentPath(pathname)) return ''
  const page = ALL_PAGES.find((i) => matches(pathname, i.href))
  return page ? (page.mobileLabel ?? page.label) : ''
}

export const isAgentPath = (pathname: string) => AGENT_PATHS.some((p) => matches(pathname, p))
