import Link from 'next/link'
import { Ecran } from '@/components/ecran'
import type { Famille } from '@/lib/familles'

/**
 * L'ACCUEIL D'UNE FAMILLE — sa grille d'outils.
 *
 * C'est l'écran qui remplace le tiroir de vingt entrées. Un outil se cherche
 * là où on travaille, pas dans un menu séparé.
 *
 * ── LA RÈGLE DES OUTILS PAS ENCORE PRÊTS ───────────────────────────────────
 *
 * Un outil sans `href` s'affiche mais reste grisé et non cliquable, marqué
 * « bientôt ». Jamais un lien mort, jamais une page blanche.
 *
 * C'est un choix assumé, discuté avec Patrice : la maquette décrit 111 écrans,
 * l'app en a 33. Masquer ce qui manque donnerait une app plus propre mais
 * muette sur sa direction ; afficher des liens qui cassent donnerait une app
 * qui paraît défaillante. Annoncer franchement ce qui arrive donne une app en
 * construction, ce qu'elle est.
 */
export function FamilleAccueil({ famille }: { famille: Famille }) {
  const prets = famille.outils.filter((o) => o.href).length

  return (
    <Ecran titre={famille.verbe}>
      <div className="mx-auto w-full max-w-2xl pb-6">
        {/* L'agent se présente ici, pas dans l'onglet : la barre porte le VERBE,
            parce qu'on cherche ce qu'on veut faire avant de savoir qui le fait. */}
        <div className="flex items-center gap-3 pb-4">
          <span
            className="grid size-11 shrink-0 place-items-center rounded-2xl"
            style={{ background: `${famille.couleur}1A`, color: famille.couleur }}
          >
            <famille.icone className="size-[22px] stroke-[1.75]" />
          </span>
          <div className="min-w-0">
            <p className="text-lg font-bold text-foreground">{famille.agent}</p>
            <p className="text-xs text-muted-foreground">
              {prets} outil{prets > 1 ? 's' : ''} disponible{prets > 1 ? 's' : ''} sur {famille.outils.length}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {famille.outils.map((o) => {
            const contenu = (
              <>
                <o.icone
                  className="size-[18px] stroke-[1.75]"
                  style={o.href ? { color: famille.couleur } : undefined}
                />
                <p className="mt-1.5 text-xs font-bold leading-tight text-foreground">{o.nom}</p>
                <p className="mt-0.5 text-2xs leading-tight text-muted-foreground">{o.sous}</p>
              </>
            )

            if (!o.href) {
              return (
                <div
                  key={o.nom}
                  aria-disabled="true"
                  className="relative rounded-2xl border border-border bg-surface p-3 opacity-45"
                >
                  <span className="absolute right-2 top-2 rounded-full bg-muted px-1.5 py-0.5 text-2xs font-semibold text-muted-foreground">
                    bientôt
                  </span>
                  {contenu}
                </div>
              )
            }

            return (
              <Link
                key={o.nom}
                href={o.href}
                className="rounded-2xl border border-border bg-surface p-3 shadow-card transition-transform active:scale-[.98]"
              >
                {contenu}
              </Link>
            )
          })}
        </div>
      </div>
    </Ecran>
  )
}
