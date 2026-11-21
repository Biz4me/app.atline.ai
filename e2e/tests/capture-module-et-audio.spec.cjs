// REGARDER CE QUE LES DEUX ÉCRANS DONNENT VRAIMENT.
//
//     E2E_BASE=https://v2.atline.ai npx playwright test tests/capture-module-et-audio.spec.cjs
//
// Deux captures, pour deux raisons différentes du 20 novembre 2026 :
//   · la couverture d'un module, pour voir les chevrons de feuilletage posés
//     sur le reflet flouté — un gris sur une photo floue est le genre de chose
//     qu'aucun contrôle de style ne tranche ;
//   · la page d'écoute, parce que Patrice la trouve moins claire et demande une
//     maquette AVANT que je touche au code. On ne redessine pas un écran de
//     mémoire.
//
// ⚠️ LES ANIMATIONS SONT ARRÊTÉES AVANT DE DÉCLENCHER. Une mesure prise sur une
// cible en mouvement ment, et une capture est une mesure.
const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

// 🔴 ET ON ATTEND QUE LES IMAGES SOIENT DÉCODÉES. Première version : le test
// vérifiait que le `<img>` est VISIBLE, ce qui est vrai dès que la boîte
// existe. La capture a donc montré une couverture NOIRE et j'ai cru l'image
// cassée — je suis allé la télécharger pour découvrir qu'elle allait très
// bien. « L'élément est là » et « l'image est peinte » sont deux faits
// différents, et c'est le second qu'une capture est censée montrer.
const figer = async (page) => {
  await page.evaluate(async () => {
    await Promise.all(
      [...document.images].map((i) =>
        i.complete && i.naturalWidth > 0 ? null : i.decode().catch(() => null),
      ),
    )
    document.getAnimations().forEach((a) => {
      try {
        a.finish()
      } catch {}
    })
  })
}

test('la couverture d’un module, chevrons compris', async ({ page, pageErrors }) => {
  await page.goto('/parcours', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('a[data-module]').first()).toBeVisible({ timeout: 20_000 })
  // Le module 2 : il a un voisin de chaque côté, donc les deux chevrons.
  const href = await page.locator('a[data-module="2"]').getAttribute('href')
  await page.goto(href, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-feuillet-module="droite"]')).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('[data-feuillet-module="gauche"]')).toBeVisible()
  await figer(page)
  await page.screenshot({ path: 'module-chevrons.png' })
  expect(pageErrors).toEqual([])
})

test('les bouts de la série n’ont qu’un chevron', async ({ page }) => {
  await page.goto('/parcours', { waitUntil: 'domcontentloaded' })
  const premier = await page.locator('a[data-module="1"]').getAttribute('href')
  await page.goto(premier, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-feuillet-module="droite"]')).toBeVisible({ timeout: 20_000 })
  await expect(
    page.locator('[data-feuillet-module="gauche"]'),
    'le module 1 ne doit pas proposer de précédent',
  ).toHaveCount(0)

  // ⚠️ Et le chevron MÈNE quelque part : un lien visible qui ne navigue pas
  // est le défaut que « il est là » ne voit jamais.
  await page.locator('[data-feuillet-module="droite"]').click()
  await expect(page.locator('[data-couverture-module="2"]')).toBeVisible({ timeout: 20_000 })
})

test('la page d’écoute, telle qu’elle est aujourd’hui', async ({ page, pageErrors }) => {
  await page.goto('/parcours', { waitUntil: 'domcontentloaded' })
  const href = await page.locator('a[data-module="1"]').getAttribute('href')
  await page.goto(href, { waitUntil: 'domcontentloaded' })
  const ecouter = page.getByRole('link', { name: 'Écouter' })
  await expect(ecouter).toBeVisible({ timeout: 20_000 })
  await ecouter.click()
  await expect(page.locator('[data-carrousel-modules] [aria-current] img')).toBeVisible({ timeout: 20_000 })
  await figer(page)
  await page.screenshot({ path: 'audio-actuel.png' })
  expect(pageErrors).toEqual([])
})
