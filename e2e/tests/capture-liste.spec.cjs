const { test, expect } = require('../fixtures.cjs')
for (const [nom, url] of [['menu-liste','/accueil?menu=1'], ['compte-liste','/compte']]) {
  test(nom, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('main ul li').first()).toBeVisible({ timeout: 20_000 })
    await page.evaluate(() => { document.getAnimations().forEach((a) => { try { a.finish() } catch {} }) })
    await page.screenshot({ path: `${nom}.png`, fullPage: nom === 'menu-liste' })
  })
}
