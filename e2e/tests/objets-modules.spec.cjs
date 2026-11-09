// LES ONZE OBJETS DES MODULES.
//
//   E2E_BASE=https://v2.atline.ai E2E_COMME=humanstring@gmail.com \
//     npx playwright test tests/objets-modules.spec.cjs

const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

test('chacun des onze modules porte SON objet, et l’image arrive vraiment', async ({
  page,
  pageErrors,
}) => {
  await page.goto('/parcours/cours', { waitUntil: 'domcontentloaded' })
  const liens = page.locator('main a[href^="/parcours/"]')
  await expect(liens.first()).toBeVisible({ timeout: 20_000 })

  const adresses = await liens.evaluateAll((n) =>
    [...new Set(n.map((e) => e.getAttribute('href')).filter((h) => /^\/parcours\/[a-z0-9]+$/.test(h)))],
  )
  // 🔴 CE QU'ON ATTEND, DÉCLARÉ. Sans ce compte, une liste vide ferait une
  // boucle qui ne tourne pas et un test vert qui n'a rien regardé.
  expect(adresses, 'la liste ne donne pas onze modules').toHaveLength(11)

  const vus = new Set()
  for (const adresse of adresses) {
    await page.goto(adresse, { waitUntil: 'domcontentloaded' })
    const objet = page.locator('[data-objet-module]')
    await expect(objet).toBeVisible({ timeout: 20_000 })

    /**
     * 🔴 `naturalWidth`, PAS `toBeVisible`. Une image absente du serveur rend
     * une icône cassée que Playwright voit comme un élément parfaitement
     * visible : le contrôle passerait au vert sur onze 404. `naturalWidth`
     * ne vaut autre chose que zéro que si les octets sont arrivés et ont été
     * décodés.
     */
    // ⚠️ ATTENDRE LA FIN DU CHARGEMENT, pas la présence de la balise.
    // `toBeVisible` passe dès que l'élément est dans la page, image comprise
    // non encore décodée. L'attente ne masque rien : un 404 rend `complete`
    // vrai lui aussi, avec une largeur nulle — c'est le contrôle d'après qui
    // tranche.
    await expect
      .poll(() => objet.evaluate((e) => e.complete), { timeout: 20_000 })
      .toBe(true)

    const etat = await objet.evaluate((e) => ({
      numero: e.getAttribute('data-objet-module'),
      src: e.getAttribute('src'),
      largeur: e.naturalWidth,
      hauteur: e.naturalHeight,
      complet: e.complete,
    }))
    expect(etat.complet, `${adresse} : ${etat.src} n'a pas fini de charger`).toBe(true)
    expect(etat.largeur, `${adresse} : ${etat.src} n'a pas chargé (404 ?)`).toBeGreaterThan(0)
    // Carrées, toutes : c'est ce qui fait tenir la famille.
    expect(etat.largeur).toBe(etat.hauteur)

    // ⚠️ ET CHAQUE MODULE A LE SIEN. Une erreur d'un caractère dans le nom de
    // fichier donnerait onze fois la même image — toutes chargées, toutes
    // vertes, et personne ne le verrait.
    expect(etat.src).toContain(`/modules/m${String(etat.numero).padStart(2, '0')}.`)
    expect(vus.has(etat.src), `${etat.src} servi deux fois`).toBe(false)
    vus.add(etat.src)
  }

  expect(vus.size, 'onze objets distincts attendus').toBe(11)
  expect(pageErrors, `exception client : ${pageErrors.join(' · ')}`).toHaveLength(0)
})

test('la liste des modules, elle, n’en porte aucun', async ({ page }) => {
  // 🧭 Décidé sur mesure : la carte de la liste offre `W − 100` px au titre,
  // et un objet lisible y ferait passer un titre de 64 caractères à quatre
  // lignes. Ce contrôle empêche de l'y remettre par inadvertance — et il sait
  // voir la chose, puisque le test au-dessus la trouve sur l'écran du module.
  await page.goto('/parcours/cours', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('main a[href^="/parcours/"]').first()).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('[data-objet-module]')).toHaveCount(0)
})
