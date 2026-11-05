// L'ANTICHAMBRE DE RÉPÉTER, ET LE MENU DE L'ÉCRAN.
//
//   E2E_BASE=https://v2.atline.ai E2E_COMME=humanstring@gmail.com \
//     npx playwright test tests/antichambre-repeter.spec.cjs
//
// 🔴 Ce que ce test cherche, et qu'une assertion de présence ne trouverait pas :
//
//   1. que le conteneur fixe porte EXACTEMENT deux commandes — le menu et le
//      geste — et que le geste est réellement touchable, pas seulement
//      « visible » ;
//   2. que le menu ne redouble AUCUNE destination de la barre du bas. C'était
//      la faute du menu global supprimé le 5 novembre : deux gestes différents
//      menant au même endroit sans qu'on sache lequel était le bon ;
//   3. 🔴 QUE L'ANTICHAMBRE ET L'APPEL ANNONCENT LE MÊME ASK. C'est le seul
//      contrôle qui attrape la dérive que `lib/repetition.ts` existe pour
//      empêcher : le briefing disant « obtenir un rendez-vous » et Aria jouant
//      autre chose. Deux copies du calcul auraient passé tous les autres
//      contrôles de ce fichier ;
//   4. que fermer l'appel remonte à l'ANTICHAMBRE et pas à l'accueil — sinon
//      un second essai demande de refaire tout le chemin ;
//   5. qu'aucun « N sur 100 » ne se contredit entre la page et le menu.

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

const DESTINATIONS = ['/accueil', '/parcours', '/coach/repeter', '/agenda', '/gens']

test('l’antichambre a la coquille, son geste et son menu', async ({ page, pageErrors }) => {
  await page.goto('/coach/repeter', { waitUntil: 'domcontentloaded' })

  // ── 1. c'est un LIEU, pas une porte à sens unique ──────────────────────
  await expect(page.getByRole('heading', { level: 1, name: 'Répéter' })).toBeVisible({
    timeout: 20_000,
  })
  const barre = page.getByRole('navigation', { name: /Navigation principale/ })
  await expect(barre).toBeVisible()
  await expect(barre.locator('[aria-current="page"]')).toHaveText(/Répéter/)
  // ⚠️ Un seul h1. Deux titres sur une page, c'est la faute déjà payée sur
  // les leçons — et elle ne se voit pas à l'écran.
  await expect(page.locator('h1')).toHaveCount(1)

  // ── 2. le conteneur fixe : deux commandes, et le geste est TOUCHABLE ───
  const appeler = page.getByRole('link', { name: 'Appeler', exact: true })
  await expect(appeler).toHaveCount(1)
  await expect(appeler).toHaveAttribute('href', /\/coach\/repeter\/appel/)

  const bas = appeler.locator('xpath=..')
  await expect(bas.getByRole('link')).toHaveCount(1)
  const menuBouton = bas.getByRole('button', { name: /^Menu Répéter$/ })
  await expect(menuBouton).toHaveCount(1)
  await expect(bas.getByRole('button')).toHaveCount(1)

  // 🔴 `toBeVisible` NE DÉTECTE PAS L'OCCLUSION : un bouton recouvert par la
  // barre du bas reste « visible ». Seul un clic à blanc le dit.
  await poser(page)
  await appeler.click({ trial: true })
  await menuBouton.click({ trial: true })

  // Les deux côte à côte, sur la même rangée, et dans cet ordre : le menu à
  // gauche, le geste à droite.
  const cadreMenu = await menuBouton.boundingBox()
  const cadreGeste = await appeler.boundingBox()
  expect(cadreMenu.x + cadreMenu.width, 'le menu doit être À GAUCHE du geste').toBeLessThanOrEqual(
    cadreGeste.x + 1,
  )
  expect(
    Math.abs(cadreMenu.y + cadreMenu.height / 2 - (cadreGeste.y + cadreGeste.height / 2)),
    'menu et geste sur la même rangée',
  ).toBeLessThanOrEqual(1)

  await page.screenshot({ path: 'capture-antichambre.png', animations: 'disabled' })

  // ── 3. le briefing dit l'ASK, et la page ne redouble pas le geste ──────
  const corps = page.locator('main')
  const texteAvant = await corps.innerText()
  // ⚠️ `/i` PARTOUT OÙ UN LIBELLÉ EST UN SURTITRE. `innerText` applique
  // `text-transform`, donc « La situation » revient « LA SITUATION » — le
  // piège de `references/pieges.md`, dans lequel je suis retombé en écrivant
  // ce fichier. Un contrôle sensible à la casse ne mesure pas le texte, il
  // mesure la feuille de style.
  expect(texteAvant).toMatch(/Réussi si/)
  expect(texteAvant).toMatch(/La situation/i)
  // Le geste du bas n'a pas de jumeau dans la page.
  await expect(corps.getByRole('link', { name: /Appeler/ })).toHaveCount(0)

  // ── 4. LE MENU ─────────────────────────────────────────────────────────
  await menuBouton.click()
  const feuille = page.getByRole('dialog', { name: 'Répéter' })
  await expect(feuille).toBeVisible({ timeout: 10_000 })
  await poser(page)
  await page.screenshot({ path: 'capture-menu-repeter.png', animations: 'disabled' })
  const texteMenu = await feuille.innerText()
  expect(texteMenu, 'le menu porte les deux choses nommées').toMatch(/Où tu en es/i)
  expect(texteMenu).toMatch(/Sur quoi t[’']entraîner/i)

  // 🔴 AUCUNE DESTINATION DE LA BARRE DANS LE MENU. Sauf `/coach/repeter`
  // lui-même, que les choix d'appel portent légitimement : ils reviennent ici
  // avec un paramètre, ils ne mènent pas ailleurs.
  const liens = await feuille.getByRole('link').evaluateAll((as) =>
    as.map((a) => a.getAttribute('href')),
  )
  expect(liens.length, 'un menu vide ne s’ouvre pas').toBeGreaterThan(0)
  for (const href of liens) {
    expect(href, `${href} : le menu redouble la barre du bas`).toMatch(/^\/coach\/repeter\?appel=/)
  }

  // Aucun chiffre ne se contredit entre la page et le menu.
  const notes = [...(texteAvant + '\n' + texteMenu).matchAll(/(\d+)\s+sur\s+100/g)].map((m) => m[1])
  expect(new Set(notes).size, `« N sur 100 » dit ${notes.join(' et ')}`).toBeLessThanOrEqual(1)

  // ── 5. choisir un appel ramène ICI, avec le choix marqué ───────────────
  //
  // ⚠️ On prend un appel QU'ON N'A PAS DÉJÀ : cliquer celui qui est marqué
  // « Choisi » ne prouverait rien — l'écran reviendrait identique et le test
  // passerait sans que le choix ait jamais circulé.
  const tous = feuille.getByRole('link')
  const textes = await tous.allInnerTexts()
  const rang = textes.findIndex((t) => !/choisi/i.test(t))
  expect(rang, 'tous les appels sont marqués « Choisi »').toBeGreaterThanOrEqual(0)
  const choix = tous.nth(rang)
  const titreChoisi = textes[rang].split('\n')[0].trim()
  await choix.click()
  await expect(page.getByRole('heading', { level: 1, name: 'Répéter' })).toBeVisible({
    timeout: 20_000,
  })
  await expect(page).toHaveURL(/\/coach\/repeter\?appel=/)

  // 🔴 ET LA FEUILLE S'EST REFERMÉE. Elle restait ouverte jusqu'au 5 novembre
  // 2026 : la navigation ne changeant que la requête, React gardait l'état du
  // composant. Le briefing se mettait à jour DERRIÈRE le panneau, voile modal
  // compris, et le geste suivant était hors d'atteinte. Un contrôle de
  // présence sur la nouvelle page ne l'aurait jamais vu — `main` se lit très
  // bien sous une feuille.
  await expect(feuille).toHaveCount(0)

  const texteApres = await page.locator('main').innerText()
  expect(texteApres, `« ${titreChoisi} » choisi mais pas annoncé`).toContain(titreChoisi)

  // 🔴 ET UN SEUL « Choisi » dans le menu. Deux marques voudraient dire que le
  // serveur et l'URL ne tombent pas d'accord sur l'appel courant.
  await page.getByRole('button', { name: /^Menu Répéter$/ }).click()
  await expect(
    page.getByRole('dialog', { name: 'Répéter' }).getByText(/^choisi$/i),
  ).toHaveCount(1)

  expect(pageErrors, `exceptions JS : ${pageErrors.join(' | ')}`).toHaveLength(0)
})

test('l’antichambre et l’appel ne peuvent pas se contredire', async ({ page, pageErrors }) => {
  // 🔴 LE CONTRÔLE QUI JUSTIFIE `lib/repetition.ts`. La règle qui choisit
  // l'exercice est subtile — un choix explicite l'emporte sur le point faible
  // — et elle vit désormais dans UNE fonction que les deux écrans appellent.
  // Recopiée, elle aurait dérivé : l'antichambre annonçant « pour travailler
  // objections » et Aria jouant l'invitation. Rien, côté build, ne l'aurait dit.
  await page.goto('/coach/repeter', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { level: 1, name: 'Répéter' })).toBeVisible({
    timeout: 20_000,
  })

  const brief = await page.locator('main').innerText()

  await page.getByRole('link', { name: 'Appeler', exact: true }).click()
  await expect(page).toHaveURL(/\/coach\/repeter\/appel/, { timeout: 20_000 })

  const sortie = page.getByRole('button', { name: 'Fermer' })
  await expect(sortie).toBeVisible({ timeout: 20_000 })
  const dansLAppel = await page.locator('main').innerText()

  // L'appel ne garde QUE l'ask : plus de briefing par-dessus la mire.
  expect(dansLAppel, 'le briefing ne doit pas se rejouer dans l’appel').not.toMatch(/Réussi si/i)
  expect(dansLAppel).not.toMatch(/La situation/i)
  expect(dansLAppel).toMatch(/Touche la mire pour commencer/i)

  // ⚠️ L'ask de l'antichambre se retrouve mot pour mot dans l'appel. C'est
  // la même donnée, lue par la même fonction : si les deux écrans divergent,
  // cette ligne tombe.
  const ask = brief
    .split('\n')
    .map((l) => l.trim())
    .find((l) => dansLAppel.includes(l) && l.length > 12)
  expect(ask, `aucune phrase commune entre le briefing et l’appel`).toBeTruthy()

  // ── Fermer remonte à l'ANTICHAMBRE, pas à l'accueil ───────────────────
  await sortie.click()
  await expect(page).toHaveURL(/\/coach\/repeter(\?|$)/, { timeout: 20_000 })
  await expect(page.getByRole('heading', { level: 1, name: 'Répéter' })).toBeVisible()

  expect(pageErrors, `exceptions JS : ${pageErrors.join(' | ')}`).toHaveLength(0)
})
