// LA PASTILLE D'ÉCOUTE, EN IMAGE
//
//     E2E_BASE=https://v2.atline.ai npx playwright test tests/capture-pastille.spec.cjs
//
// ⚠️ ON ATTEND QUE LES IMAGES SOIENT PEINTES, pas qu'elles existent. « L'élément
// est là » et « l'image est peinte » sont deux faits différents : une capture
// prise entre les deux rend une pochette NOIRE, et on cherche ensuite un défaut
// dans un fichier parfaitement intact. `decode()` est le seul moyen de le
// savoir.
const { test, expect } = require('../fixtures.cjs')
const { lancer, ouvrirEcoute } = require('../son.cjs')

test.use({ viewport: { width: 390, height: 844 } })

const PASTILLE = '[data-pastille-ecoute]'

/**
 * ⚠️ CHAQUE DÉCODAGE EST BORNÉ DANS LE TEMPS. `decode()` sur une image en
 * chargement DIFFÉRÉ qui n'a pas encore commencé ne se résout jamais : sur un
 * écran de contacts, l'attente a mangé les soixante secondes du test sans un
 * mot. On veut « peint ou abandonné », pas « peint un jour ».
 */
async function figer(page) {
  await page.evaluate(async () => {
    const borne = (p) => Promise.race([p, new Promise((r) => setTimeout(r, 1500))])
    await Promise.all([...document.images].map((i) => borne(i.decode().catch(() => {}))))
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  })
}

test('la pastille sur la liseuse et sur un autre lieu', async ({ page }) => {
  await ouvrirEcoute(page)
  await lancer(page)

  // La couverture du module, première sortie de la leçon.
  await page.getByRole('link', { name: /Retour au module/ }).click()
  await page.locator(PASTILLE).waitFor({ state: 'visible', timeout: 15_000 })
  await figer(page)
  await page.screenshot({ path: 'pastille-module.png' })

  // 🔴 LA LISEUSE : l'écran où « écouter en travaillant » se réalise d'abord.
  // Mesuré le 20 novembre 2026 : le script parlé suit le texte écrit dans le
  // MÊME ORDRE à 99,54 % sur les 71 leçons, et il est plus long de 13,5 % en
  // moyenne — c'est un habillage oral, pas une réécriture. D'où la décision de
  // Patrice : l'audio ne se met PAS en pause en entrant ici.
  const rangees = page.locator('[data-lecon]')
  if ((await rangees.count()) > 0) {
    /**
     * 🔴 ON ATTEND L'ADRESSE, PAS LA PASTILLE. Première version : un clic puis
     * « attendre que la pastille soit visible ». Elle l'était DÉJÀ, sur la page
     * de départ : l'attente rendait la main avant la navigation, et la capture
     * nommée « liseuse » montrait la couverture du module. Attendre une chose
     * déjà vraie ne prouve rien — c'est le même piège que `playing`.
     */
    const vers = await rangees.first().getAttribute('href')
    await rangees.first().click()
    await expect.poll(() => page.url(), { timeout: 15_000 }).toContain(vers)
    await page.locator(PASTILLE).waitFor({ state: 'visible', timeout: 15_000 })
    await figer(page)
    await page.screenshot({ path: 'pastille-liseuse.png' })
    await page.getByRole('link', { name: /Retour au module/ }).click()
    await page.locator(PASTILLE).waitFor({ state: 'visible', timeout: 15_000 })
  }

  // Et un vrai autre lieu, là où la pastille doit cohabiter avec le geste du
  // jour : c'est la configuration la plus serrée du bas de l'écran.
  await page.getByRole('link', { name: 'Retour à Apprendre' }).click()
  await page.locator('[data-barre-bas]').waitFor({ state: 'visible', timeout: 15_000 })
  const gens = page.locator('[data-barre-bas] a[href="/gens"]')
  if ((await gens.count()) > 0) {
    await gens.first().click()
    await page.locator(PASTILLE).waitFor({ state: 'visible', timeout: 15_000 })
    await figer(page)
    await page.screenshot({ path: 'pastille-gens.png' })
  }

  expect(await page.locator(PASTILLE).count(), 'la pastille a disparu en route').toBe(1)
})
