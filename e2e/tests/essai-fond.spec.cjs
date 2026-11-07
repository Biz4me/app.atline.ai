// Essai d'opacité : on règle dans le navigateur, on ne déploie qu'une fois.
const { test, expect } = require('../fixtures.cjs')

for (const o of ['0.09', '0.14']) {
  test(`fond à ${o}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/accueil', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('navigation', { name: 'Raccourcis' })).toBeVisible({ timeout: 20_000 })
    await page.evaluate((v) => {
      const s = document.querySelector('[aria-hidden="true"].fixed svg')
      s.style.opacity = v
    }, o)
    await page.screenshot({ path: `essai-fond-${o.replace('.', '')}.png` })
  })
}
