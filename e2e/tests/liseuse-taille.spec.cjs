// Les réglages de la liseuse, mesurés plutôt que regardés.
//     E2E_BASE=https://v2.atline.ai npx playwright test tests/liseuse-taille.spec.cjs
//
// 🔴 POURQUOI LA PREMIÈRE VERSION DE CETTE SONDE A MENTI, SANS ÉCHOUER.
// Elle touchait « A+ » et mesurait le texte : vert. Pendant ce temps Patrice
// tirait la JAUGE — qui avait l'air d'un curseur, et n'était qu'un témoin —
// et rien ne bougeait. Une sonde qui vise le bon bouton ne dit rien de celui
// que la personne croit être un bouton. On pilote donc le curseur lui-même.
const { test, expect, toucher } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

async function ouvrirUneLecon(page) {
  await page.goto('/parcours', { waitUntil: 'domcontentloaded' })
  const liens = await page.locator('a[href^="/parcours/"]').evaluateAll((a) =>
    a.map((x) => x.getAttribute('href')),
  )
  const versModule = liens.find((h) => /^\/parcours\/[a-z0-9]{10,}$/i.test(h ?? ''))
  expect(versModule, 'aucun module publié').toBeTruthy()
  await page.goto(versModule, { waitUntil: 'domcontentloaded' })
  const lire = page.getByRole('link', { name: 'Lire' })
  await lire.waitFor({ state: 'visible', timeout: 20_000 })
  await lire.click()
  await expect(page).toHaveURL(/\/parcours\/[a-z0-9]+\/[a-z0-9]+$/i, { timeout: 20_000 })
}

test('le curseur agrandit vraiment le corps de la leçon', async ({ page, pageErrors }) => {
  await ouvrirUneLecon(page)

  const corps = page.locator('article p').first()
  await expect(corps).toBeVisible({ timeout: 20_000 })
  const mesurer = () => corps.evaluate((n) => getComputedStyle(n).fontSize)
  const avant = await mesurer()

  await toucher(
    page.locator('[data-options-lecture]'),
    page.locator('[data-options-lecture][aria-expanded="true"]'),
  )

  /**
   * 🔴 ON PILOTE LE CURSEUR AU CLAVIER, et pas en posant sa valeur. `fill()`
   * sur un `range` écrit la valeur dans le DOM ; une flèche produit le VRAI
   * événement d'une personne qui le déplace, et c'est lui que React écoute.
   */
  const curseur = page.locator('input.curseur-taille')
  await expect(curseur, 'le curseur de taille n’existe pas').toBeVisible({ timeout: 10_000 })
  await curseur.focus()
  await page.keyboard.press('ArrowRight')

  await expect
    .poll(mesurer, { timeout: 5000, message: `la taille n'a pas bougé (${avant})` })
    .not.toBe(avant)
  const apres = await mesurer()
  expect(parseFloat(apres), `${avant} → ${apres}`).toBeGreaterThan(parseFloat(avant))

  expect(pageErrors, `exception client : ${pageErrors.join(' · ')}`).toEqual([])
})

test('les quatre papiers sont là, et le choix repeint la page', async ({ page, pageErrors }) => {
  await ouvrirUneLecon(page)
  await toucher(
    page.locator('[data-options-lecture]'),
    page.locator('[data-options-lecture][aria-expanded="true"]'),
  )

  // Les quatre pastilles de la capture 553, nommées pour qui ne les voit pas.
  for (const nom of ['Blanc', 'Sépia', 'Vert pâle', 'Noir']) {
    await expect(page.getByRole('button', { name: nom })).toBeVisible({ timeout: 10_000 })
  }

  await page.getByRole('button', { name: 'Sépia' }).click()

  /**
   * 🔴 ON MESURE LE FOND CALCULÉ, pas la présence de l'attribut. Un
   * `data-livre` posé sur un élément dont la règle CSS n'existerait pas
   * laisserait la page identique — et l'attribut, lui, serait bien là.
   *
   * ⚠️ ET ON LE MESURE SUR LA COUCHE, plus sur la boîte. Depuis le 20 novembre
   * 2026 le papier est peint par un calque `fixed inset-0` SOUS tout le reste,
   * pour qu'il aille d'un bord à l'autre pendant que l'en-tête et la barre
   * gardent, eux, le thème de l'app. La boîte `[data-livre]` ne porte plus que
   * les jetons et l'encre — son fond est transparent, et cette sonde lisait
   * donc `rgba(0, 0, 0, 0)`.
   */
  await expect
    .poll(
      () =>
        page
          .locator('[data-livre="sepia"] > [data-papier]')
          .evaluate((n) => getComputedStyle(n).backgroundColor),
      { timeout: 5000 },
    )
    // #F3E0BE — la valeur relevée à la pipette par Patrice le 19 novembre.
    .toBe('rgb(243, 224, 190)')

  expect(pageErrors, `exception client : ${pageErrors.join(' · ')}`).toEqual([])
})

test('le chrome s’efface quand on descend, et revient au toucher', async ({ page, pageErrors }) => {
  await ouvrirUneLecon(page)
  const coquille = page.locator('[data-coquille]')
  await expect(coquille).toHaveAttribute('data-immersif', /^$/, { timeout: 20_000 }).catch(() => {})
  expect(await coquille.getAttribute('data-immersif'), 'le chrome est caché dès l’arrivée').toBeNull()

  await page.mouse.wheel(0, 400)
  await expect
    .poll(() => coquille.getAttribute('data-immersif'), {
      timeout: 5000,
      message: 'le chrome ne s’efface pas quand on descend',
    })
    .toBe('1')

  // ⚠️ Un paragraphe, jamais un lien : on veut prouver le rappel, pas
  // déclencher une navigation au passage.
  await page.locator('article p').first().click()
  await expect
    .poll(() => coquille.getAttribute('data-immersif'), {
      timeout: 5000,
      message: 'le toucher ne ramène pas le chrome',
    })
    .toBeNull()

  expect(pageErrors, `exception client : ${pageErrors.join(' · ')}`).toEqual([])
})
