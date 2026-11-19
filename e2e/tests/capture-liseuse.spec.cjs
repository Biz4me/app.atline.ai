// Deux captures de la liseuse, sur le v2 en ligne. LECTURE SEULE.
//     E2E_BASE=https://v2.atline.ai npx playwright test tests/capture-liseuse.spec.cjs
const { test, expect, suivre, toucher } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

test('captures de la liseuse et de la page audio', async ({ page, pageErrors }) => {
  await page.goto('/parcours/cours', { waitUntil: 'domcontentloaded' })
  const liens = await page.locator('a[href^="/parcours/"]').evaluateAll((a) =>
    a.map((x) => x.getAttribute('href')),
  )
  const versModule = liens.find((h) => /^\/parcours\/[a-z0-9]{10,}$/i.test(h ?? ''))
  expect(versModule).toBeTruthy()

  await page.goto(versModule, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('link', { name: 'Lire' })).toBeVisible({ timeout: 20_000 })
  // 🔴 Une capture prise PENDANT une animation ment autant qu'une mesure.
  const figer = () =>
    page.evaluate(() => {
      document.getAnimations().forEach((a) => {
        try {
          a.finish()
        } catch {}
      })
    })
  await figer()
  await page.screenshot({ path: 'capture-couverture.png' })

  await suivre(page.getByRole('link', { name: 'Lire' }), page, /\/parcours\/[a-z0-9]+\/[a-z0-9]+$/i)
  await expect(page.locator('[data-sommaire]')).toBeVisible({ timeout: 20_000 })
  await figer()
  await page.screenshot({ path: 'capture-liseuse.png' })

  // ── Les options de lecture, et un papier choisi ──
  // ⚠️ `toucher` et non `click` : la fenêtre d'hydratation avale un clic sur
  // un `<button>` de React, et c'est ce qui faisait tomber cette capture.
  await toucher(page.locator('[data-options-lecture]'), page.locator('input.curseur-taille'))
  await figer()
  await page.screenshot({ path: 'capture-options.png' })

  await toucher(page.getByRole('button', { name: 'Sépia' }), page.locator('[data-livre="sepia"]'))
  await figer()
  await page.screenshot({ path: 'capture-sepia.png' })

  // On repose le papier par défaut, puis on referme : la préférence vit dans
  // le navigateur du test et la capture suivante hériterait du sépia.
  await toucher(page.getByRole('button', { name: 'Blanc' }), page.locator('[data-livre="blanc"]'))
  // Le voile porte « Fermer » : c'est le seul bouton de ce nom depuis que le
  // panneau est nu.
  await page.getByRole('button', { name: 'Fermer' }).click()
  await expect(page.locator('input.curseur-taille')).toHaveCount(0, { timeout: 5000 })

  await suivre(page.locator('[data-ecouter]'), page, /\/ecouter$/)
  await expect(page.locator('[data-couverture-lecon]')).toBeVisible({ timeout: 20_000 })
  await figer()
  await page.screenshot({ path: 'capture-audio.png' })

  expect(pageErrors, `exception client : ${pageErrors.join(' · ')}`).toEqual([])
})
