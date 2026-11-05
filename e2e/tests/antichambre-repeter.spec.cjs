// L'ANTICHAMBRE DE RÉPÉTER, SON MENU, ET SES DEUX PLEINES PAGES.
//
//   E2E_BASE=https://v2.atline.ai E2E_COMME=humanstring@gmail.com \
//     npx playwright test tests/antichambre-repeter.spec.cjs
//
// 🔴 Ce que ces tests cherchent, et qu'une assertion de présence ne trouverait
// pas :
//
//   1. que le geste du jour RESTE allumé et touchable pendant que le menu est
//      ouvert. C'est tout le point de la référence : on ne referme pas pour
//      reprendre le chemin par défaut. `toBeVisible` ne le dirait pas — un
//      bouton sous un voile modal reste « visible » ;
//   2. que le menu ne porte que des TITRES, et qu'aucun ne redouble une
//      destination de la barre du bas. C'était la faute du menu global
//      supprimé le 5 novembre : deux gestes menant au même endroit ;
//   3. que les détours sont de PLEINES PAGES — pas de barre du bas, une
//      flèche pour seule sortie, et pas de geste dominant qui flotterait au
//      -dessus d'une barre absente ;
//   4. 🔴 QUE L'ANTICHAMBRE ET L'APPEL ANNONCENT LE MÊME ASK. C'est le seul
//      contrôle qui attrape la dérive que `lib/repetition.ts` existe pour
//      empêcher ; deux copies du calcul passeraient tous les autres ;
//   5. que le choix circule : le prendre dans la liste doit changer le
//      briefing, et le retour ne doit pas l'effacer.

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

const BARRE = /Navigation principale/

test('le menu : des titres, et le geste reste allumé', async ({ page, pageErrors }) => {
  await page.goto('/coach/repeter', { waitUntil: 'domcontentloaded' })

  // ── 1. c'est un LIEU, pas une porte à sens unique ──────────────────────
  await expect(page.getByRole('heading', { level: 1, name: 'Répéter' })).toBeVisible({
    timeout: 20_000,
  })
  const barre = page.getByRole('navigation', { name: BARRE })
  await expect(barre).toBeVisible()
  await expect(barre.locator('[aria-current="page"]')).toHaveText(/Répéter/)
  // ⚠️ Un seul h1. Deux titres sur une page, c'est la faute déjà payée sur
  // les leçons — et elle ne se voit pas à l'écran.
  await expect(page.locator('h1')).toHaveCount(1)

  // ── 2. la rangée fixe : deux commandes, et le geste est TOUCHABLE ──────
  const appeler = page.getByRole('link', { name: 'Appeler', exact: true })
  await expect(appeler).toHaveCount(1)
  await expect(appeler).toHaveAttribute('href', /\/coach\/repeter\/appel/)

  const rangee = appeler.locator('xpath=..')
  await expect(rangee.getByRole('link')).toHaveCount(1)
  const bouton = rangee.getByRole('button')
  await expect(bouton).toHaveCount(1)
  await expect(bouton).toHaveAccessibleName(/^Menu Répéter$/)

  // 🔴 `toBeVisible` NE DÉTECTE PAS L'OCCLUSION : un bouton recouvert reste
  // « visible ». Seul un clic à blanc le dit.
  await poser(page)
  await appeler.click({ trial: true })
  await bouton.click({ trial: true })

  const cadreMenu = await bouton.boundingBox()
  const cadreGeste = await appeler.boundingBox()
  expect(cadreMenu.x + cadreMenu.width, 'le menu doit être À GAUCHE du geste').toBeLessThanOrEqual(
    cadreGeste.x + 1,
  )
  expect(
    Math.abs(cadreMenu.y + cadreMenu.height / 2 - (cadreGeste.y + cadreGeste.height / 2)),
    'menu et geste sur la même rangée',
  ).toBeLessThanOrEqual(1)

  await page.screenshot({ path: 'capture-antichambre.png', animations: 'disabled' })

  // ── 3. le briefing, et aucun jumeau du geste dans la page ──────────────
  const corps = page.locator('main')
  const texteAvant = await corps.innerText()
  // ⚠️ `/i` : `innerText` applique `text-transform`, donc « La situation »
  // revient « LA SITUATION ». Un contrôle sensible à la casse ne mesure pas
  // le texte, il mesure la feuille de style.
  expect(texteAvant).toMatch(/Réussi si/i)
  expect(texteAvant).toMatch(/La situation/i)
  await expect(corps.getByRole('link', { name: /Appeler/ })).toHaveCount(0)

  // ── 4. LE MENU OUVERT ──────────────────────────────────────────────────
  await bouton.click()
  await poser(page)

  // 🔴 LE GESTE RESTE, ET IL RESTE TOUCHABLE. C'est l'invariant de la
  // référence : le voile éteint la PAGE, pas la barre d'action. Avant
  // correction, une feuille recouvrait tout — on choisissait, et le seul
  // geste suivant était hors d'atteinte sous le voile.
  await expect(appeler).toBeVisible()
  await appeler.click({ trial: true })
  // Le bouton de gauche est devenu une croix, à la même place.
  await expect(bouton).toHaveAccessibleName(/^Fermer le menu$/)
  const apres = await bouton.boundingBox()
  expect(Math.round(apres.x), 'la croix a bougé').toBe(Math.round(cadreMenu.x))

  // ⚠️ DES TITRES, ET RIEN QUE DES TITRES. Pas de chiffres, pas de listes :
  // un menu qui contient le contenu n'est plus un menu.
  const titres = page.getByRole('link', { name: /Où tu en es|Sur quoi t['’]entraîner/ })
  await expect(titres).toHaveCount(2)
  const cibles = await titres.evaluateAll((as) => as.map((a) => a.getAttribute('href')))
  for (const href of cibles) {
    // 🔴 AUCUNE DESTINATION DE LA BARRE DU BAS. Sauf un détour de Répéter,
    // qui en est une sous-page et non un ailleurs.
    expect(href, `${href} : le menu redouble la barre du bas`).toMatch(
      /^\/coach\/repeter\/(resultats|appels)/,
    )
  }
  await page.screenshot({ path: 'capture-menu-repeter.png', animations: 'disabled' })

  // ── 5. UNE PLEINE PAGE : pas de barre, une flèche pour sortir ──────────
  await page.getByRole('link', { name: /Sur quoi t['’]entraîner/ }).click()
  await expect(page).toHaveURL(/\/coach\/repeter\/appels/, { timeout: 20_000 })
  await expect(page.getByRole('heading', { level: 1, name: /Sur quoi t['’]entraîner/ })).toBeVisible()
  await expect(page.getByRole('navigation', { name: BARRE })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Retour à Répéter' })).toBeVisible()
  // ⚠️ Et pas de geste dominant : il se placerait au-dessus d'une barre du
  // bas qui n'existe plus ici, et flotterait à 64 px du vide.
  await expect(page.getByRole('link', { name: 'Appeler', exact: true })).toHaveCount(0)
  await poser(page)
  await page.screenshot({ path: 'capture-appels.png', animations: 'disabled' })

  // ── 6. choisir change le briefing ──────────────────────────────────────
  const liens = page.locator('main').getByRole('link')
  const textes = await liens.allInnerTexts()
  const rang = textes.findIndex((t) => !/choisi/i.test(t))
  expect(rang, 'tous les appels sont marqués « Choisi »').toBeGreaterThanOrEqual(0)
  const titreChoisi = textes[rang].split('\n')[0].trim()
  await liens.nth(rang).click()

  await expect(page).toHaveURL(/\/coach\/repeter\?appel=/, { timeout: 20_000 })
  await expect(page.getByRole('navigation', { name: BARRE })).toBeVisible()
  const texteApres = await page.locator('main').innerText()
  expect(texteApres, `« ${titreChoisi} » choisi mais pas annoncé`).toContain(titreChoisi)

  // ── 7. le retour d'un détour ne perd PAS le choix ──────────────────────
  await page.getByRole('button', { name: /^Menu Répéter$/ }).click()
  await page.getByRole('link', { name: /Où tu en es/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: /Où tu en es/ })).toBeVisible({
    timeout: 20_000,
  })
  await expect(page.getByRole('navigation', { name: BARRE })).toHaveCount(0)
  await poser(page)
  await page.screenshot({ path: 'capture-resultats.png', animations: 'disabled' })

  await page.getByRole('link', { name: 'Retour à Répéter' }).click()
  // 🔴 AVEC LE PARAMÈTRE. Quatre endroits construisaient cette adresse : un
  // `encodeURIComponent` oublié quelque part ferait retomber sur le briefing
  // par défaut, et l'écran s'afficherait très bien — personne ne le verrait.
  await expect(page).toHaveURL(/\/coach\/repeter\?appel=/, { timeout: 20_000 })
  expect(await page.locator('main').innerText()).toContain(titreChoisi)

  expect(pageErrors, `exceptions JS : ${pageErrors.join(' | ')}`).toHaveLength(0)
})

test('l’antichambre et l’appel ne peuvent pas se contredire', async ({ page, pageErrors }) => {
  // 🔴 LE CONTRÔLE QUI JUSTIFIE `lib/repetition.ts`. La règle qui choisit
  // l'exercice est subtile — un choix explicite l'emporte sur le point faible,
  // et sur l'étape du contact — et elle vit dans UNE fonction que trois écrans
  // appellent. Recopiée, elle aurait dérivé : l'antichambre annonçant « pour
  // travailler objections » et Aria jouant l'invitation. Rien, côté build,
  // ne l'aurait dit.
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

  // ⚠️ L'ask de l'antichambre se retrouve mot pour mot dans l'appel. C'est la
  // même donnée, lue par la même fonction : si les deux écrans divergent,
  // cette ligne tombe.
  const ask = brief
    .split('\n')
    .map((l) => l.trim())
    .find((l) => dansLAppel.includes(l) && l.length > 12)
  expect(ask, 'aucune phrase commune entre le briefing et l’appel').toBeTruthy()

  // ── Fermer remonte à l'ANTICHAMBRE, pas à l'accueil ───────────────────
  await sortie.click()
  await expect(page).toHaveURL(/\/coach\/repeter(\?|$)/, { timeout: 20_000 })
  await expect(page.getByRole('heading', { level: 1, name: 'Répéter' })).toBeVisible()

  expect(pageErrors, `exceptions JS : ${pageErrors.join(' | ')}`).toHaveLength(0)
})
