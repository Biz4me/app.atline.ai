// L'accueil ENTIER, avec un rendez-vous seme pour que les trois familles
// soient visibles en meme temps. Le rendez-vous est retire ensuite.
const { test, expect, poserRdv, retirerRdv } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

test('accueil-complet', async ({ page, seed }) => {
  const { rid } = poserRdv(seed.cid, 26)
  try {
    await page.goto('/accueil', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('[data-tuile="prochain"]')).toBeVisible({ timeout: 20_000 })
    await page.evaluate(() =>
      document.getAnimations().forEach((a) => {
        try { a.finish() } catch {}
      }),
    )
    await page.screenshot({ path: 'accueil-complet.png', fullPage: true })
  } finally {
    retirerRdv(rid)
  }
})
