// MESURE : la dernière ligne de la feuille passe-t-elle sous la barre ?
//
// 🔴 Une capture a montré « Forever Living » coupé par la barre du bas. Avant
// de corriger, on mesure les deux boîtes : si le bas de la dernière ligne est
// PLUS BAS que le haut de la barre, elle est recouverte.
//
//   E2E_BASE=https://v2.atline.ai E2E_COMME=test1@gmail.com \
//     npx playwright test tests/mesure-feuille.spec.cjs

const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

test('la dernière ligne de la feuille reste au-dessus de la barre', async ({ page }) => {
  await page.goto('/accueil', { waitUntil: 'domcontentloaded' })

  const bande = page.getByRole('button', { name: /Changer d’activité|Changer d'activité/ })
  await expect(bande).toBeVisible({ timeout: 20_000 })
  await bande.click()

  const feuille = page.getByRole('dialog', { name: /Où tu travailles/ })
  await expect(feuille).toBeVisible({ timeout: 10_000 })

  // 🔴 ON TERMINE LES ANIMATIONS AVANT DE MESURER. La feuille monte en
  // 0,24 s ; mesurée pendant, elle paraît déborder de l'écran — j'ai failli
  // corriger un défaut qui n'existait pas. Même cause que la capture floue.
  await page.evaluate(() =>
    // 🔴 `finish()` LANCE sur une animation INFINIE (« Cannot finish
    // Animation with an infinite target effect end ») — un pouls, un
    // chargeur. On ne peut donc pas la terminer : on l'ignore, elle ne
    // déplace rien. Ce sont les transitions BORNÉES qui faussent une mesure.
    document.getAnimations().forEach((a) => {
      try {
        a.finish()
      } catch {}
    }),
  )

  const derniere = feuille.getByRole('button').filter({ hasText: 'Forever Living' })
  await expect(derniere).toBeVisible()

  const [b1, b2, b3] = await Promise.all([
    derniere.boundingBox(),
    page.getByRole('navigation', { name: /Navigation principale/ }).boundingBox(),
    feuille.boundingBox(),
  ])

  console.log('\n  feuille      : haut %d  bas %d  hauteur %d', Math.round(b3.y), Math.round(b3.y + b3.height), Math.round(b3.height))
  console.log('  dernière ligne : haut %d  bas %d', Math.round(b1.y), Math.round(b1.y + b1.height))
  console.log('  barre du bas   : haut %d', Math.round(b2.y))
  console.log('  recouvrement   : %d px\n', Math.round(b1.y + b1.height - b2.y))

  // Le bas de la dernière ligne doit rester au-dessus du haut de la barre.
  expect(Math.round(b1.y + b1.height)).toBeLessThanOrEqual(Math.round(b2.y))
})
