// Une capture de la liste des contacts, sur les vraies donnees.
const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

for (const [segment, nom] of [['', 'tous'], ['partenaire', 'partenaires']]) {
  test(`capture de la liste (${nom})`, async ({ page }) => {
    await page.goto(`/gens${segment ? `?qui=${segment}` : ''}`, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('[data-contact]').first()).toBeVisible({ timeout: 20_000 })
    await page.evaluate(() => {
      document.getAnimations().forEach((a) => { try { a.finish() } catch {} })
    })
    await page.screenshot({ path: `capture-liste-${nom}.png` })
  })
}
