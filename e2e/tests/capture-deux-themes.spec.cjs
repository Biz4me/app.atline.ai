// L'accueil dans les deux themes, cote a cote, pour juger le jumeau.
const { test, expect } = require('../fixtures.cjs')
for (const theme of ['light', 'dark']) {
  test(`accueil ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/accueil', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('navigation', { name: 'Raccourcis' })).toBeVisible({ timeout: 20_000 })
    await page.evaluate((t) => (document.documentElement.dataset.theme = t), theme)
    await page.waitForFunction(() => Promise.all(
      [...document.querySelectorAll('[aria-hidden="true"].fixed > div')]
        .map((e) => getComputedStyle(e).backgroundImage.match(/url\("([^"]+)"\)/))
        .filter(Boolean)
        .map((m) => new Promise((r) => { const i = new Image(); i.onload = () => r(true); i.onerror = () => r(false); i.src = m[1] }))
    ).then((v) => v.every(Boolean)), undefined, { timeout: 20_000 })
    await page.screenshot({ path: `accueil-${theme}.png` })
  })
}
