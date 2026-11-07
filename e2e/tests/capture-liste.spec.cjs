// Captures de la liste aux deux largeurs qui comptent : la plus etroite
// (ou les phrases rognent) et la nominale.
const { test, expect } = require('../fixtures.cjs')

for (const l of [320, 390]) {
  test(`capture de la liste (${l} px)`, async ({ page }) => {
    await page.setViewportSize({ width: l, height: 844 })
    await page.goto('/gens', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('[data-contact]').first()).toBeVisible({ timeout: 20_000 })
    await page.evaluate(() => {
      document.getAnimations().forEach((a) => { try { a.finish() } catch {} })
    })
    await page.screenshot({ path: `capture-liste-${l}.png` })
  })
}
