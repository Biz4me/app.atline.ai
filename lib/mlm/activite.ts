/**
 * DANS QUELLE ACTIVITÉ LE DISTRIBUTEUR TRAVAILLE-T-IL EN CE MOMENT ?
 *
 * ── POURQUOI CE FICHIER EXISTE ────────────────────────────────────────────
 *
 * Un distributeur peut porter plusieurs activités MLM. Son choix est rangé
 * dans `UserPreferences.activeCompanyId`, et presque tout le code le respecte.
 * Mais il le respecte en RECOPIANT les mêmes quatre lignes : lire les
 * préférences, chercher l'activité choisie, retomber sur la première sinon.
 *
 * Mesuré le 5 novembre 2026 : **39 endroits** font ce bloc à la main, et
 * **deux l'ont oublié** — les deux chemins de prise de rendez-vous
 * (`/api/booking/[slug]` et `/api/cal/webhook`). Ils prenaient
 * `findFirst({ active: true })`, donc **l'activité que la base rendait en
 * premier**. Pour le seul compte qui a deux activités actives, un rendez-vous
 * et son contact pouvaient atterrir dans la mauvaise, sans que rien ne le
 * dise.
 *
 * 🧭 Le défaut n'était pas l'oubli : c'était qu'il n'y avait **rien à
 * appeler**. Tant qu'un motif se recopie, il finit par être recopié de
 * travers. Cette fonction est la correction ET ce qui empêche la quarantième
 * occurrence de recommencer.
 *
 * ⚠️ Cette fonction existe aussi dans V2 (`app.atline.online`) : deux dépôts,
 * une seule base. Si on change la règle ici, la changer là-bas.
 */

import { db } from '@/lib/db'

/**
 * L'activité courante, ou `null` si le distributeur n'en a aucune.
 *
 * Ordre de décision :
 *   1. celle qu'il a choisie, si elle lui appartient toujours ;
 *   2. sinon la première par position, **les actives d'abord** — une activité
 *      archivée ne doit pas passer devant une vivante.
 */
export async function activiteCourante(userId: string) {
  const prefs = await db.userPreferences.findUnique({
    where: { userId },
    select: { activeCompanyId: true },
  })

  if (prefs?.activeCompanyId) {
    // Le `userId` est DANS le `where` : une préférence qui pointerait vers
    // l'activité de quelqu'un d'autre ne doit rien rendre.
    const choisie = await db.userMlmBusiness.findFirst({
      where: { id: prefs.activeCompanyId, userId },
    })
    if (choisie) return choisie
  }

  return db.userMlmBusiness.findFirst({
    where: { userId },
    orderBy: [{ active: 'desc' }, { position: 'asc' }],
  })
}

/** Le même choix, mais on ne veut que l'identifiant. */
export async function idActiviteCourante(userId: string): Promise<string | null> {
  return (await activiteCourante(userId))?.id ?? null
}
