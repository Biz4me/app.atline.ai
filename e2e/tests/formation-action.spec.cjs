// FORMATION : UN SEUL GESTE, ET IL N'ÉCRASE RIEN.
//
// 🔴 Trois choses qu'aucune assertion de présence ne verrait :
//
//   1. qu'il n'y a QU'UN déclencheur. La carte de conseil portait un « Ouvrir
//      le module N » qui faisait exactement ce que fait le bouton du bas ;
//   2. que le dernier module de la liste reste ATTEIGNABLE sous le bouton
//      fixe — `toBeVisible` ignore les recouvrements, seul un clic à blanc
//      les détecte ;
//   3. que le bouton MÈNE à une leçon, pas à une page morte.

const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

test('Formation : un geste unique, atteignable, qui mène vraiment quelque part', async ({
  page,
  pageErrors,
}) => {
  await page.goto('/parcours', { waitUntil: 'domcontentloaded' })

  const geste = page.getByRole('link', { name: /^(Leçon suivante|Faire le quiz)$/ })
  await expect(geste).toBeVisible({ timeout: 20_000 })

  // ── 1. UN SEUL déclencheur ─────────────────────────────────────────────
  await expect(geste).toHaveCount(1)
  await expect(page.getByRole('link', { name: /Ouvrir le module/ })).toHaveCount(0)

  // ── 2. ce qui est dessous reste atteignable ────────────────────────────
  await page.evaluate(() =>
    document.getAnimations().forEach((a) => {
      try {
        a.finish()
      } catch {}
    }),
  )
  const modules = page.locator('main a[href^="/parcours/"]')
  await expect(modules.first()).toBeVisible()
  await modules.last().scrollIntoViewIfNeeded()
  await modules.last().click({ trial: true, timeout: 5_000 })

  await page.screenshot({ path: 'capture-formation.png', animations: 'disabled' })

  // ── 3. le geste mène à une leçon ───────────────────────────────────────
  const ou = await geste.getAttribute('href')
  expect(ou, `le geste pointe sur ${ou}`).toMatch(/^\/parcours\/[^/]+\/[^/]+$/)
  await geste.click()
  await expect(page).toHaveURL(new RegExp(`${ou.replace(/[/]/g, '\/')}$`), { timeout: 20_000 })

  expect(pageErrors, `exceptions JS : ${pageErrors.join(' | ')}`).toHaveLength(0)
})
