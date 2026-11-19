// Lancer :
//     cd app.atline.ai/e2e
//     E2E_BASE=https://v2.atline.ai npx playwright test tests/liseuse-v2.spec.cjs
//
// ── 🔴 CE QUE CETTE SONDE TIENT ───────────────────────────────────────────
//
// La liseuse (19 novembre 2026) est une grammaire relevée sur Bookey, et trois
// de ses pièces ne se vérifient PAS toutes seules :
//
//   · la barre du bas porte TROIS cases — options, sommaire, écouteur. Elles
//     ont vécu un jour en haut à droite, posées là faute d'avoir les captures ;
//   · l'écouteur et le livre ouvert sont UNE BASCULE, pas deux boutons : ils
//     occupent la même case, et c'est la place qui fait le réflexe ;
//   · le chevron de retour est un VRAI lien vers la couverture. S'il devenait
//     un retour d'historique, le feuilletage le ferait refaire les leçons une
//     par une — et il marcherait quand même, ce qui est le pire des cas.
const { test, expect, suivre, toucher } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

/** La première leçon atteignable, en passant par où passe un distributeur. */
async function ouvrirUneLecon(page) {
  await page.goto('/parcours', { waitUntil: 'domcontentloaded' })

  /**
   * 🔴 ON NE CODE EN DUR AUCUN IDENTIFIANT. Les onze modules et leurs 71
   * leçons portent des `cuid` qui n'ont aucune raison de survivre à une
   * réimportation — une sonde qui en grave un échouerait un jour en annonçant
   * une panne de la liseuse, qui n'aurait rien à voir.
   */
  const liens = await page.locator('a[href^="/parcours/"]').evaluateAll((a) =>
    a.map((x) => x.getAttribute('href')),
  )
  const versModule = liens.find((h) => /^\/parcours\/[a-z0-9]{10,}$/i.test(h ?? ''))
  expect(versModule, 'aucun module publié : la sonde ne prouverait rien').toBeTruthy()

  await page.goto(versModule, { waitUntil: 'domcontentloaded' })

  // « Lire » est l'un des deux boutons du bas de la couverture, relevés sur la
  // capture 556 : Écouter à gauche, Lire à droite.
  const lire = page.getByRole('link', { name: 'Lire' })
  await expect(lire, 'le couple Écouter | Lire manque sur la couverture').toBeVisible({
    timeout: 20_000,
  })
  await suivre(lire, page, /\/parcours\/[a-z0-9]+\/[a-z0-9]+$/i)
  return versModule
}

test('la barre du bas porte ses trois cases, et le chevron est un vrai lien', async ({
  page,
  pageErrors,
}) => {
  const versModule = await ouvrirUneLecon(page)

  /**
   * 🔴 LES TROIS, ET PAS « AU MOINS UNE ». C'est exactement ce qui manquait
   * quand le sommaire et les options vivaient en haut à droite : chacun pris
   * séparément était visible, et la BARRE n'existait pas.
   */
  await expect(page.locator('[data-options-lecture]')).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('[data-sommaire]')).toBeVisible()
  await expect(page.locator('[data-ecouter]')).toBeVisible()

  /**
   * 🔴 LE CHEVRON PORTE L'ADRESSE DE LA COUVERTURE. S'il devenait un retour
   * d'historique, il ramènerait à la leçon précédente après un feuilletage —
   * et rien ne le dirait, parce qu'il marcherait très bien dans le cas simple
   * où l'on vient justement de la couverture.
   */
  const chevron = page.locator('header a[aria-label^="Retour au module"]')
  await expect(chevron).toHaveAttribute('href', versModule)

  expect(pageErrors, `exception client : ${pageErrors.join(' · ')}`).toEqual([])
})

test('l’écouteur et le livre sont une bascule, à la même place', async ({ page, pageErrors }) => {
  await ouvrirUneLecon(page)
  const lecon = page.url()

  // ── Vers l'audio ──
  await suivre(page.locator('[data-ecouter]'), page, /\/ecouter$/)

  /**
   * 🔴 LA PAGE AUDIO N'A PAS LE TEXTE DE LA LEÇON, et elle a la couverture du
   * module. C'est la demande, mot pour mot : « page avec lecteur et couverture
   * de leçons sans le texte de la leçon ».
   */
  await expect(page.locator('[data-couverture-lecon]')).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('[data-fin-de-lecon]')).toHaveCount(0)

  // ── Et retour, par la MÊME case ──
  const retourLire = page.locator('[data-lire]')
  await expect(retourLire, 'la bascule ne revient pas').toBeVisible()
  await suivre(retourLire, page, /\/parcours\/[a-z0-9]+\/[a-z0-9]+$/i)
  expect(page.url(), 'la bascule ne ramène pas sur la même leçon').toBe(lecon)

  expect(pageErrors, `exception client : ${pageErrors.join(' · ')}`).toEqual([])
})

test('les trois points portent Partager et Marquer comme terminé', async ({
  page,
  pageErrors,
}) => {
  await ouvrirUneLecon(page)

  await toucher(
    page.locator('[data-menu-lecture]'),
    page.locator('[data-menu-lecture][aria-expanded="true"]'),
  )

  await expect(page.getByRole('button', { name: 'Partager' })).toBeVisible({ timeout: 10_000 })
  /**
   * ⚠️ LE LIBELLÉ DÉPEND DE L'ÉTAT, et c'est voulu : une leçon déjà lue dit
   * « Déjà marquée », parce qu'un bouton qui refait ce qui est fait laisse
   * croire qu'il n'a pas marché la première fois. La sonde accepte les deux —
   * elle vérifie que l'entrée EXISTE, pas l'avancement du compte de test.
   */
  await expect(
    page.getByRole('button', { name: /Marquer comme terminé|Déjà marquée/ }),
  ).toBeVisible()

  /**
   * 🔴 ET AUCUNE ENTRÉE DE BIBLIOTHÈQUE. Bookey en a deux — « Télécharger »
   * et « Enregistrer dans la bibliothèque » — qui supposent des livres qu'on
   * collectionne. Les recopier ferait deux rangées incapables d'agir, et
   * c'est exactement le genre de fidélité qui se paie en boutons morts.
   */
  await expect(page.getByRole('button', { name: /bibliothèque/i })).toHaveCount(0)

  expect(pageErrors, `exception client : ${pageErrors.join(' · ')}`).toEqual([])
})

test('le sommaire et les options s’ouvrent', async ({ page, pageErrors }) => {
  await ouvrirUneLecon(page)

  /**
   * ⚠️ ON MESURE `aria-expanded` ET NON LE CONTENU DE LA FEUILLE. Ce qu'on
   * veut prouver ici, c'est que React a ENTENDU le geste — c'est la fenêtre
   * d'hydratation que tout ce harnais existe pour attraper. Le contenu de la
   * feuille appartient à `Feuille`, qui est partagée par tout V2 et vérifiée
   * ailleurs.
   */
  const sommaire = page.locator('[data-sommaire]')
  await toucher(sommaire, page.locator('[data-sommaire][aria-expanded="true"]'))

  // On referme en touchant la ligne de la leçon courante : c'est le seul geste
  // que cette ligne propose, et il est voulu.
  await page.keyboard.press('Escape').catch(() => {})
  await page.goto(page.url(), { waitUntil: 'domcontentloaded' })

  const options = page.locator('[data-options-lecture]')
  await toucher(options, page.locator('[data-options-lecture][aria-expanded="true"]'))

  expect(pageErrors, `exception client : ${pageErrors.join(' · ')}`).toEqual([])
})
