const { test, expect } = require('../fixtures.cjs')
const vues = [
  ['menu-ferme', '/accueil'],
  ['menu-ouvert', '/accueil?menu=1'],
  ['menu-bas', '/accueil?menu=1'],
  ['ailleurs', '/parcours'],
]
for (const [nom, url] of vues) {
  test(nom, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('nav[aria-label="Navigation principale"]')).toBeVisible({ timeout: 20_000 })
    if (nom === 'menu-bas') await page.evaluate(() => window.scrollTo(0, 99999))
    await page.evaluate(() => {
      document.getAnimations().forEach((a) => { try { a.finish() } catch {} })
    })
    await page.screenshot({ path: `${nom}.png` })
  })
}
