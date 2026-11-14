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
  // 🔴 MISE À JOUR TROIS FOIS. Le 8 novembre, « Simulation » est rentrée dans
  // Formation et sa case est revenue à Atlas ; la PREMIÈRE case dit « Menu »
  // quand on est déjà chez soi. Le 10 au matin, **l'agenda est monté en haut
  // à droite** : la barre tombe à QUATRE. Le 10 au soir, **« Formation » est
  // devenue « Apprendre »** — le lieu portait quatre mots selon l'écran.
  expect(entrees).toEqual(['Menu', 'Apprendre', 'Atlas', 'Contacts'])

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
  // 🔴 L'ACCUEIL N'A PLUS DE GESTE DU JOUR DU TOUT, depuis le 8 novembre
  // 2026. « Parler à Atlas » menait exactement où mène la case Atlas de la
  // barre — deux gestes vers le même endroit, dont le MOINS accessible — et
  // aucun des gestes restants n'était dominant : en élire un au hasard aurait
  // été un pari sur le calcul.
  await expect(page.getByRole('link', { name: 'Parler à Atlas' })).toHaveCount(0)
  await expect(page.locator('[data-barre-action]')).toHaveCount(0)

  // 🔴 ET LA PREUVE QUE CETTE SONDE SAIT VOIR LA CHOSE. Un contrôle
  // d'absence sur un sélecteur qui ne marche nulle part est vert pour
  // toujours : c'est la classe de panne qui a laissé deux sondes de hauteur
  // mentir ensemble le 8 novembre. Formation, elle, porte bien un geste fixe.
  await page.goto('/parcours/cours', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-barre-action]')).toHaveCount(1, { timeout: 20_000 })
  await page.goto('/accueil', { waitUntil: 'domcontentloaded' })
  await expect(barre).toBeVisible({ timeout: 20_000 })

  /**
   * …et que la RECOMMANDATION du jour n'existe qu'une fois sur l'écran.
   *
   * ⚠️ ELLE A CHANGÉ DE FORME LE 14 NOVEMBRE 2026, pas de rôle. C'était un
   * lien « Ouvrir le module 8 → » dans une carte pleine largeur ; le plan du
   * jour est entré dans le rail « Apprendre » et c'est devenu la première
   * tuile, dont le geste nomme le module.
   *
   * 🧭 CE QUE CE COMPTE PROTÈGE RESTE LE MÊME : **le conseil du jour ne doit
   * pas être redoublé.** Il l'a déjà été — la seconde carte du plan menait à
   * `/coach/repeter` exactement comme une tuile voisine, et le format
   * différent le cachait.
   */
  const conseil = page.locator('[data-tuile="point-faible"], [data-tuile="commencer"]')
  await expect(conseil, 'la recommandation du jour a disparu ou se redouble').toHaveCount(1)
  await expect(conseil, 'le geste de la recommandation ne nomme plus son module').toContainText(
    /Module|Commencer/,
  )

  // ── 3. chaque lieu : son nom, sa hauteur, son centrage ─────────────────
  async function lieuConforme(nom) {
    await barre.getByRole('link', { name: nom }).click()
    await expect(page.getByRole('heading', { level: 1, name: nom })).toBeVisible({ timeout: 15_000 })
    // Un lieu ne porte NI sélecteur NI avatar : l'identité est au hall.
    await expect(page.getByRole('link', { name: /Mon compte/ })).toHaveCount(0)

    // 🔴 ET PLUS AUCUN LIEN VERS L'ACCUEIL EN HAUT À GAUCHE (5 nov 2026). La
    // marque Atline y menait, c'est-à-dire une destination que la barre du bas
    // atteint déjà — la faute exacte qui a fait supprimer le menu global, et
    // par le plus difficile des deux gestes : le coin haut-gauche contre le
    // pouce. Ce contrôle est le seul qui empêcherait de la réintroduire.
    await expect(page.getByRole('link', { name: /Retour à l’accueil/ })).toHaveCount(0)

    // ── 🔴 L'ÉCRAN A VRAIMENT ÉTÉ RENDU ──────────────────────────────────
    //
    // Le 6 novembre 2026, `/gens` a rendu « This page couldn't load » en
    // production : une FONCTION passée d'un composant serveur à un composant
    // client, ce qui n'est pas sérialisable. ⚠️ Ni le typecheck ni le build
    // ne l'ont vu — ça ne se manifeste qu'au rendu. La sonde l'a bien
    // attrapé, mais par accident : c'est l'absence du `<h1>` attendu qui a
    // parlé. Un écran qui tombe doit se dire COMME TEL, sur chaque lieu.
    expect(
      await page.locator('body').innerText(),
      `${nom} : la page n'a pas pu être rendue`,
    ).not.toMatch(/This page couldn’t load|A server error occurred/)

    // ── 🔴 AUCUNE CLASSE NE CONTIENT DE CODE ─────────────────────────────
    //
    // Importer une constante depuis un module `'use client'` dans un
    // composant SERVEUR ne rend pas sa valeur : Next donne une référence, et
    // interpolée dans un gabarit de chaîne elle se convertit en TEXTE. Vu le
    // 5 novembre 2026 : l'attribut `class` des saisies d'un formulaire
    // contenait « function(){throw Error("Attempted to call CHAMP() from the
    // server…")} ». Build vert, aucune exception, console muette — l'élément
    // perdait simplement toute sa mise en forme.
    //
    // 🧭 Le balayage coûte une ligne et couvre TOUTE la famille, sur chaque
    // écran, plutôt que l'endroit où elle s'est montrée une fois.
    const codeEnClasse = await page.evaluate(() =>
      [...document.querySelectorAll('[class]')]
        .map((e) => e.getAttribute('class') || '')
        .filter((c) => /function\s*\(|=>|throw |\[object /.test(c))
        .slice(0, 3),
    )
    expect(codeEnClasse, `${nom} : du code dans un attribut class`).toEqual([])

    await poser(page)
    const cadre = await page.locator('header').boundingBox()
    // 🔴 LA DEUXIÈME CELLULE, PLUS LA PREMIÈRE. L'en-tête est passé en grille
    // à trois cellules le 10 novembre 2026, pour que le titre d'un lieu reste
    // centré malgré l'agenda posé à droite. Le premier `div` était le bloc du
    // titre tant que la gauche n'était qu'un lien nu ; c'est maintenant la
    // cellule de GAUCHE, et la sonde mesurait donc un élément collé au bord —
    // elle a bien crié, mais en disant « décalé de 179 px » au lieu de « je
    // regarde ailleurs ».
    const bloc = await page.locator('header > div:nth-child(2)').boundingBox()
    const ecart = Math.round(bloc.x + bloc.width / 2 - (cadre.x + cadre.width / 2))
    expect(Math.round(cadre.height), `${nom} : barre du haut`).toBe(hautAccueil)
    expect(Math.abs(ecart), `${nom} : paire décalée de ${ecart} px`).toBeLessThanOrEqual(1)

    await page.screenshot({
      path: `capture-haut-${nom.toLowerCase()}.png`,
      clip: { x: 0, y: 0, width: 390, height: 66 },
      animations: 'disabled',
    })
  }

  // 🔴 « SIMULATION » (« Répéter » alors) EST ENTRÉ DANS CETTE BOUCLE LE 5 NOVEMBRE 2026, et c'est
  // le sens de l'antichambre. Jusque-là `/coach/repeter` ouvrait l'écran
  // d'appel immersif : ni barre du haut ni barre du bas, une croix pour seule
  // sortie. C'était la SEULE entrée de la barre dont la destination masquait
  // la barre — une porte à sens unique au milieu de la navigation. L'appel
  // vit désormais un cran plus bas, et c'est l'antichambre qui a la coquille.
  //
  // 🔴 ET « SIMULATION » EN EST SORTI LE 8 NOVEMBRE 2026, remplacé par ATLAS.
  // Le simulateur est rentré dans Formation — il ne se visite pas, il se
  // LANCE depuis un contexte — et la case libérée est revenue à Atlas.
  //
  // 🔴 L'AGENDA EST SORTI DE CETTE BOUCLE LE 10 NOVEMBRE : il reste un LIEU
  // — titre centré, icône, teinte, sous-pages — mais on ne l'atteint plus
  // par la barre. Il est couvert par `agenda-en-haut.spec.cjs`, qui vérifie
  // justement qu'il n'a rien perdu d'autre que sa case.
  //
  // ⚠️ Contacts reste EN DERNIER : le contrôle d'après lit l'entrée allumée.
  for (const nom of ['Apprendre', 'Atlas', 'Contacts']) await lieuConforme(nom)

  // ── 4. une seule entrée allumée, et c'est la bonne ─────────────────────
  const allumees = barre.locator('[aria-current="page"]')
  await expect(allumees).toHaveCount(1)
  await expect(allumees).toHaveText(/Contacts/)

  // ── L'APPEL, un cran plus bas : immersif, et il doit RAMENER ──────────
  //
  // 🔴 Une destination qui masque la barre doit avoir une sortie, sinon c'est
  // un cul-de-sac. L'écran d'appel est le SEUL qui a le droit de la masquer —
  // on parle, on ne navigue pas — et il se referme par sa propre croix.
  await page.goto('/coach/repeter/appel', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('navigation', { name: /Navigation principale/ })).toHaveCount(0)
  const sortie = page.getByRole('button', { name: /Fermer|Quitter|Raccrocher/ })
  await expect(sortie.first()).toBeVisible({ timeout: 20_000 })

  // ⚠️ ATTENDRE QUE LA MIRE AIT PEINT. Elle vit dans un `<canvas>` : sa
  // présence dans le DOM ne dit RIEN de ce qu'on y voit, et une capture peut
  // partir avant sa première image. Elle est sortie vide d'une capture du
  // 5 novembre — j'y ai d'abord lu un défaut de l'app, mesure à l'appui
  // ailleurs (`mire-figee.spec.cjs`) : c'était la capture qui courait.
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const c = document.querySelector('canvas')
          if (!c) return 0
          const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data
          let n = 0
          for (let i = 3; i < d.length; i += 4) if (d[i] > 8) n++
          return n
        }),
      { timeout: 10_000 },
    )
    .toBeGreaterThan(0)

  await poser(page)
  await page.screenshot({ path: 'capture-appel.png', animations: 'disabled' })

  // ── 5. /coach ne rend pas 404, il ramène à l'accueil ───────────────────
  //
  // 🔴 Des leçons y pointaient encore. Sans cette redirection, un lien
  // intérieur à l'app aurait rendu une page d'erreur — et rien, côté build,
  // n'aurait signalé qu'un écran avait changé d'adresse.
  await page.goto('/coach', { waitUntil: 'domcontentloaded' })
  await expect(page).toHaveURL(/\/accueil$/, { timeout: 15_000 })

  expect(pageErrors, `exceptions JS : ${pageErrors.join(' | ')}`).toHaveLength(0)
})
