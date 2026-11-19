// LA LISEUSE : REMONTER, SE REPÉRER, REVENIR OÙ L'ON ÉTAIT.
//
//     E2E_BASE=https://v2.atline.ai npx playwright test tests/liseuse-reprise.spec.cjs
//
// Trois demandes de Patrice les 19 et 20 novembre 2026, et aucune ne se voit
// dans un build : *« le texte doit démarrer le plus haut possible quand la
// topbar a disparu »*, *« il manque l'ascenseur sur la droite »*, *« si je
// quitte la leçon avant la fin, je reviens là où je me suis arrêté »*.
const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

async function ouvrirUneLecon(page) {
  await page.goto('/parcours', { waitUntil: 'domcontentloaded' })
  const vers = await page.locator('[data-module="1"]').getAttribute('href')
  await page.goto(vers, { waitUntil: 'domcontentloaded' })
  const lire = page.getByRole('link', { name: 'Lire' })
  await expect(lire).toBeVisible({ timeout: 20_000 })
  await lire.click()
  await page.locator('[data-rang]').waitFor({ state: 'visible', timeout: 20_000 })
  return page.url()
}

test('en pleine page, le texte récupère la place de l’en-tête', async ({ page }) => {
  await ouvrirUneLecon(page)

  const avant = await page.evaluate(() => {
    const t = document.querySelector('[data-rang]').getBoundingClientRect().top
    return { rang: Math.round(t + window.scrollY) }
  })

  // On descend assez pour déclencher le mode immersif, puis on remonte en
  // haut : l'en-tête est caché, et le texte doit avoir pris sa place.
  await page.evaluate(() => window.scrollTo({ top: 600, behavior: 'instant' }))
  await page.waitForTimeout(500)
  await expect(page.locator('[data-coquille][data-immersif="1"]')).toHaveCount(1, { timeout: 5000 })

  const apres = await page.evaluate(() => {
    const c = document.querySelector('[data-coquille]')
    const h = c.querySelector('header')
    return {
      retrait: getComputedStyle(c).getPropertyValue('--retrait-entete').trim(),
      margeEntete: getComputedStyle(h).marginBottom,
      rang: Math.round(
        document.querySelector('[data-rang]').getBoundingClientRect().top + window.scrollY,
      ),
    }
  })
  console.log(`  retrait ${apres.retrait} · marge ${apres.margeEntete} · rang ${avant.rang} → ${apres.rang}`)

  /**
   * 🔴 ON MESURE LE DÉPLACEMENT DU TEXTE, pas la présence de la variable. Un
   * `--retrait-entete` posé sans règle qui le consomme laisserait la page
   * identique — et la variable, elle, serait bien là. C'est exactement la
   * faute qu'une autre sonde de ce dossier décrit pour `data-livre`.
   */
  expect(
    apres.rang,
    'le texte doit remonter de la hauteur de l’en-tête',
  ).toBeLessThan(avant.rang - 20)
})

test('l’ascenseur paraît pendant qu’on fait glisser, et s’efface au repos', async ({ page }) => {
  await ouvrirUneLecon(page)

  const opacite = () =>
    page.locator('[data-ascenseur]').evaluate((n) => Number(getComputedStyle(n).opacity))

  // ⚠️ `inset-y` et non `inset-x` : c'est un ascenseur, pas une jauge. Une
  // sonde qui ne vérifierait que l'opacité laisserait passer un retour au
  // trait horizontal du haut.
  const forme = await page
    .locator('[data-ascenseur]')
    .evaluate((n) => { const r = n.getBoundingClientRect(); return { l: Math.round(r.width), h: Math.round(r.height) } })
  console.log(`  ascenseur ${forme.l} × ${forme.h}`)
  expect(forme.h, 'il doit être plus haut que large').toBeGreaterThan(forme.l * 10)

  await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'instant' }))
  await expect.poll(opacite, { timeout: 3000 }).toBeGreaterThan(0.5)

  // Au repos, il s'efface — 900 ms, plus la transition.
  await expect.poll(opacite, { timeout: 5000 }).toBeLessThan(0.1)
})

test('on rouvre la leçon là où on l’a quittée', async ({ page }) => {
  const adresse = await ouvrirUneLecon(page)

  await page.evaluate(() => window.scrollTo({ top: 900, behavior: 'instant' }))
  await page.waitForTimeout(600)

  await page.goto(adresse, { waitUntil: 'domcontentloaded' })
  await page.locator('[data-rang]').waitFor({ state: 'visible', timeout: 20_000 })

  /**
   * ⚠️ ON ATTEND LE REPLACEMENT : il se fait après la peinture, parce
   * qu'avant, la page n'a pas encore sa hauteur et le navigateur ramène le
   * défilement à zéro sans rien dire.
   */
  await expect
    .poll(() => page.evaluate(() => Math.round(window.scrollY)), { timeout: 10_000 })
    .toBeGreaterThan(700)

  // 🔴 ET PAS PLUS LOIN QU'OÙ ON ÉTAIT : on remonte de quoi relire une ou deux
  // lignes, comme l'audio recule de cinq secondes.
  expect(await page.evaluate(() => Math.round(window.scrollY))).toBeLessThan(900)
})
