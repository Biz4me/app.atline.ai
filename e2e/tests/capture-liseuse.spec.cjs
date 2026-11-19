// Deux captures de la liseuse, sur le v2 en ligne. LECTURE SEULE.
//     E2E_BASE=https://v2.atline.ai npx playwright test tests/capture-liseuse.spec.cjs
const { test, expect, suivre, toucher } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

test('captures de la liseuse et de la page audio', async ({ page, pageErrors }) => {
  await page.goto('/parcours', { waitUntil: 'domcontentloaded' })
  const liens = await page.locator('a[href^="/parcours/"]').evaluateAll((a) =>
    a.map((x) => x.getAttribute('href')),
  )
  const versModule = liens.find((h) => /^\/parcours\/[a-z0-9]{10,}$/i.test(h ?? ''))
  expect(versModule).toBeTruthy()

  // ── L'étagère des onze couvertures, sur le hub ──
  await page.locator('[data-module="1"]').waitFor({ state: 'visible', timeout: 20_000 })
  await page.evaluate(async () => {
    // Les couvertures sont des `background-image` : rien dans le DOM ne dit
    // qu'elles sont arrivées, et une capture prise avant montre des cadres
    // vides. On précharge les trois premières, celles qu'on voit.
    const vues = [...document.querySelectorAll('[data-module]')].slice(0, 3)
    await Promise.all(
      vues.flatMap((el) =>
        [...el.querySelectorAll('[style*="url("]')].map((n) => {
          const url = getComputedStyle(n).backgroundImage.match(/url\("?(.+?)"?\)/)?.[1]
          return url
            ? new Promise((ok) => Object.assign(new Image(), { onload: ok, onerror: ok, src: url }))
            : null
        }),
      ),
    )
  })
  await page.screenshot({ path: 'capture-etagere.png' })

  /**
   * ── ET LA PLANCHE : LES ONZE D'UN COUP ───────────────────────────────────
   *
   * 🔴 L'ÉCRAN N'EN MONTRE QUE DEUX ET DEMIE, et c'est la vérité de l'usage.
   * Mais depuis que la rangée met le prochain module en tête, **les modules
   * terminés partent au bout** : leur bandeau « Terminé » n'est jamais dans le
   * cadre de la capture d'au-dessus. On ne peut donc plus vérifier sur elle ce
   * qu'on vient de changer.
   *
   * On replie la même rangée sur plusieurs lignes, sans rien changer d'autre —
   * même cellule, même surface, mêmes 146 px, même bandeau. ⚠️ Ce que cette
   * image ne prouve PAS : ce qu'on voit en arrivant sur l'écran.
   */
  const rangee = page.locator('[data-module="1"]').locator('xpath=ancestor::ul')
  await rangee.evaluate(async (ul) => {
    ul.style.flexWrap = 'wrap'
    ul.style.overflowX = 'visible'
    ul.style.rowGap = '16px'
    // Repliée, la rangée passe derrière l'en-tête et la barre du bas.
    for (const n of document.querySelectorAll('body *')) {
      const p = getComputedStyle(n).position
      if ((p === 'fixed' || p === 'sticky') && !n.contains(ul)) n.style.visibility = 'hidden'
    }
    // Les onze images sont en `loading="lazy"` : celles du bas ne sont pas
    // encore demandées, et une capture prise maintenant montrerait des trous.
    await Promise.all(
      [...ul.querySelectorAll('img')].map((i) =>
        i.complete ? null : new Promise((ok) => Object.assign(i, { onload: ok, onerror: ok })),
      ),
    )
  })
  await rangee.screenshot({ path: 'capture-planche.png' })

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
  /**
   * 🔴 ON ATTEND QUE LA COUVERTURE SOIT VRAIMENT CHARGÉE. Elle est posée en
   * `background-image` : rien dans le DOM ne dit qu'elle est arrivée, et une
   * capture prise avant montre un grand rectangle vide — ce qui ressemble
   * exactement à un défaut d'affichage. On la précharge donc à la main.
   */
  await page.evaluate(async () => {
    const el = document.querySelector('[data-couverture-module]')
    const url = el && getComputedStyle(el).backgroundImage.match(/url\("?(.+?)"?\)/)?.[1]
    if (url) await new Promise((ok) => Object.assign(new Image(), { onload: ok, onerror: ok, src: url }))
  })
  await figer()
  await page.screenshot({ path: 'capture-couverture.png' })
  await page.screenshot({ path: 'capture-module-entier.png', fullPage: true })

  // ⚠️ Une capture PLEINE PAGE pose les barres fixes au milieu du contenu :
  // c'est un artefact du navigateur, pas un défaut de la page. La rangée des
  // deux cartes se regarde donc dans une vue normale, défilée jusqu'à elle.
  // ⚠️ `scrollIntoViewIfNeeded` ne bouge PAS ici : le navigateur juge le lien
  // déjà visible alors qu'il est couvert par la rangée d'action fixe. On
  // défile donc nous-mêmes.
  await page.mouse.wheel(0, 460)
  /**
   * 🔴 ET ON ATTEND QUE LE DÉFILEMENT SE POSE. Une capture prise pendant un
   * défilement fluide montre l'en-tête collant au milieu d'un grand vide
   * noir — ce qui ressemble à une mise en page cassée alors que rien ne l'est.
   * `figer()` ne suffit pas : un défilement n'est pas une animation au sens du
   * navigateur, il n'apparaît pas dans `document.getAnimations()`.
   */
  await page.waitForFunction(() => {
    const y = window.scrollY
    return new Promise((ok) => requestAnimationFrame(() => ok(window.scrollY === y)))
  })
  await figer()
  await page.screenshot({ path: 'capture-avant-apres.png' })

  // ── La carte mentale ──
  const versCarte = page.getByRole('link', { name: /Carte mentale/ })
  if (await versCarte.count()) {
    await suivre(versCarte, page, /\/carte$/)
    await expect(page.getByText('Perspective clé 1')).toBeVisible({ timeout: 20_000 })
    await figer()
    await page.screenshot({ path: 'capture-carte.png', fullPage: true })
    await page.goBack()
    await expect(page.getByRole('link', { name: 'Lire' })).toBeVisible({ timeout: 20_000 })
  }

  await suivre(page.getByRole('link', { name: 'Lire' }), page, /\/parcours\/[a-z0-9]+\/[a-z0-9]+$/i)
  await expect(page.locator('[data-sommaire]')).toBeVisible({ timeout: 20_000 })
  await figer()
  await page.screenshot({ path: 'capture-liseuse.png' })

  // ── Les trois points ──
  await toucher(
    page.locator('[data-menu-lecture]'),
    page.getByRole('button', { name: 'Partager' }),
  )
  await figer()
  await page.screenshot({ path: 'capture-menu.png' })
  await page.getByRole('button', { name: 'Fermer' }).click()
  await expect(page.getByRole('button', { name: 'Partager' })).toHaveCount(0, { timeout: 5000 })

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
