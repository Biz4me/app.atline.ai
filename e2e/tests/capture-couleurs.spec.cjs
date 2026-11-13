// Les quatre lieux, chacun dans sa couleur, pour l'oeil de Patrice.
const { test, expect } = require('../fixtures.cjs')

const ECRANS = [
  ['couleur-accueil', '/accueil'],
  ['rail-accueil', '/accueil'],
  ['couleur-contacts', '/gens'],
  ['couleur-filtres', '/gens/filtrer?marche=CHAUD'],
  ['couleur-apprendre', '/parcours'],
]

for (const [nom, url] of ECRANS) {
  test(nom, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    // ⚠️ `/gens/filtrer` est un DÉTOUR DE PLEINE PAGE : pas de barre du bas.
    // On attend donc le geste dominant, qui est là sur les quatre écrans.
    await expect(page.locator('main, [data-action]').first()).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 })
    await page.evaluate(() =>
      document.getAnimations().forEach((a) => {
        try {
          a.finish()
        } catch {}
      }),
    )
    // La capture du rail descend jusqu'a lui : il vit sous le pli.
    if (nom === 'rail-accueil') {
      await page.locator('[data-tuile]').first().scrollIntoViewIfNeeded()
      await page.waitForTimeout(250)
    }
    await page.screenshot({ path: `${nom}.png` })
  })
}
