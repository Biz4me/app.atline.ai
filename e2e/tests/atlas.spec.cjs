// ATLAS EST UN LIEU — la barre, la colonne, et plus de porte en double.
const { test, expect, suivre } = require('../fixtures.cjs')
test.use({ viewport: { width: 390, height: 844 } })

const BARRE = 'nav[aria-label="Navigation principale"]'

test('quatre entrées, Atlas en troisième, et il mène au fil', async ({ page, pageErrors }) => {
  await page.goto('/accueil', { waitUntil: 'domcontentloaded' })
  const cases = page.locator(`${BARRE} a`)
  // 🔴 ET ATLAS N'EST PLUS « AU CENTRE ». La barre est passée à QUATRE le 10
  // novembre 2026 : à cinq, la troisième case était le milieu exact, et
  // `destinations.ts` disait que c'était « la place qu'il mérite, la plus
  // facile à atteindre après les bords ». À quatre, il n'y a pas de milieu.
  // Il garde sa position — on ne déplace pas un réflexe sans raison — mais
  // l'argument qui la justifiait est tombé avec la cinquième case, et il
  // faudra le reposer le jour où une cinquième reviendra.
  await expect(cases).toHaveCount(4, { timeout: 20_000 })
  const mots = await cases.evaluateAll((n) => n.map((e) => e.textContent.trim()))
  console.log(`  barre : ${mots.join(' · ')}`)
  expect(mots[2]).toMatch(/Atlas/)
  expect(await cases.nth(2).getAttribute('href')).toBe('/atlas')
  expect(pageErrors).toEqual([])
})

test('l’accueil ne porte plus de second geste vers Atlas', async ({ page }) => {
  /**
   * 🔴 « Parler à Atlas » menait exactement où mène la case. Deux gestes vers
   * le même endroit, dont le MOINS accessible : la faute qui a supprimé le
   * menu global le 5 novembre.
   */
  await page.goto('/accueil', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('main')).toBeVisible({ timeout: 20_000 })
  const vers = await page.locator('main a, main button').evaluateAll((n) =>
    n.map((e) => e.getAttribute('href')).filter((h) => h && (h === '/atlas' || h.includes('parler'))),
  )
  expect(vers, 'l’accueil double la case Atlas').toEqual([])
})

test('le fil tient la colonne, garde la barre, et l’ancienne adresse redirige', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 })
  await page.goto('/coach/parler', { waitUntil: 'domcontentloaded' })
  await expect(page).toHaveURL(/\/atlas$/, { timeout: 20_000 })
  await expect(page.locator(BARRE)).toBeVisible()
  const l = await page.evaluate(() =>
    Math.round(
      Math.max(
        0,
        ...[...document.body.children]
          .filter((e) => e.getBoundingClientRect().height > 50)
          .map((e) => e.getBoundingClientRect().width),
      ),
    ),
  )
  console.log(`  colonne du fil à 1200 px : ${l} px`)
  expect(l).toBeLessThanOrEqual(431)
})

test('la barre s’efface pendant la saisie, et revient', async ({ page }) => {
  /**
   * ⚠️ CETTE SONDE CLIQUAIT « Écrire plutôt » POUR FAIRE APPARAÎTRE LE CHAMP.
   * Le composeur du 10 novembre 2026 n'a plus de mode : le champ est toujours
   * là, et ce bouton n'existe plus. **Elle surveillait un mécanisme, pas un
   * comportement** — le comportement, lui, n'a pas bougé d'un pouce.
   *
   * 🧭 Le commentaire d'origine vaut d'être gardé : ce clic avait trouvé un
   * vrai défaut, un bouton présent dans le document mais ENTIÈREMENT
   * recouvert par la barre du bas, donc incliquable. Playwright attend
   * l'actionnabilité, pas la présence — et c'est ce qui sépare une sonde d'un
   * contrôle de présence. Le `click()` ci-dessous garde cette propriété.
   */
  await page.goto('/atlas', { waitUntil: 'domcontentloaded' })
  const barre = page.locator(BARRE)
  await expect(barre).toBeVisible({ timeout: 20_000 })

  const champ = page.getByPlaceholder('Écris à Atlas…')
  await expect(champ).toBeVisible({ timeout: 10_000 })
  // La barre est encore là TANT QU'ON N'ÉCRIT PAS : c'est la moitié qu'on
  // oublie de vérifier, et sans elle « elle disparaît » ne prouve rien.
  await expect(barre, 'la barre est partie avant même la saisie').toBeVisible()

  await champ.click()
  await expect(barre, 'la barre reste pendant la saisie').toBeHidden({ timeout: 5_000 })
  await champ.blur()
  await expect(barre, 'la barre ne revient pas après la saisie').toBeVisible({ timeout: 5_000 })
})
