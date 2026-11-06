// Une capture de la fiche, sur un VRAI contact. LECTURE SEULE.
//
// ⚠️ On évite le contact jetable : la fixture `seed` en crée un à chaque
// test, et comme la liste trie par dernière modification, il arrive EN TÊTE.
// Une capture prise dessus montrerait une fiche vide et ne prouverait rien.
const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

test('capture de la fiche', async ({ page }) => {
  await page.goto('/gens', { waitUntil: 'domcontentloaded' })
  const lignes = page.locator('[data-contact]')
  await expect(lignes.first()).toBeVisible({ timeout: 20_000 })

  const vrai = lignes.filter({ hasNotText: 'E2E' }).first()
  await expect(vrai).toBeVisible()
  await vrai.click()
  await expect(page).toHaveURL(/\/gens\/[a-z0-9]+$/i, { timeout: 20_000 })
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  // 🔴 Une capture prise PENDANT une animation ment autant qu'une mesure.
  // On les termine toutes ; `finish()` lève sur une animation infinie, d'où
  // le try individuel.
  await page.evaluate(() => {
    document.getAnimations().forEach((a) => { try { a.finish() } catch {} })
  })
  // ⚠️ Sur une capture PLEINE PAGE, la barre du bas — qui est `fixed` — se
  // dessine à sa position d'écran, donc au MILIEU de l'image, et recouvre une
  // bande. Ce n'est pas un défaut de l'app : on le vérifie par l'arbre, pas
  // par l'œil.
  await expect(page.locator('[data-champ="profession"]')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Ce que je sais d’elle' })).toBeVisible()

  await page.screenshot({ path: 'capture-fiche.png' })
  await page.screenshot({ path: 'capture-fiche-entiere.png', fullPage: true })
})
