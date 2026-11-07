// Capture de l'accueil, pour regarder la bande de raccourcis à l'œil.
const { test, expect } = require('../fixtures.cjs')

test('capture de l’accueil', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/accueil', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('navigation', { name: 'Raccourcis' })).toBeVisible({ timeout: 20_000 })
  await page.evaluate(() => {
    document.getAnimations().forEach((a) => { try { a.finish() } catch {} })
  })
  const n = await page.locator('nav[aria-label="Raccourcis"]').evaluate((e) => e.getBoundingClientRect().height)
  console.log(`  hauteur de la bande : ${Math.round(n)} px`)
  console.log(`  texte : ${(await page.locator('nav[aria-label="Raccourcis"]').innerText()).split('\n').join(' | ')}`)
  await page.screenshot({ path: 'capture-accueil.png' })
})
