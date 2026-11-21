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

/**
 * La clarté moyenne d'un fond, 0 à 255.
 *
 * ── 🔴 DEUX ÉCRITURES, ET UNE SEULE ÉTAIT LUE ──────────────────────────────
 *
 * Elle ne comprenait que `rgb(23, 24, 27)`. Le 21 novembre 2026, la barre du
 * livre a pris le fond de la barre des lieux, un `color-mix` — que le
 * navigateur rend en **`color(srgb 0.09 0.094 0.105 / 0.94)`**. Les décimales
 * y sont des composantes de 0 à 1, et `\d+` y lisait « 0, 09, 0, 094… » : la
 * sonde annonçait une barre presque blanche sur un fond qui vaut 23.
 *
 * 🧭 ELLE AURAIT DÛ SE TAIRE PLUTÔT QUE DE RÉPONDRE DE TRAVERS. Une mesure
 * qui ne reconnaît pas son entrée doit le dire ; ici elle a inventé un
 * nombre, et il a fallu lire la valeur brute pour comprendre que le produit
 * allait bien.
 */
const clarte = (couleur) => {
  if (!couleur) return null
  const n = (couleur.match(/[\d.]+/g) || []).map(Number)
  if (n.length < 3) return null
  // `color(srgb …)` parle en 0→1, `rgb(…)` en 0→255.
  const f = /^color\(/.test(couleur) ? 255 : 1
  return Math.round(((n[0] + n[1] + n[2]) / 3) * f)
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
      // ⚠️ L'UN OU L'AUTRE : la barre du livre est passée de barre d'action
      // à barre de navigation le 21 nov. 2026. Chercher la première seule
      // rendait `null`, et la sonde tombait sur `null.match` au lieu de dire
      // ce qu'elle avait trouvé.
      barre: fond(
        document.querySelector('[data-barre-action]') ||
          document.querySelector('[data-barre-bas]'),
      ),
      // 🔴 LA COUCHE DE FOND, et pas la boîte qui porte les jetons. Le papier
      // est peint par un calque `fixed inset-0` sous tout le reste : la boîte
      // `[data-livre]`, elle, n'a plus de fond du tout.
      papier: fond(document.querySelector('[data-livre] > [data-papier]')),
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

  /**
   * ── 🔴 ET IL VA D'UN BORD À L'AUTRE ──────────────────────────────────────
   *
   * La première correction bornait `Livre` au texte : le chrome a bien suivi
   * le thème, et **le papier est devenu un rectangle blanc au milieu du
   * noir**, bordé des gouttières de la page. Deux demandes qui semblaient se
   * contredire parlaient en fait de deux choses — l'héritage des JETONS se
   * borne au texte, la PEINTURE couvre l'écran.
   *
   * ⚠️ On mesure donc dans la GOUTTIÈRE, à 4 px du bord : c'est exactement là
   * que le défaut se voyait, et nulle part ailleurs.
   */
  const gouttiere = await page.evaluate(() => {
    const couche = document.querySelector('[data-livre] > [data-papier]')
    const r = couche.getBoundingClientRect()
    return { gauche: Math.round(r.left), droite: Math.round(r.right), large: window.innerWidth }
  })
  console.log(`  couche du papier : ${gouttiere.gauche} → ${gouttiere.droite} sur ${gouttiere.large}`)
  expect(gouttiere.gauche, 'le papier doit toucher le bord gauche').toBeLessThanOrEqual(0)
  expect(gouttiere.droite, 'le papier doit toucher le bord droit').toBeGreaterThanOrEqual(
    gouttiere.large,
  )
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
