// FORMATION : UN LIEU, TROIS PORTES — ET QUATRE ENTREES DANS LA BARRE.
const { test, expect } = require('../fixtures.cjs')
test.use({ viewport: { width: 390, height: 844 } })

test('l’entraînement n’a pas de case dans la barre', async ({ page, pageErrors }) => {
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
  // ⚠️ LES DEUX MOTS, et c'est le point. L'écran s'est appelé « Répéter »,
  // puis « Simulation », puis « Entraînement » le 10 novembre 2026. Une sonde
  // qui ne surveillerait que l'ancien nom se tairait le jour où le NOUVEAU
  // reviendrait dans la barre — elle surveillerait un mot, pas une règle.
  expect(mots.join(' ')).not.toMatch(/Simulation|Entraîn|Répéter/i)
  expect(pageErrors).toEqual([])
})

test('la flèche d’un module repose là d’où l’on vient : les cours', async ({ page }) => {
  /**
   * 🔴 ELLE VISAIT LE HUB, donc un cran trop haut : on choisit un module DANS
   * « Les cours », et la flèche déposait ailleurs. Corrigé le 10 novembre 2026
   * sur décision de Patrice. Règle ② de la maison : **le retour ne fait jamais
   * perdre sa place.**
   *
   * ⚠️ On suit le VRAI chemin — la liste, puis un module — au lieu d'ouvrir
   * une adresse de module écrite ici. Une sonde qui connaît un identifiant
   * surveille cet identifiant, pas le comportement.
   */
  await page.goto('/parcours/cours', { waitUntil: 'domcontentloaded' })
  const modules = page.locator('main a[href^="/parcours/"]')
  await expect(modules.first()).toBeVisible({ timeout: 20_000 })
  await modules.first().click()
  await expect(page).toHaveURL(/\/parcours\/[^/]+$/, { timeout: 20_000 })
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Module/)

  const fleche = page.locator('header a[href]').first()
  await expect(fleche).toHaveAttribute('href', '/parcours/cours')
  // ⚠️ ET ELLE OUVRE VRAIMENT : un `href` correct sur un élément occulté par
  // l'en-tête collant serait vert pour rien.
  await fleche.click()
  await expect(page).toHaveURL(/\/parcours\/cours$/, { timeout: 20_000 })
  await expect(page.getByRole('heading', { level: 1, name: 'Les cours' })).toBeVisible()
})

test('les trois portes mènent quelque part, et Apprendre s’allume aussi en simulation', async ({
  page,
}) => {
  await page.goto('/parcours', { waitUntil: 'domcontentloaded' })
  const portes = await page.locator('main a[href^="/parcours/"], main a[href^="/coach"]').evaluateAll((n) =>
    n.map((e) => e.getAttribute('href')),
  )
  console.log(`  portes : ${portes.join(' ')}`)
  expect(portes).toEqual(['/parcours/cours', '/parcours/competences', '/coach/repeter'])

  // 🔴 Le simulateur vit sous /coach/repeter mais appartient a Apprendre :
  // sans `autres` dans destinations.ts, aucune entree ne s'allumerait et
  // l'ecran perdrait sa couleur de lieu — on y serait sans savoir ou.
  // ⚠️ Le lieu s'appelait « Formation » jusqu'au 10 novembre 2026.
  await page.goto('/coach/repeter', { waitUntil: 'domcontentloaded' })
  const actif = page.locator('nav[aria-label="Navigation principale"] a[aria-current="page"]')
  await expect(actif).toHaveCount(1, { timeout: 20_000 })
  await expect(actif).toHaveText(/Apprendre/)
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
