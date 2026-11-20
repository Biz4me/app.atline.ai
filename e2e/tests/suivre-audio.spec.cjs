// LE TEXTE SUIT-IL LA VOIX, ET S'ARRÊTE-T-IL QUAND LE DOIGT PREND LA MAIN ?
//
//     E2E_BASE=https://v2.atline.ai npx playwright test tests/suivre-audio.spec.cjs
//
// Patrice, le 20 novembre 2026 : *« dans la liseuse le texte ne suit pas encore
// l'audio »*. Le défilement est une PROPORTION, pas un horodatage : il ne tient
// que parce que le script parlé suit le texte écrit dans le même ordre à
// 99,54 % sur les 71 leçons.
//
// 🔴 LES DEUX MOITIÉS COMPTENT AUTANT. Qu'il suive, et qu'il S'ARRÊTE dès
// qu'on fait défiler soi-même — un défilement qui reprend la main sur
// quelqu'un en train de relire est insupportable, bien plus que l'absence de
// défilement.
const { test, expect } = require('../fixtures.cjs')
const { lancer, ouvrirEcoute } = require('../son.cjs')

test.use({ viewport: { width: 390, height: 844 } })

const defilement = (page) =>
  page.evaluate(() => {
    const e = document.scrollingElement
    return {
      haut: Math.round(e.scrollTop),
      course: Math.round(e.scrollHeight - e.clientHeight),
      t: document.querySelector('audio')?.currentTime ?? 0,
      d: document.querySelector('audio')?.duration ?? 0,
    }
  })

/** Ouvrir le TEXTE de la leçon qui joue, par la couverture du module. */
async function versLeTexte(page) {
  await page.getByRole('link', { name: /Retour au module/ }).click()
  await page.locator('[data-pastille-ecoute]').waitFor({ state: 'visible', timeout: 15_000 })
  const lire = page.getByRole('link', { name: 'Lire' })
  await expect(lire).toBeVisible({ timeout: 15_000 })
  await lire.click()
  await page.locator('[data-rang]').waitFor({ state: 'visible', timeout: 20_000 })
}

test('le texte se place là où en est la voix, puis avance avec elle', async ({ page }) => {
  await ouvrirEcoute(page)
  await lancer(page)

  // On se met franchement au milieu : à zéro, « suivre » ne se distingue pas
  // de « ne rien faire ».
  await page.evaluate(() => {
    const a = document.querySelector('audio')
    a.currentTime = a.duration * 0.5
  })
  await expect
    .poll(() => page.evaluate(() => document.querySelector('audio').currentTime), { timeout: 15_000 })
    .toBeGreaterThan(10)

  await versLeTexte(page)
  // Le placement d'arrivée est SEC : il est fait dès le premier rendu.
  await expect.poll(async () => (await defilement(page)).haut, { timeout: 15_000 }).toBeGreaterThan(50)

  const m = await defilement(page)
  const attendu = Math.round((m.t / m.d) * m.course)
  console.log(JSON.stringify({ ...m, attendu }, null, 1))

  const griefs = []
  if (m.course < 400) griefs.push(`la leçon ne fait que ${m.course} px à défiler : ce test n’éprouve rien`)
  // ⚠️ 12 % DE TOLÉRANCE, et c'est honnête : le prorata dérive d'environ une
  // ligne par pour cent, et le parlé commence par une annonce que le texte n'a
  // pas — la voix est en avance d'environ 4 % au début.
  if (Math.abs(m.haut - attendu) > m.course * 0.12)
    griefs.push(`texte à ${m.haut} px alors que la voix en est à ${attendu} (course ${m.course})`)

  expect(griefs, `ce qui cloche :\n  · ${griefs.join('\n  · ')}`).toEqual([])
})

test('le défilement s’arrête dès que le doigt prend la main, et revient sur demande', async ({ page }) => {
  await ouvrirEcoute(page)
  await lancer(page)
  await page.evaluate(() => {
    const a = document.querySelector('audio')
    a.currentTime = a.duration * 0.5
  })
  await versLeTexte(page)
  await expect.poll(async () => (await defilement(page)).haut, { timeout: 15_000 }).toBeGreaterThan(50)

  /**
   * ── 🔴 ON INSISTE, COMME UN VRAI DOIGT ────────────────────────────────────
   *
   * Pendant 900 ms après chacun de ses propres défilements, le composant
   * considère tout mouvement comme le sien — c'est ce qui l'empêche de se
   * prendre lui-même pour un geste de la personne. Et comme il se replace dès
   * que l'écart dépasse 48 px, cette fenêtre se rouvre toutes les cinq
   * secondes environ : **un seul coup de doigt a une chance sur cinq de tomber
   * dedans et de ne rien prouver.**
   *
   * ⚠️ D'où cette boucle plutôt qu'une attente fixe. Elle imite aussi la
   * vérité : quelqu'un dont le défilement est ignoré recommence.
   */
  const avant = (await defilement(page)).haut
  let vue = false
  for (let i = 0; i < 8 && !vue; i++) {
    await page.evaluate(() => scrollBy(0, -500))
    vue = await page
      .locator('[data-suivre-audio]')
      .waitFor({ state: 'visible', timeout: 1_500 })
      .then(() => true)
      .catch(() => false)
  }
  expect(vue, 'la pastille « Suivre la voix » n’apparaît pas après huit coups de doigt').toBe(true)

  // Et il ne revient PAS tout seul : on laisse la voix avancer, le texte reste.
  const fige = (await defilement(page)).haut
  await expect
    .poll(() => page.evaluate(() => document.querySelector('audio').currentTime), { timeout: 15_000 })
    .toBeGreaterThan(0)
  const apres = await defilement(page)
  console.log(JSON.stringify({ avant, fige, apres: apres.haut }, null, 1))

  const griefs = []
  if (Math.abs(apres.haut - fige) > 60)
    griefs.push(`le texte a bougé de ${apres.haut - fige} px alors qu’on avait repris la main`)

  // 🔴 ET LA PASTILLE RAMÈNE. Sans elle, s'arrêter de suivre serait définitif,
  // et il faudrait quitter la page pour retrouver le fil.
  await page.locator('[data-suivre-audio]').click()
  await expect
    .poll(async () => {
      const m = await defilement(page)
      return Math.abs(m.haut - (m.t / m.d) * m.course)
    }, { timeout: 15_000 })
    .toBeLessThan(200)
  if (await page.locator('[data-suivre-audio]').isVisible())
    griefs.push('la pastille reste affichée alors qu’on suit de nouveau')

  expect(griefs, `ce qui cloche :\n  · ${griefs.join('\n  · ')}`).toEqual([])
})
