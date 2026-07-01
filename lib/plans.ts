// Config des plans Atline (enum Plan : DISTRIBUTEUR | PRO | LEADER)
// Prix repris du mock — à ajuster ici si besoin (source unique de vérité).
export type PlanKey = 'DISTRIBUTEUR' | 'PRO' | 'LEADER'

export const PLANS: Record<PlanKey, { label: string; price: number; color: string; initial: string; desc: string }> = {
  DISTRIBUTEUR: { label: 'Distributeur', price: 0, color: 'bg-muted', initial: 'D', desc: 'Pour démarrer' },
  PRO: { label: 'Pro', price: 49, color: 'bg-primary', initial: 'P', desc: "L'outil complet pour performer" },
  LEADER: { label: 'Leader', price: 99, color: 'bg-amber-500', initial: '★', desc: "Pour les bâtisseurs d'équipe" },
}

export function planOf(plan: string | null | undefined) {
  return PLANS[(plan as PlanKey)] ?? PLANS.DISTRIBUTEUR
}
