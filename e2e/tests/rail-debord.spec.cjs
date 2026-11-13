// LE RAIL DÉBORDE, ET LA TUILE SUIVANTE EST VISIBLEMENT COUPÉE.
//
//   E2E_BASE=https://v2.atline.ai E2E_COMME=humanstring@gmail.com \
//     npx playwright test tests/rail-debord.spec.cjs
//
// ── 🔴 LA PANNE QUE CETTE SONDE EXISTE POUR ATTRAPER ──────────────────────
//
// Un rail dont rien ne dépasse **s'affiche parfaitement** : trois tuiles
// alignées, bordures nettes, aucune erreur. Il a simplement cessé d'être un
// rail — plus personne ne fait glisser le doigt, et la troisième tuile n'est
// jamais lue. C'est une panne de mise en page entièrement silencieuse.
//
// Elle survient au premier réglage de `LARGEUR_TUILE`, d'un changement de
// gouttière, ou le jour où une tuile de plus arrive. Rien dans le code ne la
// signale : c'est une arithmétique entre quatre fichiers.
//
// 🧭 La sonde ne vérifie donc pas que le rail EXISTE — ça, un `toBeVisible`
// le dirait et ne prouverait rien. Elle vérifie qu'il **dépasse**, et qu'une
// tuile est **à cheval sur le bord** : commencée dans l'écran, finie dehors.

const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

/** La règle ④ : assez pour qu'on la voie commencer, trop peu pour la croire entière. */
const DEBORD_MINI = 24

test('la troisième tuile est à cheval sur le bord de l’écran', async ({ page, pageErrors }) => {
  await page.goto('/accueil', { waitUntil: 'domcontentloaded' })

  const tuiles = page.locator('[data-tuile]')
  // ⚠️ CONTRÔLE POSITIF. Sans lui, un rail vide — ou un sélecteur devenu faux —
  // ferait passer tout le reste de ce test en ne mesurant rien.
  await expect(tuiles.first()).toBeVisible({ timeout: 20_000 })
  const n = await tuiles.count()
  expect(n, 'un rail de moins de trois tuiles ne peut rien couper').toBeGreaterThanOrEqual(3)

  const largeur = page.viewportSize().width

  const boites = []
  for (let i = 0; i < n; i++) boites.push(await tuiles.nth(i).boundingBox())

  // ── CE QUI EST ENTIÈREMENT DANS L'ÉCRAN ──
  const entieres = boites.filter((b) => b.x >= 0 && b.x + b.width <= largeur).length
  expect(entieres, 'au moins deux tuiles doivent être entièrement lisibles').toBeGreaterThanOrEqual(2)
  expect(entieres, 'si tout tient dans l’écran, ce n’est plus un rail').toBeLessThan(n)

  // ── CELLE QUI EST À CHEVAL : commencée dedans, finie dehors ──
  const acheval = boites.find((b) => b.x < largeur && b.x + b.width > largeur)
  expect(acheval, 'aucune tuile ne chevauche le bord : rien ne dit qu’il y en a d’autres').toBeTruthy()
  const visible = largeur - acheval.x
  expect(
    visible,
    `seulement ${Math.round(visible)} px de la tuile suivante sont visibles : le doigt ne partira pas`,
  ).toBeGreaterThanOrEqual(DEBORD_MINI)
  expect(visible, 'la tuile suivante est presque entière : elle ne se lit plus comme une suite').toBeLessThan(
    acheval.width - 8,
  )

  expect(pageErrors).toEqual([])
})

test('le rail glisse vraiment, et la page ne glisse pas avec lui', async ({ page, pageErrors }) => {
  await page.goto('/accueil', { waitUntil: 'domcontentloaded' })
  const rail = page.locator('ul:has([data-tuile])').first()
  await expect(rail).toBeVisible({ timeout: 20_000 })

  /**
   * 🔴 LE DÉFAUT CLASSIQUE DU RAIL : il emporte la PAGE avec lui. Un
   * `-mx-4` mal compensé, et tout l'écran se décale vers la droite — on
   * s'en aperçoit par un ascenseur horizontal en bas de page, que personne
   * ne regarde sur un téléphone.
   */
  const pageDeborde = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  )
  expect(pageDeborde, 'le rail fait déborder la PAGE entière').toBe(false)

  const avant = await rail.evaluate((el) => el.scrollLeft)
  await rail.evaluate((el) => el.scrollBy({ left: 200, behavior: 'instant' }))
  const apres = await rail.evaluate((el) => el.scrollLeft)
  expect(apres, 'le rail ne défile pas : `overflow-x` est perdu').toBeGreaterThan(avant)

  expect(pageErrors).toEqual([])
})
