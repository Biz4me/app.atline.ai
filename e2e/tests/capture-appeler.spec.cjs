// Une capture de l'écran qui prépare un appel, sur un VRAI contact.
// LECTURE SEULE — on évite les fiches « E2E », qui n'ont ni étape ni script.
const { test, expect, suivre } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

test('capture de l’écran d’appel', async ({ page, pageErrors }) => {
  await page.goto('/gens', { waitUntil: 'domcontentloaded' })
  const lignes = page.locator('[data-contact]')
  await expect(lignes.first()).toBeVisible({ timeout: 20_000 })

  /**
   * 🔴 UN CONTACT QUI A UN NUMÉRO, sinon la carte « Appeler » est éteinte et
   * on capture une fiche au lieu de l'écran. Depuis le rattrapage des
   * indicatifs du 18 novembre, 28 contacts sur 44 en ont un — on prend le
   * premier dont le geste est allumé.
   */
  const vrais = lignes.filter({ hasNotText: 'E2E' })
  const combien = await vrais.count()
  let trouve = false
  for (let i = 0; i < Math.min(combien, 8); i++) {
    await vrais.nth(i).click()
    await expect(page).toHaveURL(/\/gens\/[a-z0-9]+$/i, { timeout: 20_000 })
    const carte = page.locator('[data-geste="Appeler"]')
    await expect(carte).toBeVisible({ timeout: 20_000 })
    if (!(await carte.getAttribute('data-eteint'))) {
      await suivre(carte, page, /\/appeler$/)
      trouve = true
      break
    }
    await page.goto('/gens', { waitUntil: 'domcontentloaded' })
    await expect(lignes.first()).toBeVisible({ timeout: 20_000 })
  }
  expect(trouve, 'aucun contact avec un numéro : la capture ne prouverait rien').toBe(true)

  await expect(page.locator('[data-appeler]')).toBeVisible({ timeout: 20_000 })

  // 🔴 Une capture prise PENDANT une animation ment autant qu'une mesure.
  await page.evaluate(() => {
    document.getAnimations().forEach((a) => {
      try {
        a.finish()
      } catch {}
    })
  })

  await page.screenshot({ path: 'capture-appeler.png' })
  await page.screenshot({ path: 'capture-appeler-entiere.png', fullPage: true })

  expect(pageErrors, `exception client : ${pageErrors.join(' · ')}`).toEqual([])
})
