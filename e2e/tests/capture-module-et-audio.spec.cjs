// REGARDER CE QUE LES DEUX ÉCRANS DONNENT VRAIMENT.
//
//     E2E_BASE=https://v2.atline.ai npx playwright test tests/capture-module-et-audio.spec.cjs
//
// Deux captures, pour deux raisons différentes du 20 novembre 2026 :
//   · la couverture d'un module, pour voir les chevrons de feuilletage posés
//     sur le reflet flouté — un gris sur une photo floue est le genre de chose
//     qu'aucun contrôle de style ne tranche ;
//   · la page d'écoute, parce que Patrice la trouve moins claire et demande une
//     maquette AVANT que je touche au code. On ne redessine pas un écran de
//     mémoire.
//
// ⚠️ LES ANIMATIONS SONT ARRÊTÉES AVANT DE DÉCLENCHER. Une mesure prise sur une
// cible en mouvement ment, et une capture est une mesure.
const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

// 🔴 ET ON ATTEND QUE LES IMAGES SOIENT DÉCODÉES. Première version : le test
// vérifiait que le `<img>` est VISIBLE, ce qui est vrai dès que la boîte
// existe. La capture a donc montré une couverture NOIRE et j'ai cru l'image
// cassée — je suis allé la télécharger pour découvrir qu'elle allait très
// bien. « L'élément est là » et « l'image est peinte » sont deux faits
// différents, et c'est le second qu'une capture est censée montrer.
const figer = async (page) => {
  await page.evaluate(async () => {
    /**
     * 🔴 ON N'ATTEND QUE CE QUI EST DEMANDÉ, ET JAMAIS PLUS DE 3 SECONDES.
     *
     * Cette ligne attendait `decode()` sur TOUTES les images de la page. Le
     * 21 novembre 2026, le carrousel en a apporté onze, dont neuf en
     * chargement PARESSEUX : leur `decode()` ne se résout jamais, puisqu'elles
     * n'ont même pas commencé à être téléchargées. La capture expirait au
     * bout de soixante secondes, et le rapport disait « page.evaluate: Test
     * timeout » — rien sur la vraie cause.
     *
     * 🧭 Une attente sans borne est une panne qui attend son heure. La
     * course contre un minuteur dit la même chose et ne peut pas pendre.
     */
    const borne = (p) => Promise.race([p, new Promise((r) => setTimeout(r, 3000))])
    await Promise.all(
      [...document.images].map((i) =>
        i.complete && i.naturalWidth > 0 ? null : borne(i.decode().catch(() => null)),
      ),
    )
    document.getAnimations().forEach((a) => {
      try {
        a.finish()
      } catch {}
    })
  })
}

/**
 * ── 🔴 CES DEUX TESTS MESURAIENT LES CHEVRONS, SUPPRIMÉS LE 21 NOV. 2026 ───
 *
 * Ils vérifiaient que la couverture d'un module porte un chevron de chaque
 * côté, et qu'aux bouts de la série il n'y en ait qu'un. Patrice, capture
 * d'un lecteur de musique à l'appui : *« supprimer les chevrons droite et
 * gauche et adopter le principe de la capture »*.
 *
 * 🧭 CE QU'ILS PROTÉGEAIENT SURVIT, SOUS UNE AUTRE FORME. Les chevrons
 * disaient « il y a un voisin par là » ; c'est désormais **le débord de la
 * couverture voisine** qui le dit — et aux bouts de la série, il n'y a
 * simplement rien à déborder de ce côté-là. On mesure donc le débord.
 */
test('les couvertures voisines débordent, et annoncent le geste', async ({ page, pageErrors }) => {
  await page.goto('/parcours', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('a[data-module="2"]')).toBeVisible({ timeout: 20_000 })
  const href = await page.locator('a[data-module="2"]').getAttribute('href')
  await page.goto(href, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-carrousel-modules]')).toBeVisible({ timeout: 20_000 })
  await page.waitForTimeout(800)

  const vu = await page.evaluate(() => {
    const r = document.querySelector('[data-carrousel-modules]')
    const courante = r.querySelector('[aria-current]')?.closest('li')
    const b = courante?.getBoundingClientRect()
    const voisines = [...r.children].filter((c) => c !== courante).map((c) => {
      const x = c.getBoundingClientRect()
      // Ce qui dépasse DANS l'écran, de l'un ou l'autre côté.
      return Math.round(Math.max(0, Math.min(x.right, innerWidth) - Math.max(x.left, 0)))
    })
    return {
      diapos: r.children.length,
      courante: b ? { centre: Math.round(b.left + b.width / 2), large: Math.round(b.width) } : null,
      debordVisible: voisines.filter((v) => v > 10).length,
      milieu: Math.round(innerWidth / 2),
      chevrons: document.querySelectorAll('[data-feuillet-module]').length,
    }
  })
  console.log(JSON.stringify(vu))

  const griefs = []
  if (vu.diapos < 2) griefs.push(`${vu.diapos} diapositive(s) : rien à feuilleter`)
  if (!vu.courante) griefs.push('aucune couverture marquée courante')
  else if (Math.abs(vu.courante.centre - vu.milieu) > 2)
    griefs.push(`la courante est centrée à ${vu.courante.centre} au lieu de ${vu.milieu}`)
  /**
   * 🔴 LE DÉBORD EST L'AFFORDANCE, PAS UNE DÉCORATION. Un glissement est
   * invisible : rien ne dit qu'il existe, sauf la voisine à moitié sortie.
   * Sans ce contrôle, on pourrait centrer les couvertures une à une et
   * supprimer le seul indice que le geste est possible.
   */
  if (vu.debordVisible < 2)
    griefs.push(`${vu.debordVisible} voisine(s) visible(s) : le geste ne s’annonce plus`)
  if (vu.chevrons) griefs.push(`${vu.chevrons} chevron(s) de feuilletage sont revenus`)

  await figer(page)
  await page.screenshot({ path: 'module-carrousel.png' })
  expect(griefs, 'ce qui cloche :' + String.fromCharCode(10) + '  · ' + griefs.join(String.fromCharCode(10) + '  · ')).toEqual([])
  expect(pageErrors).toEqual([])
})


test('la page d’écoute, telle qu’elle est aujourd’hui', async ({ page, pageErrors }) => {
  await page.goto('/parcours', { waitUntil: 'domcontentloaded' })
  const href = await page.locator('a[data-module="1"]').getAttribute('href')
  await page.goto(href, { waitUntil: 'domcontentloaded' })
  const ecouter = page.getByRole('link', { name: 'Écouter' })
  await expect(ecouter).toBeVisible({ timeout: 20_000 })
  await ecouter.click()
  await expect(page.locator('[data-carrousel-modules] [aria-current] img')).toBeVisible({ timeout: 20_000 })
  await figer(page)
  await page.screenshot({ path: 'audio-actuel.png' })
  expect(pageErrors).toEqual([])
})
