// LA BARRE À CINQ ENTRÉES, ET LA PORTE QU'EST LE MENU.
//
//   E2E_BASE=https://v2.atline.ai E2E_COMME=humanstring@gmail.com \
//     npx playwright test tests/capture-barre.spec.cjs
//
// 🔴 Ce que cette sonde cherche vraiment : que le MENU soit un BOUTON et non
// un lien. Les quatre autres entrées mènent quelque part ; lui ouvre une
// feuille par-dessus. Si quelqu'un le transforme un jour en `<Link>`, la barre
// disparaîtra au moment où on en a le plus besoin, et rien ne le dira.

const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

test('la barre porte cinq entrées, et le Menu ouvre une feuille', async ({ page, pageErrors }) => {
  await page.goto('/gens', { waitUntil: 'domcontentloaded' })

  const barre = page.getByRole('navigation', { name: /Navigation principale/ })
  await expect(barre).toBeVisible({ timeout: 20_000 })

  // Les cinq, dans l'ordre. `allInnerTexts` donne ce que l'œil lit.
  const entrees = (await barre.innerText()).split('\n').map((t) => t.trim()).filter(Boolean)
  expect(entrees).toEqual(['Menu', 'Formation', 'Coach', 'Agenda', 'Mes gens'])

  await page.screenshot({ path: 'capture-barre.png', clip: { x: 0, y: 844 - 110, width: 390, height: 110 } })

  // 🔴 Un bouton, pas un lien : la barre doit rester là quand le menu s'ouvre.
  const menu = barre.getByRole('button', { name: 'Menu' })
  await expect(menu).toBeVisible()
  await menu.click()

  const feuille = page.getByRole('dialog', { name: /Menu/ })
  await expect(feuille).toBeVisible({ timeout: 10_000 })
  await expect(feuille.getByText('Ton compte')).toBeVisible()
  // 🔴 LA BARRE DOIT RESTER ATTEIGNABLE, et `toBeVisible` NE SUFFIT PAS :
  // il vérifie qu'un élément n'est pas masqué par CSS, pas qu'un autre le
  // RECOUVRE. Ma première version affirmait donc que la barre était là alors
  // que la feuille passait devant — c'est la capture d'écran qui l'a dit, pas
  // l'assertion. Un clic à blanc, lui, échoue si quelque chose s'interpose.
  await barre.getByRole('link', { name: 'Agenda' }).click({ trial: true, timeout: 5_000 })

  await page.screenshot({ path: 'capture-menu.png' })

  expect(pageErrors, `exceptions JS : ${pageErrors.join(' | ')}`).toHaveLength(0)
})
