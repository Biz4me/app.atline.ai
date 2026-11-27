// L'ÉCOUTE SE POSE-T-ELLE EN SURFACE SUR N'IMPORTE QUELLE PAGE ?
//
//     E2E_BASE=https://v2.atline.ai npx playwright test tests/ecoute-surface.spec.cjs
//
// Étape 2 de la refonte « feuille persistante » (25 novembre 2026). L'écoute
// était une feuille UNIQUEMENT depuis un module ; ailleurs (contacts, accueil)
// c'était une page pleine, sans rien derrière, et « réduire = revenir où
// j'étais » était impossible.
//
// 🔴 CE QU'ON PROUVE, ET QUI NE SE VOIT PAS À L'ŒIL : quand on déplie la
// pastille depuis CONTACTS, la page contacts reste MONTÉE derrière la feuille
// (interception racine), et réduire y revient — pas sur le module, pas sur du
// vide. Le repère est `[data-contact]` : s'il est encore dans le DOM pendant
// que la feuille d'écoute est ouverte, c'est que contacts n'a pas été démonté.
const { test, expect } = require('../fixtures.cjs')
const { lancer, ouvrirEcoute } = require('../son.cjs')

test.use({ viewport: { width: 390, height: 844 } })

test('la pastille déplie l’écoute PAR-DESSUS contacts, et réduire y revient', async ({
  page,
  pageErrors,
}) => {
  // 1. Une session vivante : le son joue, donc la pastille existe (`actif`).
  await ouvrirEcoute(page)
  await lancer(page)

  // 2. On part sur contacts. La session est rétablie du magasin → la pastille
  //    paraît (en pause, c'est voulu après un chargement de page).
  await page.goto('/gens', { waitUntil: 'domcontentloaded' })
  const pastille = page.locator('[data-pastille-vers-lecon]')
  await expect(pastille).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('[data-contact]').first()).toBeVisible({ timeout: 20_000 })

  // 3. Tap sur la pastille → navigation CLIENT vers /ecouter → interceptée à la
  //    racine : l'écoute se pose en feuille, et contacts doit rester derrière.
  await pastille.click()
  await expect(page.locator('[data-feuille-ecoute]')).toBeVisible({ timeout: 20_000 })

  const vu = await page.evaluate(() => ({
    feuilles: document.querySelectorAll('[data-feuille-ecoute]').length,
    contactsDerriere: document.querySelectorAll('[data-contact]').length,
    chemin: location.pathname,
  }))
  console.log(JSON.stringify(vu))
  await page.screenshot({ path: 'ecoute-sur-contacts.png' })

  const griefs = []
  if (vu.feuilles !== 1) griefs.push(`${vu.feuilles} feuille(s) d'écoute au lieu d'une`)
  if (!/\/ecouter$/.test(vu.chemin)) griefs.push(`l'URL est « ${vu.chemin} », pas une écoute`)
  if (vu.contactsDerriere === 0)
    griefs.push("contacts a été démonté : la feuille remplace la page au lieu de s'y poser")
  expect(griefs, `ce qui cloche :\n  · ${griefs.join('\n  · ')}`).toEqual([])

  // 4. Réduire via le chevron (la feuille intercepte son clic → router.back()).
  await page.locator('a[aria-label^="Retour au module"]').click()

  // 5. On revient EXACTEMENT sur contacts, la feuille a disparu, la pastille est là.
  await expect.poll(() => new URL(page.url()).pathname, { timeout: 20_000 }).toBe('/gens')
  await expect(page.locator('[data-feuille-ecoute]')).toHaveCount(0)
  await expect(pastille).toBeVisible({ timeout: 20_000 })

  expect(pageErrors).toEqual([])
})
