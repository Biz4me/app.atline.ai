// L'ECRAN DES COMPETENCES — et surtout : AUCUNE RANGEE N'EST UN CUL-DE-SAC.
//
// 🔴 13 competences, 11 enseignees par un module publie, 13 avec un exercice.
// Deux n'ont donc qu'une porte. Une rangee qui n'en aurait aucune serait un
// cul-de-sac — regle ① de la fluidite — et rien a l'ecran ne le dirait.
const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

test('chaque compétence porte au moins une porte, et elles mènent quelque part', async ({
  page,
  pageErrors,
}) => {
  await page.goto('/parcours/competences', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('main ul li').first()).toBeVisible({ timeout: 20_000 })

  const rangees = await page.locator('main ul li').evaluateAll((n) =>
    n.map((li) => ({
      nom: li.querySelector('h2')?.textContent?.trim(),
      portes: [...li.querySelectorAll('a')].map((a) => a.getAttribute('href')),
    })),
  )
  console.log(`  ${rangees.length} compétences · portes : ${rangees.map((r) => r.portes.length).join('')}`)
  expect(rangees.length, 'le référentiel compte 13 compétences').toBe(13)
  for (const r of rangees) {
    expect(r.portes.length, `« ${r.nom} » n'a aucune porte`).toBeGreaterThan(0)
    for (const h of r.portes) expect(h, `« ${r.nom} » a une porte vide`).toBeTruthy()
  }
  expect(pageErrors).toEqual([])
})

test('l’accueil mène ici, et ne refait pas la liste', async ({ page, pageErrors }) => {
  /**
   * 🔴 « Où tu en es » ouvrait une feuille qui listait les treize. Deux
   * endroits pour la même liste, c'est la faute qu'on poursuit depuis deux
   * jours — et elle serait née le jour même de la création de cet écran.
   */
  await page.goto('/accueil', { waitUntil: 'domcontentloaded' })
  const carte = page.getByRole('link', { name: /Où tu en es/ })
  await expect(carte).toBeVisible({ timeout: 20_000 })
  expect(await carte.getAttribute('href')).toBe('/parcours/competences')

  // Et aucune liste de compétences sur l'accueil lui-même.
  const listes = await page.locator('main ul li h2').count()
  expect(listes, 'l’accueil refait la liste des compétences').toBe(0)
  expect(pageErrors).toEqual([])
})

test('capture', async ({ page }) => {
  await page.goto('/parcours/competences', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('main ul li').first()).toBeVisible({ timeout: 20_000 })
  await page.evaluate(() => { document.getAnimations().forEach((a) => { try { a.finish() } catch {} }) })
  await page.screenshot({ path: 'competences.png', fullPage: true })
})
