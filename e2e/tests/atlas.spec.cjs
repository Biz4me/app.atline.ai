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
   * ⚠️ LE CHAMP N'EST PAS LÀ AU DÉPART : le composeur propose « Parler », et
   * le clavier derrière « Écrire plutôt ». Chercher le champ d'emblée faisait
   * échouer la sonde sur un écran parfaitement correct.
   */
  await page.goto('/atlas', { waitUntil: 'domcontentloaded' })
  const barre = page.locator(BARRE)
  await expect(barre).toBeVisible({ timeout: 20_000 })

  // 🔴 CE CLIC EST LA SONDE QUI A TROUVE LE DEFAUT : le bouton etait dans le
  // document mais ENTIEREMENT recouvert par la barre du bas, donc
  // incliquable. Playwright attend l'actionnabilite, pas la presence — et
  // c'est exactement ce qui separe une sonde d'un controle de presence.
  await expect(page.getByRole('button', { name: 'Écrire plutôt' })).toBeVisible({ timeout: 10_000 })
  await page.getByRole('button', { name: 'Écrire plutôt' }).click()
  const champ = page.getByPlaceholder('Écris à Atlas')
  await expect(champ).toBeVisible({ timeout: 10_000 })

  // 🔴 `autoFocus` le met déjà au focus : la barre doit donc DÉJÀ être partie.
  await expect(barre, 'la barre reste pendant la saisie').toBeHidden({ timeout: 5_000 })
  await champ.blur()
  await expect(barre, 'la barre ne revient pas après la saisie').toBeVisible({ timeout: 5_000 })
})
