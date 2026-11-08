const { test, expect } = require('../fixtures.cjs')
test('capture atlas', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/atlas', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('nav[aria-label="Navigation principale"]')).toBeVisible({ timeout: 20_000 })
  await page.evaluate(() => { document.getAnimations().forEach((a) => { try { a.finish() } catch {} }) })
  await page.screenshot({ path: 'atlas.png' })
})
