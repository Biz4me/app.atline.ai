import { Phone, BookOpen, UserPlus, ChevronRight } from "lucide-react"
import Link from "next/link"

const actions = [
  {
    label: "Simuler un appel",
    description: "Choisir un scénario",
    icon: Phone,
    href: "/simulations",
  },
  {
    label: "Voir ma formation",
    description: "Module en cours: Invitation",
    icon: BookOpen,
    href: "/formation",
  },
  {
    label: "Ajouter un prospect",
    description: "Pipeline: 8 actifs",
    icon: UserPlus,
    href: "/reseau/add",
  },
]

export function QuickActions() {
  return (
    <section>
      <h3 className="mb-3 font-heading text-base font-medium">
        Actions rapides
      </h3>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {actions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="flex h-12 items-center justify-between rounded-lg border border-border bg-card px-3 transition-colors hover:bg-muted"
          >
            <div className="flex items-center gap-3">
              <action.icon className="h-4 w-4 shrink-0 text-primary" />
              <div className="flex flex-col">
                <span className="text-sm font-medium">{action.label}</span>
                <span className="text-[11px] text-muted-foreground">
                  {action.description}
                </span>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </section>
  )
}
