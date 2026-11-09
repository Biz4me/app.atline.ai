// FORMATION : UN LIEU, TROIS PORTES — ET QUATRE ENTREES DANS LA BARRE.
const { test, expect } = require('../fixtures.cjs')
test.use({ viewport: { width: 390, height: 844 } })

test('plus aucune entrée « Simulation » dans la barre', async ({ page, pageErrors }) => {
  /**
   * ⚠️ CETTE SONDE A COMPTÉ 4 PENDANT UNE JOURNÉE, et c'était juste : la case
   * libérée par le simulateur est restée vide tant que le fil d'Atlas n'avait
   * pas d'adresse. Elle en compte 5 depuis. 🧭 Ce qu'elle surveille n'est pas
   * le nombre — il bougera encore — mais le fait que **le simulateur ne
   * revienne pas** dans la barre : il se lance depuis un contexte.
   */
  await page.goto('/parcours', { waitUntil: 'domcontentloaded' })
  const cases = page.locator('nav[aria-label="Navigation principale"] a')
  // 🔴 QUATRE, PLUS CINQ : l'agenda est monté en haut à droite le 10 novembre
  // 2026. Il reste un LIEU — titre centré, icône, teinte, sous-pages — il n'a
  // perdu que sa case.
  await expect(cases).toHaveCount(4, { timeout: 20_000 })
  const mots = await cases.evaluateAll((n) => n.map((e) => e.textContent.trim()))
  console.log(`  barre : ${mots.join(' · ')}`)
  expect(mots.join(' ')).not.toMatch(/Simulation/)
  expect(pageErrors).toEqual([])
})

test('les trois portes mènent quelque part, et Formation s’allume aussi en simulation', async ({
  page,
}) => {
  await page.goto('/parcours', { waitUntil: 'domcontentloaded' })
  const portes = await page.locator('main a[href^="/parcours/"], main a[href^="/coach"]').evaluateAll((n) =>
    n.map((e) => e.getAttribute('href')),
  )
  console.log(`  portes : ${portes.join(' ')}`)
  expect(portes).toEqual(['/parcours/cours', '/parcours/competences', '/coach/repeter'])

  // 🔴 Le simulateur vit sous /coach/repeter mais appartient a Formation :
  // sans `autres` dans destinations.ts, aucune entree ne s'allumerait et
  // l'ecran perdrait sa couleur de lieu — on y serait sans savoir ou.
  await page.goto('/coach/repeter', { waitUntil: 'domcontentloaded' })
  const actif = page.locator('nav[aria-label="Navigation principale"] a[aria-current="page"]')
  await expect(actif).toHaveCount(1, { timeout: 20_000 })
  await expect(actif).toHaveText(/Formation/)
})

test('le nom d’Aria n’est plus écrit nulle part', async ({ page }) => {
  for (const url of ['/accueil', '/parcours', '/parcours/cours', '/parcours/competences', '/coach/repeter']) {
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('main')).toBeVisible({ timeout: 20_000 })
    const texte = await page.locator('body').innerText()
    expect(texte, `« Aria » est encore écrit sur ${url}`).not.toMatch(/\bAria\b/)
  }
})

test('capture du hub', async ({ page }) => {
  await page.goto('/parcours', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('main a').first()).toBeVisible({ timeout: 20_000 })
  await page.evaluate(() => { document.getAnimations().forEach((a) => { try { a.finish() } catch {} }) })
  await page.screenshot({ path: 'hub.png', fullPage: true })
})
