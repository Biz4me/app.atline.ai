// LE PAPIER EST AU TEXTE, LE CHROME EST À L'APP.
//
//     E2E_BASE=https://v2.atline.ai npx playwright test tests/liseuse-theme.spec.cjs
//
// ── 🔴 LA RÈGLE, ET POURQUOI ELLE SE PERD SI FACILEMENT ──────────────────
//
// Patrice lit l'app en thème sombre. La liseuse lui sortait un en-tête et une
// barre du bas BLANCS, et la page d'écoute entièrement blanche. Aucune couleur
// n'était fausse : `Livre` pose les jetons du PAPIER sur tout ce qu'il
// contient, il enveloppait la coquille entière, et le papier par défaut est
// blanc. Chaque pièce avait raison dans son repère.
//
// 🧭 C'est ce qui rend ce défaut invisible en relecture : il ne se voit que
// sur un thème, et seulement quand les deux réglages divergent — app sombre,
// papier blanc. Qui développe en clair ne le rencontre jamais.
//
// ⚠️ ET IL AVAIT DÉJÀ ÉTÉ CORRIGÉ À MOITIÉ : le 19 novembre, le filtre de
// lecture a été porté hors du livre pour exactement cette raison. La moitié
// qui restait a tenu un jour de plus.
const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' })

/** La clarté moyenne d'un fond, 0 à 255. */
const clarte = (couleur) => {
  const n = (couleur.match(/\d+/g) || []).map(Number)
  return n.length >= 3 ? Math.round((n[0] + n[1] + n[2]) / 3) : null
}

async function ouvrirModule(page) {
  await page.goto('/parcours', { waitUntil: 'domcontentloaded' })
  const vers = await page.locator('[data-module="1"]').getAttribute('href')
  await page.goto(vers, { waitUntil: 'domcontentloaded' })
  return vers
}

test('en thème sombre, la liseuse garde son papier mais pas son chrome', async ({ page }) => {
  await ouvrirModule(page)
  await page.getByRole('link', { name: 'Lire' }).click()
  await page.locator('[data-rang]').waitFor({ state: 'visible', timeout: 20_000 })
  await page.waitForTimeout(600)

  const vu = await page.evaluate(() => {
    const fond = (n) => (n ? getComputedStyle(n).backgroundColor : null)
    return {
      entete: fond(document.querySelector('[data-coquille] header, [data-coquille] > div')),
      barre: fond(document.querySelector('[data-barre-action]')),
      papier: fond(document.querySelector('[data-livre]')),
    }
  })
  console.log(`  en-tête ${vu.entete} · barre ${vu.barre} · papier ${vu.papier}`)

  expect(clarte(vu.barre), 'la barre du bas doit suivre le thème de l’app').toBeLessThan(60)
  expect(clarte(vu.entete), 'l’en-tête doit suivre le thème de l’app').toBeLessThan(60)
  /**
   * 🔴 ET LE PAPIER NE DOIT PAS SUIVRE, LUI. C'est la moitié de la règle
   * qu'on casserait en « corrigeant » trop loin : quelqu'un qui a choisi le
   * papier blanc le garde, même la nuit. Sans cette assertion, retirer `Livre`
   * passerait au vert.
   */
  expect(clarte(vu.papier), 'le papier blanc reste blanc').toBeGreaterThan(200)
})

test('en thème sombre, la page d’écoute est sombre de bout en bout', async ({ page }) => {
  await ouvrirModule(page)
  await page.getByRole('link', { name: 'Écouter' }).click()
  await page.locator('[data-options-ecoute]').waitFor({ state: 'visible', timeout: 20_000 })
  await page.waitForTimeout(600)

  // ⚠️ Elle n'a PAS de `[data-livre]` : un papier sert à lire, et il n'y a
  // rien à lire ici. C'est ce qui garantit qu'elle suit le thème de l'app.
  await expect(page.locator('[data-livre]')).toHaveCount(0)

  const fond = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  console.log(`  fond de la page d’écoute : ${fond}`)
  expect(clarte(fond), 'la page d’écoute doit être sombre').toBeLessThan(60)
})
