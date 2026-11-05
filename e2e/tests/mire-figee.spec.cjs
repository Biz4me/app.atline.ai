// LA MIRE RESTE DESSINÉE QUAND ELLE NE TOURNE PAS.
//
// ── ⚠️ CE TEST EST NÉ D'UNE FAUSSE ALERTE, ET C'EST POUR ÇA QU'IL RESTE ──
//
// Une capture du 5 novembre 2026 montrait l'écran d'appel SANS sa mire, à
// l'endroit exact où elle était une heure plus tôt. Lecture du code, et une
// hypothèse qui se tenait très bien : `prefers-reduced-motion: reduce` met
// `tourne` à faux, le canevas n'est donc peint QU'UNE FOIS, et son
// `ResizeObserver` le redimensionne — ce qui l'EFFACE — sans le repeindre.
// Tout utilisateur ayant « réduire les animations » aurait vu une mire vide
// dès le premier reflux.
//
// 🔴 MESURÉ : FAUX. La mire survit au redimensionnement sous `reduce`. Le
// défaut était dans la CAPTURE, qui partait avant que le canevas ait peint sa
// première image. On ne corrige donc rien dans l'app — mais la sonde reste,
// parce que l'invariant qu'elle vient d'établir est vrai et vaut d'être tenu.
//
// 🧭 Et parce qu'une hypothèse qui se tient n'est pas une mesure.

const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })

const encre = (page) =>
  page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return { existe: false }
    const ctx = c.getContext('2d')
    const d = ctx.getImageData(0, 0, c.width, c.height).data
    let peints = 0
    for (let i = 3; i < d.length; i += 4) if (d[i] > 8) peints++
    return { existe: true, largeur: c.width, hauteur: c.height, peints }
  })

test('la mire reste peinte après un changement de taille', async ({ page, pageErrors }) => {
  await page.goto('/coach/repeter/appel', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('button', { name: 'Fermer' })).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('canvas')).toBeVisible()

  // On laisse la première image se poser.
  await expect.poll(async () => (await encre(page)).peints, { timeout: 10_000 }).toBeGreaterThan(0)
  const avant = await encre(page)

  // ── LE REFLUX ──
  //
  // ⚠️ EN HAUTEUR, ET C'EST TOUT L'ENJEU DE CETTE SONDE. Premier essai en
  // LARGEUR : elle passait, et ne prouvait rien. La mire fait
  // `min(34vh, 270px)` — changer la largeur ne change pas sa taille, donc
  // l'observateur ne tirait jamais et le chemin soupçonné n'était pas
  // emprunté. 🧭 Un contrôle d'absence ne vaut que si la sonde a d'abord
  // trouvé la chose.
  await page.setViewportSize({ width: 390, height: 600 })
  await page.waitForTimeout(600)
  const apres = await encre(page)

  expect(
    apres.hauteur,
    'le canevas n’a pas changé de taille : la sonde ne prouve rien',
  ).not.toBe(avant.hauteur)

  expect(
    apres.peints,
    `la mire s'est vidée au redimensionnement : ${avant.peints} pixels avant, ${apres.peints} après`,
  ).toBeGreaterThan(0)

  expect(pageErrors, `exceptions JS : ${pageErrors.join(' | ')}`).toHaveLength(0)
})
