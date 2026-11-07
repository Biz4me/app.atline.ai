// LA PREMIERE CASE FAIT LE PLUS UTILE SELON L'ENDROIT.
//
//   E2E_BASE=https://v2.atline.ai E2E_COMME=humanstring@gmail.com \
//     npx playwright test tests/menu.spec.cjs
//
// 🔴 Ce que ca protege : que la case ne mente JAMAIS sur ce qu'elle fait. Son
// interet tient entierement au fait que l'icone ET le mot changent avec
// l'endroit — si l'un des deux restait fige, on retomberait sur « un geste,
// deux sens », exactement la faute qu'on a evitee.
const { test, expect, suivre } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

const PREMIERE = 'nav[aria-label="Navigation principale"] a:first-child'

test('sur l’accueil elle dit « Menu », ailleurs « Accueil »', async ({ page, pageErrors }) => {
  await page.goto('/accueil', { waitUntil: 'domcontentloaded' })
  await expect(page.locator(PREMIERE)).toHaveText(/Menu/, { timeout: 20_000 })

  await page.goto('/parcours', { waitUntil: 'domcontentloaded' })
  await expect(page.locator(PREMIERE)).toHaveText(/Accueil/, { timeout: 20_000 })
  // Et elle ramene vraiment chez soi.
  expect(await page.locator(PREMIERE).getAttribute('href')).toBe('/accueil')

  expect(pageErrors).toEqual([])
})

test('elle ouvre le menu, le referme, et la barre reste utilisable', async ({
  page,
  pageErrors,
}) => {
  await page.goto('/accueil', { waitUntil: 'domcontentloaded' })
  const case1 = page.locator(PREMIERE)
  await expect(case1).toBeVisible({ timeout: 20_000 })
  expect(await case1.getAttribute('aria-expanded'), 'fermé au départ').toBe('false')

  await suivre(case1, page, /\?menu=1/)
  await expect(page.getByRole('heading', { name: 'Tout le reste' })).toBeVisible({
    timeout: 20_000,
  })
  expect(await page.locator(PREMIERE).getAttribute('aria-expanded'), 'ouvert').toBe('true')

  // 🔴 LA BARRE RESTE, ET SES AUTRES ENTREES AUSSI : c'est la regle « on n'est
  // jamais piege ». Un menu plein ecran qui enfermerait serait pire que pas
  // de menu.
  const cases = page.locator('nav[aria-label="Navigation principale"] a')
  await expect(cases).toHaveCount(5)
  await expect(cases.nth(4)).toHaveAttribute('href', '/gens')

  // La fleche referme.
  await suivre(page.locator(PREMIERE), page, /\/accueil$/)
  await expect(page.getByRole('navigation', { name: 'Raccourcis' })).toBeVisible({
    timeout: 20_000,
  })

  expect(pageErrors).toEqual([])
})

test('le menu annonce ce qui manque sans promettre de porte', async ({ page }) => {
  await page.goto('/accueil?menu=1', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Tout le reste' })).toBeVisible({
    timeout: 20_000,
  })

  // 🔴 AUCUNE ENTREE « bientot » N'EST UN LIEN. Rule ① : aucun cul-de-sac, et
  // une fleche est une promesse.
  const faux = await page.evaluate(() =>
    [...document.querySelectorAll('main a')].filter((a) =>
      a.textContent.includes('bientôt'),
    ).length,
  )
  expect(faux, 'une entrée non construite est cliquable').toBe(0)

  const combien = await page.getByText('bientôt', { exact: true }).count()
  console.log(`  ${combien} entrées annoncées « bientôt »`)
  expect(combien).toBeGreaterThan(8)
})
