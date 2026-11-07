// Les trois pistes de décor, dans les deux thèmes, sur le VRAI écran.
const { test, expect } = require('../fixtures.cjs')

for (const piste of [1, 2, 3]) {
  for (const theme of ['dark', 'light']) {
    test(`piste ${piste} — ${theme}`, async ({ page, pageErrors }) => {
      await page.setViewportSize({ width: 390, height: 844 })
      await page.goto(`/accueil?fond=${piste}`, { waitUntil: 'domcontentloaded' })
      await expect(page.getByRole('navigation', { name: 'Raccourcis' })).toBeVisible({ timeout: 20_000 })
      await page.evaluate((t) => { document.documentElement.dataset.theme = t }, theme)
      // Le masque est une image : on attend qu'elle soit VRAIMENT chargée,
      // sinon la capture montre un aplat de couleur pleine page.
      await page.waitForFunction(
        (p) => fetch(`/fonds/piste-${p}.webp`).then((r) => r.ok),
        piste,
        { timeout: 20_000 },
      )
      await page.evaluate(() => {
        document.getAnimations().forEach((a) => { try { a.finish() } catch {} })
      })
      await page.screenshot({ path: `piste-${piste}-${theme}.png` })
      expect(pageErrors).toEqual([])
    })
  }
}
