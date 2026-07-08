'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRef, useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  ChevronLeft, ChevronRight, Sparkles, Mic,
  Search, X, History, Calendar,
  Plus, Zap, Brain, ListPlus, Check, RefreshCw,
  MessageSquare, Users, SquarePen,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { toast } from 'sonner'

// Agents — axe permanent du rail droit (même trio que la bottom nav mobile)
const AGENTS: { href: string; label: string; icon: LucideIcon; color: string }[] = [
  { href: '/atlas', label: 'Atlas', icon: Sparkles,  color: '#F97316' },
  { href: '/aria',  label: 'Aria',  icon: Mic,       color: '#14B8A6' },
  { href: '/nova',  label: 'Nova',  icon: SquarePen, color: '#8B5CF6' },
]

// On y est déjà « dans » l'agent (ou la messagerie) → rail réduit aux 3 agents, sans contextuel
const COLLAPSED_ONLY = ['/atlas', '/aria', '/nova', '/messages']

const DISC_SCENARIOS = [
  {
    phrase: '« J\'ai besoin de voir les chiffres avant de décider. »',
    answer: 'C',
    context: 'Lors d\'une présentation produit',
  },
  {
    phrase: '« On y va, on verra bien ce que ça donne ! »',
    answer: 'D',
    context: 'Face à une nouvelle opportunité',
  },
  {
    phrase: '« Mais les autres membres de l\'équipe, ils pensent quoi ? »',
    answer: 'S',
    context: 'Avant de prendre une décision',
  },
  {
    phrase: '« Je veux qu\'on soit tous partants avant de commencer. »',
    answer: 'I',
    context: 'En réunion de lancement',
  },
]

const DISC_COLORS: Record<string, { hex: string; label: string }> = {
  D: { hex: '#dc2626', label: 'Rouge — Dominant' },
  I: { hex: '#f4b342', label: 'Jaune — Influent' },
  S: { hex: '#22c55e', label: 'Vert — Stable' },
  C: { hex: '#3b82f6', label: 'Bleu — Consciencieux' },
}

const ICE_BREAKERS = [
  {
    lieu: 'Salle de sport',
    phrase: '« Tu t\'entraînes souvent ici ? J\'essaie de trouver des gens qui ont les mêmes objectifs. »',
    objectif: 'Récupérer ses coordonnées',
  },
  {
    lieu: 'Café',
    phrase: '« Tu travailles sur quoi en ce moment ? »',
    objectif: 'Ouvrir sur ses projets',
  },
  {
    lieu: 'Événement réseau',
    phrase: '« C\'est quoi le truc qui t\'a le plus surpris ici ce soir ? »',
    objectif: 'Créer une connexion authentique',
  },
]

const PHRASES_DU_JOUR = [
  { phrase: '« Tu travailles sur quoi en ce moment ? »', explication: 'Ouvre une conversation naturelle sur les projets et les ambitions.' },
  { phrase: '« T\'as l\'air de quelqu\'un qui avance — tu fais quoi dans la vie ? »', explication: 'Compliment + curiosité sincère — les gens adorent parler d\'eux.' },
  { phrase: '« Je rencontre des gens intéressants en ce moment, je peux te donner ma carte ? »', explication: 'Directe, valorisante, naturelle.' },
]

const ATLAS_SESSIONS = [
  { id: '1', icon: Sparkles, label: "Stratégie — relances prospects c...", time: "Auj. · 09:12", score: null },
  { id: '2', icon: Mic,      label: "Débrief simulation — Closing",        time: "Hier · 18:40",  score: 88 },
  { id: '3', icon: Sparkles, label: "Préparation call équipe",             time: "Hier · 08:30",  score: null },
]

const ariaContacts = [
  { id: 'c1', name: 'Sophie Laurent', stage: 'Closing',     sim: 'Suivi' },
  { id: 'c2', name: 'Thomas Renard',  stage: "Découverte",  sim: 'Invitation' },
  { id: 'c3', name: 'Julie Moreau',   stage: 'Suivi J+7',   sim: 'Suivi' },
  { id: 'c4', name: 'Marie Dupont',   stage: 'Filleule',    sim: "Démarrage" },
  { id: 'c5', name: 'Alex Martin',    stage: 'Partenaire',  sim: 'Coaching' },
  { id: 'c6', name: 'Sarah Petit',    stage: 'Prospect',    sim: 'Invitation' },
]

interface Props {
  collapsed: boolean
  onToggle: () => void
}

const HOME_MESSAGES = [
  { id: 'm1', initials: 'SL', name: 'Sophie Laurent', preview: "Ok je regarde ça ce soir !", time: '14:32', unread: true },
  { id: 'm2', initials: 'TH', name: 'Thomas Renard', preview: "Merci pour le script, ça a marché", time: 'Hier', unread: true },
  { id: 'm3', initials: 'AM', name: 'Alex Martin', preview: "Tu peux m'appeler ?", time: 'Hier', unread: false },
]

function HomeRailContent() {
  return (
    <div className="flex-1 overflow-y-auto px-[10px] py-3 flex flex-col gap-3">

      {/* Card Messages */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <MessageSquare className="size-4 stroke-[1.5] text-muted-foreground" />
            <p className="text-sm font-bold text-foreground">Messages</p>
          </div>
          <Link href="/messages" className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">Tout voir →</Link>
        </div>
        <div className="flex flex-col gap-0.5 p-2">
          {HOME_MESSAGES.map((m) => (
            <Link key={m.id} href="/messages" className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted transition-colors">
              <div className="relative shrink-0">
                <span className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-bold text-foreground">
                  {m.initials}
                </span>
                {m.unread && (
                  <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground">{m.name}</p>
                <p className="text-xs text-muted-foreground truncate">{m.preview}</p>
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0">{m.time}</span>
            </Link>
          ))}
        </div>
      </div>

    </div>
  )
}

const FORMATION_CRM = [
  { icon: Brain,    label: 'Repère les couleurs', sub: 'Profils DISC', href: '/formation' },
  { icon: Zap,      label: 'Brise-glace',          sub: 'Module 2',    href: '/formation' },
  { icon: ListPlus, label: "Script d'invitation",  sub: 'Module 3',    href: '/formation' },
]

function CrmRailContent() {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [contact, setContact] = useState<typeof ariaContacts[0] | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  const filtered = ariaContacts
    .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'))

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function selectContact(c: typeof ariaContacts[0]) {
    setContact(c)
    setSearch(c.name)
    setOpen(false)
  }

  function clearContact() {
    setContact(null)
    setSearch('')
  }

  return (
    <div className="flex-1 overflow-y-auto px-[10px] py-3 flex flex-col gap-3">

      {/* ── Card 1 : Formation CRM ── */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <p className="text-sm font-bold text-foreground">Alimenter ma liste</p>
          <Link href="/formation" className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
            Continuer →
          </Link>
        </div>
        <div className="flex flex-col gap-0.5 p-2">
          {FORMATION_CRM.map((item) => {
            const Icon = item.icon
            return (
              <Link key={item.label} href={item.href}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted transition-colors group">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted group-hover:bg-background transition-colors">
                  <Icon className="size-3.5 text-muted-foreground stroke-[1.5]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.sub}</p>
                </div>
                <ChevronRight className="size-3.5 text-muted-foreground/50 shrink-0" />
              </Link>
            )
          })}
        </div>
      </div>

      {/* ── Card 2 : Simulateur Aria ── */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <p className="text-sm font-bold text-foreground">Simulateur Aria</p>
          <Link href="/aria" className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">Voir tout →</Link>
        </div>
        <div className="p-4 flex flex-col gap-3">
          <div ref={ref} className="relative">
            <div className={cn(
              'flex items-center gap-2 rounded-xl border bg-muted px-3 py-2 transition-colors',
              open ? 'border-[#14B8A6]/40 ring-2 ring-[#14B8A6]/20' : 'border-border'
            )}>
              <Search className="size-3.5 shrink-0 text-muted-foreground stroke-[1.5]" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setContact(null); setOpen(true) }}
                onFocus={() => { if (!contact) setOpen(true) }}
                placeholder="Rechercher un contact..."
                className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
              />
              {search && (
                <button type="button" onClick={clearContact} className="text-muted-foreground hover:text-foreground">
                  <X className="size-3" />
                </button>
              )}
            </div>
            {open && filtered.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-xl border border-border bg-surface shadow-lg overflow-hidden">
                {filtered.map((c) => (
                  <button key={c.id} type="button" onClick={() => selectContact(c)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted transition-colors">
                    <span className="text-xs font-medium text-foreground">{c.name}</span>
                    <span className="text-xs text-muted-foreground">{c.stage}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {contact && (
            <div className="rounded-xl bg-muted/60 px-3 py-2.5 flex items-center gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {contact.name.split(' ').map((n) => n[0]).join('')}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">{contact.name}</p>
                <p className="text-xs text-muted-foreground">{contact.stage}</p>
              </div>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary shrink-0">{contact.sim}</span>
            </div>
          )}
          <Link
            href={contact ? `/aria?contact=${contact.id}&sim=${contact.sim}` : '/aria'}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-opacity text-white hover:opacity-90',
              !contact && 'pointer-events-none opacity-60'
            )}
            style={{ backgroundColor: '#14B8A6' }}
          >
            <Mic className="size-3.5 stroke-2" />
            {contact ? `Simuler — ${contact.sim}` : 'Simuler'}
          </Link>
        </div>
      </div>

      {/* ── Card 3 : Sessions avec Atlas ── */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <p className="text-sm font-bold text-foreground">Sessions avec Atlas</p>
          <Link href="/atlas" className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">Tout voir →</Link>
        </div>
        <div className="flex flex-col gap-0.5 p-2">
          {ATLAS_SESSIONS.map((s) => {
            const Icon = s.icon
            return (
              <Link key={s.id} href="/atlas"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted transition-colors group">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted group-hover:bg-background transition-colors">
                  <Icon className="size-3.5 text-muted-foreground stroke-[1.5]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{s.label}</p>
                  <p className="text-xs text-muted-foreground">{s.time}</p>
                </div>
                {s.score && (
                  <span className="flex size-6 items-center justify-center rounded-md bg-[#22c55e]/10 text-[#22c55e] text-[10px] font-bold shrink-0">{s.score}</span>
                )}
              </Link>
            )
          })}
        </div>
      </div>

    </div>
  )
}

export function AtlasSidebar({ collapsed, onToggle }: Props) {
  const pathname = usePathname()
  // Pages où l'on est déjà dans un agent / une messagerie : rail réduit aux agents, pas de contextuel
  const forceCollapsed = COLLAPSED_ONLY.some((p) => pathname === p || pathname.startsWith(p + '/'))
  const isCrm = pathname.startsWith('/contacts')
  const isHome = pathname === '/home' || pathname === '/'

  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [contact, setContact] = useState<typeof ariaContacts[0] | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  const filtered = ariaContacts
    .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'))

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function selectContact(c: typeof ariaContacts[0]) {
    setContact(c)
    setSearch(c.name)
    setOpen(false)
  }

  function clearContact() {
    setContact(null)
    setSearch('')
  }

  const isOpen = !collapsed && !forceCollapsed

  return (
    <>
      {/* Toggle fixe sur le trait vertical — masqué sur les pages réduites aux agents */}
      {!forceCollapsed && (
        <button
          type="button"
          onClick={onToggle}
          title={isOpen ? 'Réduire' : 'Développer'}
          style={{
            right: isOpen ? '348px' : '52px',
            top: '78px',
          }}
          className="hidden lg:flex fixed z-50 size-6 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground transition-[right] duration-200 ease-out"
        >
          {isOpen ? <ChevronRight className="size-3.5" /> : <ChevronLeft className="size-3.5" />}
        </button>
      )}

      <aside
        className={cn(
          'hidden lg:flex flex-col fixed right-0 top-14 h-[calc(100dvh-3.5rem)] z-40',
          'bg-background border-l border-border overflow-hidden',
          'transition-[width] duration-200 ease-out',
          isOpen ? 'w-[360px]' : 'w-16',
        )}
      >
        {/* Header agents — axe permanent, indépendant du contenu contextuel */}
        {isOpen && (
          <div className="shrink-0 px-3 pt-3 pb-2">
            <div className="grid grid-cols-3 gap-2">
              {AGENTS.map((agent) => {
                const Icon = agent.icon
                const active = pathname === agent.href || pathname.startsWith(agent.href + '/')
                return (
                  <Link
                    key={agent.href}
                    href={agent.href}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-xl py-2 transition-colors',
                      active ? 'bg-muted' : 'hover:bg-muted'
                    )}
                  >
                    <span
                      className="flex size-8 items-center justify-center rounded-full"
                      style={{ backgroundColor: agent.color + '18' }}
                    >
                      <Icon className="size-[18px] stroke-[1.5]" style={{ color: agent.color }} />
                    </span>
                    <span className="text-xs font-semibold text-foreground">{agent.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Collapsed — les 3 agents, toujours visibles.
            Contrat d'alignement : pt-3 + h-11 = centre du 1er item à 90px (même rythme que le rail gauche
            et la sidebar 2). Hauteur fixe → centre indépendant de la taille de l'icône.
            w-10 + items-end pr-4 = icône centrée à 36px du bord (axe du sparkle header). */}
        {!isOpen && (
          <nav className="flex flex-col items-end gap-0.5 pt-3 pr-4 overflow-x-hidden">
            {AGENTS.map((agent) => {
              const Icon = agent.icon
              const active = pathname === agent.href || pathname.startsWith(agent.href + '/')
              return (
                <Link
                  key={agent.href}
                  href={agent.href}
                  title={agent.label}
                  className={cn(
                    'flex h-11 w-10 items-center justify-center rounded-xl transition-colors',
                    active ? 'bg-muted' : 'hover:bg-muted'
                  )}
                >
                  <Icon className="size-5 stroke-[1.5]" style={{ color: agent.color }} />
                </Link>
              )
            })}
          </nav>
        )}

        {/* Content */}
        {isOpen && (
          isCrm ? <CrmRailContent /> :
          isHome ? <HomeRailContent /> : (
            <div className="flex-1 overflow-y-auto px-[10px] py-3 flex flex-col gap-3">

              {/* ── Card Simulateur Aria ── */}
              <div className="rounded-xl border border-border bg-surface overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold text-foreground">Simulateur Aria</p>
                  </div>
                  <Link href="/aria" className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">Voir tout →</Link>
                </div>
                <div className="p-4 flex flex-col gap-3">

                  {/* Recherche contact */}
                  <div ref={ref} className="relative">
                    <div className={cn(
                      'flex items-center gap-2 rounded-xl border bg-muted px-3 py-2 transition-colors',
                      open ? 'border-[#14B8A6]/40 ring-2 ring-[#14B8A6]/20' : 'border-border'
                    )}>
                      <Search className="size-3.5 shrink-0 text-muted-foreground stroke-[1.5]" />
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => {
                          setSearch(e.target.value)
                          setContact(null)
                          setOpen(true)
                        }}
                        onFocus={() => { if (!contact) setOpen(true) }}
                        placeholder="Rechercher un contact..."
                        className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
                      />
                      {search && (
                        <button type="button" onClick={clearContact} className="text-muted-foreground hover:text-foreground">
                          <X className="size-3" />
                        </button>
                      )}
                    </div>
                    {open && filtered.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-xl border border-border bg-surface shadow-lg overflow-hidden">
                        {filtered.map((c) => (
                          <button key={c.id} type="button" onClick={() => selectContact(c)}
                            className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted transition-colors">
                            <span className="text-xs font-medium text-foreground">{c.name}</span>
                            <span className="text-xs text-muted-foreground">{c.stage}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Contact sélectionné */}
                  {contact && (
                    <div className="rounded-xl bg-muted/60 px-3 py-2.5 flex items-center gap-2.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {contact.name.split(' ').map((n) => n[0]).join('')}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground">{contact.name}</p>
                        <p className="text-xs text-muted-foreground">{contact.stage}</p>
                      </div>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary shrink-0">
                        {contact.sim}
                      </span>
                    </div>
                  )}

                  {/* Bouton simuler */}
                  <Link
                    href={contact ? `/aria?contact=${contact.id}&sim=${contact.sim}` : '/aria'}
                    className={cn(
                      'flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-opacity text-white hover:opacity-90',
                      !contact && 'pointer-events-none opacity-60'
                    )}
                    style={{ backgroundColor: '#14B8A6' }}
                  >
                    <Mic className="size-3.5 stroke-2" />
                    {contact ? `Simuler — ${contact.sim}` : 'Simuler'}
                  </Link>

                  {/* Dernière session */}
                  <div className="flex items-start gap-2.5 rounded-xl bg-muted/60 p-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#22c55e]/10 text-[#22c55e] text-xs font-bold">82</span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-0.5">Dernière · Sophie Laurent</p>
                      <p className="text-xs text-foreground leading-relaxed italic">
                        &laquo; Bonne accroche — travaille ta relance sur l&apos;objection prix. &raquo;
                      </p>
                    </div>
                  </div>

                  {/* Sessions précédentes */}
                  <button type="button" onClick={() => toast.info("Sessions précédentes")}
                    className="flex w-full items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <History className="size-3.5 stroke-[1.5] shrink-0" />
                    <span className="flex-1 text-left">Mes sessions précédentes</span>
                    <ChevronRight className="size-3 shrink-0" />
                  </button>
                </div>
              </div>

              {/* ── Card Sessions avec Atlas ── */}
              <div className="rounded-xl border border-border bg-surface overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <p className="text-sm font-bold text-foreground">Sessions avec Atlas</p>
                  <Link href="/atlas" className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">Tout voir →</Link>
                </div>
                <div className="flex flex-col gap-0.5 p-2">
                  {ATLAS_SESSIONS.map((s) => {
                    const Icon = s.icon
                    return (
                      <Link key={s.id} href="/atlas"
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted transition-colors group">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted group-hover:bg-background transition-colors">
                          <Icon className="size-3.5 text-muted-foreground stroke-[1.5]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{s.label}</p>
                          <p className="text-xs text-muted-foreground">{s.time}</p>
                        </div>
                        {s.score && (
                          <span className="flex size-6 items-center justify-center rounded-md bg-[#22c55e]/10 text-[#22c55e] text-[10px] font-bold shrink-0">{s.score}</span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>

            </div>
          )
        )}
      </aside>
    </>
  )
}
