// LE GESTE VERS LE BAS RÉDUIT LE LECTEUR, COMME LE CHEVRON.
//
//   E2E_BASE=https://v2.atline.ai npx playwright test tests/geste-descendre.spec.cjs
//
// Patrice, le 21 novembre 2026 : *« le geste sur la page audio qui va vers le
// bas fait la même chose que le chevron qui réduit le lecteur ; comme ça on a
// un geste ET un clic »*.
//
// 🧭 ET C'EST « LA MÊME CHOSE » QUI SE MESURE, pas « ça marche ». Un geste qui
// arrive au bon endroit par un autre chemin — `replace` au lieu de `push` —
// passerait un test d'arrivée et laisserait un historique différent : le
// retour du téléphone n'aurait alors pas le même effet selon la façon dont on
// est sorti. On compare donc les deux sorties, pas seulement la destination.
//
// ⚠️ ET ON ÉPROUVE AUSSI CE QUI DOIT **NE PAS** DÉCLENCHER. Un geste qui part
// trop tôt est pire que pas de geste : il referme la page sous le doigt de
// quelqu'un qui voulait feuilleter les couvertures.
const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

/**
 * Glisser du doigt, en vrais événements tactiles.
 *
 * ⚠️ `lenteur` EXISTE POUR UNE RAISON PRÉCISE. Depuis que la réduction tient
 * au doigt, elle part aussi sur l'ÉLAN — et des événements envoyés dans une
 * boucle serrée ont un élan énorme, donc tout partirait. Un geste lent se
 * mesure en espaçant les pas, comme un vrai pouce.
 */
const glisser = (page, { de, vers, pas = 10, lenteur = 0 }) =>
  page.evaluate(
    async ({ de, vers, pas, lenteur }) => {
      const cible = document.elementFromPoint(de.x, de.y) || document.body
      const doigt = (x, y) =>
        new Touch({ identifier: 1, target: cible, clientX: x, clientY: y })
      const envoyer = (type, x, y) =>
        cible.dispatchEvent(
          new TouchEvent(type, {
            bubbles: true,
            cancelable: true,
            touches: type === 'touchend' ? [] : [doigt(x, y)],
            targetTouches: type === 'touchend' ? [] : [doigt(x, y)],
            changedTouches: [doigt(x, y)],
          }),
        )
      envoyer('touchstart', de.x, de.y)
      for (let i = 1; i <= pas; i++) {
        envoyer(
          'touchmove',
          de.x + ((vers.x - de.x) * i) / pas,
          de.y + ((vers.y - de.y) * i) / pas,
        )
        if (lenteur) await new Promise((r) => setTimeout(r, lenteur))
      }
      envoyer('touchend', vers.x, vers.y)
      // Le temps que la course finisse (220 ms) et que la page suive.
      await new Promise((r) => setTimeout(r, 420))
    },
    { de, vers, pas, lenteur },
  )

const ouvrirEcoute = async (page) => {
  await page.goto('/parcours', { waitUntil: 'domcontentloaded' })
  const href = await page.locator('a[data-module="2"]').getAttribute('href')
  await page.goto(href, { waitUntil: 'domcontentloaded' })
  // ⚠️ DEUX PORTES : la rangée « Écouter » s'efface quand le lecteur réduit
  // joue déjà ce module, et c'est alors la pastille qui ramène à la leçon.
  const ecouter = page.getByRole('link', { name: 'Écouter' })
  const pastille = page.locator('[data-pastille-vers-lecon]')
  await expect
    .poll(async () => (await ecouter.count()) + (await pastille.count()), { timeout: 20_000 })
    .toBeGreaterThan(0)
  await ((await ecouter.count()) ? ecouter : pastille).first().click()
  await expect(page.locator('[data-titre-ecoute]')).toBeVisible({ timeout: 20_000 })
  await page.waitForTimeout(700)
  return href
}

test('le geste vers le bas sort exactement comme le chevron', async ({ page, pageErrors }) => {
  test.setTimeout(300_000)
  const griefs = []

  // ── 1. Le chevron, pour savoir ce que « la même chose » veut dire.
  const couverture = await ouvrirEcoute(page)
  const avant = await page.evaluate(() => history.length)
  await page.locator(`a[href="${couverture}"]`).first().click()
  await expect.poll(() => new URL(page.url()).pathname, { timeout: 20_000 }).toBe(couverture)
  const parLeChevron = (await page.evaluate(() => history.length)) - avant

  // ── 2. Le geste.
  await ouvrirEcoute(page)
  const avant2 = await page.evaluate(() => history.length)
  await glisser(page, { de: { x: 195, y: 300 }, vers: { x: 195, y: 700 } })
  await expect
    .poll(() => new URL(page.url()).pathname, { timeout: 20_000 })
    .toBe(couverture)
  const parLeGeste = (await page.evaluate(() => history.length)) - avant2

  console.log(`  historique · chevron +${parLeChevron} · geste +${parLeGeste}`)
  if (parLeChevron !== parLeGeste)
    griefs.push(
      `le geste laisse un autre historique que le chevron (+${parLeGeste} contre +${parLeChevron})`,
    )

  // ── 3. Ce qui ne doit PAS sortir.
  await ouvrirEcoute(page)
  const ici = new URL(page.url()).pathname

  // Un glissement horizontal : c'est le carrousel, pas la sortie.
  await glisser(page, { de: { x: 250, y: 230 }, vers: { x: 100, y: 250 } })
  await page.waitForTimeout(400)
  if (new URL(page.url()).pathname !== ici)
    griefs.push('un glissement horizontal a refermé la page')

  // Un frôlement de 40 px : sous le minimum, quelle que soit sa vivacité.
  await page.goto(ici, { waitUntil: 'domcontentloaded' })
  await page.locator('[data-titre-ecoute]').waitFor({ state: 'visible', timeout: 20_000 })
  await page.waitForTimeout(500)
  await glisser(page, { de: { x: 195, y: 430 }, vers: { x: 195, y: 470 } })
  if (new URL(page.url()).pathname !== ici)
    griefs.push('un frôlement de 40 px a refermé la page')

  /**
   * 🔴 LÂCHÉ AVANT LE QUART, L'ÉCRAN REMONTE. Patrice : *« si je la lâche
   * avant le quart à partir du haut elle remonte, sinon elle continue »*.
   * ⚠️ LENTEMENT, SINON ON MESURE L'AUTRE RÈGLE : un geste rapide part sur
   * l'élan, et la sonde croirait avoir éprouvé la distance.
   */
  await glisser(page, { de: { x: 195, y: 300 }, vers: { x: 195, y: 450 }, pas: 12, lenteur: 40 })
  if (new URL(page.url()).pathname !== ici)
    griefs.push('lâché à 150 px — moins du quart — l’écran est quand même parti')
  const remonte = await page.evaluate(
    () => getComputedStyle(document.querySelector('[data-coquille]')).transform,
  )
  if (remonte !== 'none' && !/matrix\(1, 0, 0, 1, 0, 0\)/.test(remonte))
    griefs.push(`l’écran n’est pas remonté : transform ${remonte}`)

  // Et la feuille des options garde ses gestes.
  await page.locator('[data-options-ecoute]').click()
  await page.waitForTimeout(500)
  await glisser(page, { de: { x: 195, y: 700 }, vers: { x: 195, y: 830 } })
  await page.waitForTimeout(400)
  if (new URL(page.url()).pathname !== ici)
    griefs.push('un geste dans la feuille ouverte a refermé la page')

  expect(griefs, `ce qui cloche :\n  · ${griefs.join('\n  · ')}`).toEqual([])
  expect(pageErrors, `exception client : ${pageErrors.join(' · ')}`).toEqual([])
})
