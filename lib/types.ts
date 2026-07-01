// ============================================================================
// Atline — Types
// ============================================================================

export type DiscType = 'D' | 'I' | 'S' | 'C'

export type ContactStage =
  | 'nouveau'
  | 'closing'
  | 'prospect'
  | 'client'
  | 'partenaire'

export type ContactPipelineStage =
  | 'invitation'
  | 'présentation'
  | 'suivi'
  | 'closing'
  | 'démarré'

export type Platform = 'instagram' | 'linkedin' | 'facebook' | 'whatsapp'

export type Plan = 'distributeur' | 'pro' | 'leader'

export interface Business {
  id: string
  name: string
  initials: string
  color: string
  isAtline?: boolean
}

export interface Contact {
  id: string
  firstName: string
  lastName: string
  stage: ContactStage
  stade?: ContactPipelineStage
  disc: DiscType | null
  source: string
  lastInteraction: string
  phone?: string
  email?: string
  city?: string
  inCrm: boolean
  businessId: string
  notes?: string
  timeline: TimelineEvent[]
}

export interface TimelineEvent {
  id: string
  type: 'message' | 'call' | 'note' | 'stage' | 'meeting'
  label: string
  date: string
}

export type PostType = 'lifestyle' | 'produit' | 'opportunite'
export type PostStatus = 'brouillon' | 'planifie' | 'publie'

export interface Post {
  id: string
  title: string
  type: PostType
  platform: Platform
  format: string
  pillar: string
  date: string
  status: PostStatus
}

export interface InboxMessage {
  id: string
  name: string
  platform: Platform
  time: string
  quote: string
  atlasScore: number
  novaSuggestion: string
  disc: DiscType | null
}

export interface Pillar {
  id: string
  label: string
  category: string
  color: string
}

export interface NetworkMember {
  id: string
  firstName: string
  lastName: string
  plan: Plan
  disc: DiscType | null
  teamVolume: number
  isAtlineLicensee: boolean
  children?: NetworkMember[]
}
