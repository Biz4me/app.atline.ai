// Une capture de l'écran qui compose un message, sur un VRAI contact.
// LECTURE SEULE — on évite les fiches « E2E », qui n'ont ni étape ni couleur.
const { test, expect, suivre } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

test('capture de l’écran d’écriture', async ({ page, pageErrors }) => {
  await page.goto('/gens', { waitUntil: 'domcontentloaded' })
  const lignes = page.locator('[data-contact]')
  await expect(lignes.first()).toBeVisible({ timeout: 20_000 })

  /**
   * 🔴 UN CONTACT JOIGNABLE, sinon la carte « Message » est éteinte et on
   * capture une fiche au lieu de l'écran.
   */
  const vrais = lignes.filter({ hasNotText: 'E2E' })
  const combien = await vrais.count()
  let trouve = false
  for (let i = 0; i < Math.min(combien, 8); i++) {
    await vrais.nth(i).click()
    await expect(page).toHaveURL(/\/gens\/[a-z0-9]+$/i, { timeout: 20_000 })
    const carte = page.locator('[data-geste="Message"]')
    await expect(carte).toBeVisible({ timeout: 20_000 })
    if (!(await carte.getAttribute('data-eteint'))) {
      await suivre(carte, page, /\/ecrire$/)
      trouve = true
      break
    }
    await page.goto('/gens', { waitUntil: 'domcontentloaded' })
    await expect(lignes.first()).toBeVisible({ timeout: 20_000 })
  }
  expect(trouve, 'aucun contact joignable : la capture ne prouverait rien').toBe(true)

  // Le cerveau met quelques secondes : c'est un vrai modèle.
  await expect(page.locator('[data-saisie-message]')).toBeVisible({ timeout: 60_000 })

  // 🔴 Une capture prise PENDANT une animation ment autant qu'une mesure.
  await page.evaluate(() => {
    document.getAnimations().forEach((a) => {
      try {
        a.finish()
      } catch {}
    })
  })

  await page.screenshot({ path: 'capture-ecrire.png' })
  await page.screenshot({ path: 'capture-ecrire-entiere.png', fullPage: true })

  expect(pageErrors, `exception client : ${pageErrors.join(' · ')}`).toEqual([])
})
