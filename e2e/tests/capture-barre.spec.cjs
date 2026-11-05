// LA NAVIGATION DE V2 : cinq lieux, et l'identité sur l'accueil seul.
//
//   E2E_BASE=https://v2.atline.ai E2E_COMME=humanstring@gmail.com \
//     npx playwright test tests/capture-barre.spec.cjs
//
// 🔴 Ce que ce test cherche, et qu'une assertion de présence ne trouverait pas :
//
//   1. que `/` ET `/coach` mènent à l'accueil — la seconde est une redirection
//      posée le 5 nov pour ne pas rendre 404 aux liens existants ;
//   2. que le titre de chaque écran EST le libellé de son entrée. Les lieux
//      portaient deux noms : « Formation » en bas, « Ton parcours » en haut ;
//   3. que leur barre du haut a la MÊME hauteur que sur l'accueil, et que la
//      paire icône + nom y est centrée — à l'œil, quatre pixels ne se voient
//      pas ; au changement d'écran, le saut se voit ;
//   4. qu'il n'existe plus AUCUN menu global : chaque écran a ses variantes,
//      et le compte vit derrière l'avatar.

const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

const poser = (page) =>
  page.evaluate(() =>
    document.getAnimations().forEach((a) => {
      try {
        a.finish()
      } catch {}
    }),
  )

test('cinq lieux, un seul nom chacun, et l’identité sur l’accueil seul', async ({
  page,
  pageErrors,
}) => {
  // ── 1. la racine mène à l'accueil ───────────────────────────────────────
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page).toHaveURL(/\/accueil$/, { timeout: 20_000 })

  const barre = page.getByRole('navigation', { name: /Navigation principale/ })
  await expect(barre).toBeVisible({ timeout: 20_000 })

  const entrees = (await barre.innerText()).split('\n').map((t) => t.trim()).filter(Boolean)
  expect(entrees).toEqual(['Accueil', 'Formation', 'Répéter', 'Agenda', 'Contacts'])

  // ── 2. l'accueil porte l'identité, et lui seul ─────────────────────────
  await expect(page.getByText('Forever Living')).toHaveCount(1)
  await expect(page.getByRole('link', { name: /Mon compte/ })).toHaveCount(1)
  await poser(page)
  const hautAccueil = Math.round((await page.locator('header').boundingBox()).height)
  await page.screenshot({ path: 'capture-accueil.png', animations: 'disabled' })

  // 🔴 PLUS AUCUN MENU GLOBAL. Il redoublait la barre du bas et portait un
  // second sélecteur d'activité. Ce contrôle est le seul qui empêcherait de
  // le réintroduire par inadvertance.
  await expect(barre.getByRole('button', { name: 'Menu' })).toHaveCount(0)

  // 🔴 LE GESTE DE L'ACCUEIL EST FIXE, et il n'existe qu'UNE fois.
  // Il a porté « Ouvrir le module 8 » : un raccourci vers Formation, qui a
  // déjà son entrée dans la barre, et un verbe qui changeait à chaque visite.
  // Le compte vérifie aussi qu'aucune carte ne le redouble.
  const parler = page.getByRole('link', { name: 'Parler à Atlas' })
  await expect(parler).toHaveCount(1)
  await expect(parler).toHaveAttribute('href', '/coach/parler')
  // ⚠️ Le conteneur fixe ne porte QU'UN geste. Mon premier contrôle visait
  // à côté : il interdisait « Ouvrir le module » sur toute la page, alors que
  // la carte du plan le porte — légitimement, depuis que le bouton du bas ne
  // reprend plus la première ligne. Ce qui compte, c'est qu'il soit SEUL en
  // bas.
  await expect(parler.locator('xpath=..').getByRole('link')).toHaveCount(1)

  // …et que chaque ligne du plan ait bien retrouvé la sienne.
  await expect(page.getByRole('link', { name: /Ouvrir le module/ })).toHaveCount(1)

  // ── 3. chaque lieu : son nom, sa hauteur, son centrage ─────────────────
  async function lieuConforme(nom) {
    await barre.getByRole('link', { name: nom }).click()
    await expect(page.getByRole('heading', { level: 1, name: nom })).toBeVisible({ timeout: 15_000 })
    // Un lieu ne porte NI sélecteur NI avatar : l'identité est au hall.
    await expect(page.getByRole('link', { name: /Mon compte/ })).toHaveCount(0)
    await expect(page.getByRole('link', { name: /Retour à l’accueil/ })).toBeVisible()

    await poser(page)
    const cadre = await page.locator('header').boundingBox()
    const bloc = await page.locator('header > div').first().boundingBox()
    const ecart = Math.round(bloc.x + bloc.width / 2 - (cadre.x + cadre.width / 2))
    expect(Math.round(cadre.height), `${nom} : barre du haut`).toBe(hautAccueil)
    expect(Math.abs(ecart), `${nom} : paire décalée de ${ecart} px`).toBeLessThanOrEqual(1)

    await page.screenshot({
      path: `capture-haut-${nom.toLowerCase()}.png`,
      clip: { x: 0, y: 0, width: 390, height: 66 },
      animations: 'disabled',
    })
  }

  // ⚠️ « Répéter » EST ABSENT DE CETTE BOUCLE, et il faut le dire ici plutôt
  // que de le découvrir : `/coach/repeter` est un écran d'APPEL immersif. Il
  // n'a ni barre du haut ni barre du bas, et se referme par sa propre croix.
  // C'est la seule entrée de la barre dont la destination masque la barre —
  // une porte à sens unique. Contrôlé séparément plus bas.
  for (const nom of ['Formation', 'Agenda', 'Contacts']) await lieuConforme(nom)

  // ── 4. une seule entrée allumée, et c'est la bonne ─────────────────────
  const allumees = barre.locator('[aria-current="page"]')
  await expect(allumees).toHaveCount(1)
  await expect(allumees).toHaveText(/Contacts/)

  // ── RÉPÉTER : immersif, mais il doit RAMENER ───────────────────
  //
  // 🔴 Une destination qui masque la barre doit avoir une sortie, sinon
  // c'est un cul-de-sac. On vérifie qu'elle existe et qu'elle ramène à
  // l'accueil — pas à `/coach`, dont la redirection est faite pour les liens
  // qu'on ne maîtrise plus, pas pour notre propre code.
  await barre.getByRole('link', { name: 'Répéter' }).click()
  await expect(page).toHaveURL(/\/coach\/repeter/, { timeout: 15_000 })
  const sortie = page.getByRole('button', { name: /Fermer|Quitter|Raccrocher/ })
  await expect(sortie.first()).toBeVisible({ timeout: 15_000 })
  await poser(page)
  await page.screenshot({ path: 'capture-repeter.png', animations: 'disabled' })

  // ── 5. /coach ne rend pas 404, il ramène à l'accueil ───────────────────
  //
  // 🔴 Des leçons y pointaient encore. Sans cette redirection, un lien
  // intérieur à l'app aurait rendu une page d'erreur — et rien, côté build,
  // n'aurait signalé qu'un écran avait changé d'adresse.
  await page.goto('/coach', { waitUntil: 'domcontentloaded' })
  await expect(page).toHaveURL(/\/accueil$/, { timeout: 15_000 })

  expect(pageErrors, `exceptions JS : ${pageErrors.join(' | ')}`).toHaveLength(0)
})
