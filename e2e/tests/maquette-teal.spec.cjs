// MAQUETTE : À QUOI RESSEMBLERAIT LA PAGE D'ÉCOUTE EN TEAL ?
//
//     E2E_BASE=https://v2.atline.ai npx playwright test tests/maquette-teal.spec.cjs
//
// Pour décider si un fond teal (comme le mini) simplifie le morph : on lit les
// jetons de couleur EXACTS de la carte pastille (fond + encre), on les injecte
// sur la feuille d'écoute (le design system étant en jetons, le contenu se
// recolorie), et on capture. Rien n'est modifié dans le code : c'est une
// maquette navigateur, jetable.
const { test } = require('../fixtures.cjs')
const { lancer, ouvrirEcoute } = require('../son.cjs')

test.use({ viewport: { width: 390, height: 844 } })

test('maquette : la page audio en teal', async ({ page }) => {
  await ouvrirEcoute(page)
  await lancer(page)

  // 1. Lire le teal de la pastille là où elle vit (contacts).
  await page.goto('/gens', { waitUntil: 'domcontentloaded' })
  await page.locator('[data-pastille-carte]').first().waitFor({ state: 'visible', timeout: 20_000 })
  const teinte = await page.evaluate(() => {
    const s = getComputedStyle(document.querySelector('[data-pastille-carte]'))
    return { fond: s.backgroundColor, encre: s.color }
  })
  console.log(JSON.stringify(teinte))

  // 2. Rouvrir l'écoute par-dessus (via la pastille → interception).
  await page.locator('[data-pastille-vers-lecon]').click()
  await page.locator('[data-feuille-ecoute]').waitFor({ state: 'visible', timeout: 20_000 })
  await page.waitForTimeout(500)

  // 3. Injecter le teal sur la feuille : on surcharge les JETONS, le contenu suit.
  await page.evaluate(({ fond, encre }) => {
    const f = document.querySelector('[data-feuille-ecoute]')
    f.style.setProperty('--color-fond', fond)
    f.style.setProperty('--color-encre', encre)
    f.style.setProperty('--color-secondaire', encre)
    // Une surface à peine plus claire que le fond, pour que barres et champs se
    // détachent un peu (approximation de maquette).
    f.style.setProperty('--color-surface', 'rgba(255,255,255,0.08)')
    f.style.setProperty('--color-bordure', 'rgba(255,255,255,0.14)')
    f.style.background = fond
    f.style.color = encre
  }, teinte)
  await page.waitForTimeout(400)

  await page.screenshot({ path: 'maquette-audio-teal.png' })
})
