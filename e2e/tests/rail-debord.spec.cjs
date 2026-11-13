// LE RAIL DÉBORDE, ET LA TUILE SUIVANTE EST VISIBLEMENT COUPÉE.
//
//   E2E_BASE=https://v2.atline.ai E2E_COMME=humanstring@gmail.com \
//     npx playwright test tests/rail-debord.spec.cjs
//
// ── 🔴 LA PANNE QUE CETTE SONDE EXISTE POUR ATTRAPER ──────────────────────
//
// Un rail dont rien ne dépasse **s'affiche parfaitement** : trois tuiles
// alignées, bordures nettes, aucune erreur. Il a simplement cessé d'être un
// rail — plus personne ne fait glisser le doigt, et la troisième tuile n'est
// jamais lue. C'est une panne de mise en page entièrement silencieuse.
//
// Elle survient au premier réglage de `LARGEUR_TUILE`, d'un changement de
// gouttière, ou le jour où une tuile de plus arrive. Rien dans le code ne la
// signale : c'est une arithmétique entre quatre fichiers.
//
// 🧭 La sonde ne vérifie donc pas que le rail EXISTE — ça, un `toBeVisible`
// le dirait et ne prouverait rien. Elle vérifie qu'il **dépasse**, et qu'une
// tuile est **à cheval sur le bord** : commencée dans l'écran, finie dehors.

const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

/** La règle ④ : assez pour qu'on la voie commencer, trop peu pour la croire entière. */
const DEBORD_MINI = 24

test('la troisième tuile est à cheval sur le bord de l’écran', async ({ page, pageErrors }) => {
  await page.goto('/accueil', { waitUntil: 'domcontentloaded' })

  const tuiles = page.locator('[data-tuile]')
  // ⚠️ CONTRÔLE POSITIF. Sans lui, un rail vide — ou un sélecteur devenu faux —
  // ferait passer tout le reste de ce test en ne mesurant rien.
  await expect(tuiles.first()).toBeVisible({ timeout: 20_000 })
  const n = await tuiles.count()
  expect(n, 'un rail de moins de trois tuiles ne peut rien couper').toBeGreaterThanOrEqual(3)

  const largeur = page.viewportSize().width

  const boites = []
  for (let i = 0; i < n; i++) boites.push(await tuiles.nth(i).boundingBox())

  // ── CE QUI EST ENTIÈREMENT DANS L'ÉCRAN ──
  const entieres = boites.filter((b) => b.x >= 0 && b.x + b.width <= largeur).length
  expect(entieres, 'au moins deux tuiles doivent être entièrement lisibles').toBeGreaterThanOrEqual(2)
  expect(entieres, 'si tout tient dans l’écran, ce n’est plus un rail').toBeLessThan(n)

  // ── CELLE QUI EST À CHEVAL : commencée dedans, finie dehors ──
  const acheval = boites.find((b) => b.x < largeur && b.x + b.width > largeur)
  expect(acheval, 'aucune tuile ne chevauche le bord : rien ne dit qu’il y en a d’autres').toBeTruthy()
  const visible = largeur - acheval.x
  expect(
    visible,
    `seulement ${Math.round(visible)} px de la tuile suivante sont visibles : le doigt ne partira pas`,
  ).toBeGreaterThanOrEqual(DEBORD_MINI)
  expect(visible, 'la tuile suivante est presque entière : elle ne se lit plus comme une suite').toBeLessThan(
    acheval.width - 8,
  )

  // ── 🔴 LE BORD GAUCHE, VU PAR PATRICE AVANT TOUTE SONDE (13 nov 2026) ──
  //
  // *« le bord gauche de la première carte touche complètement le bord de
  // l'écran »*. Mesuré : `scrollLeft` valait **16 au chargement**, sans que
  // personne n'ait glissé — `scroll-snap-align: start` cale le point d'arrêt
  // sur le bord du conteneur et ignore `padding-left` tant qu'on n'a pas dit
  // `scroll-padding-left`.
  //
  // 🧭 LE DÉBORD EST DIRECTIONNEL : à gauche c'est le début, à droite c'est
  // la suite. On vérifie donc l'alignement contre une VRAIE carte de la page
  // plutôt que contre 16 en dur : le jour où la gouttière change, les deux
  // bougent ensemble et ce test continue de dire la vérité.
  const refs = await page.evaluate(() => {
    const carte = document.querySelector('[aria-labelledby="resume-titre"], [data-carte]')
    return { carte: carte ? carte.getBoundingClientRect().x : null }
  })
  expect(refs.carte, 'aucune carte pleine pour servir de référence').not.toBeNull()
  expect(
    Math.round(boites[0].x),
    'la première tuile n’est pas alignée sur les cartes de la page',
  ).toBe(Math.round(refs.carte))

  expect(pageErrors).toEqual([])
})

test('le rail glisse vraiment, et la page ne glisse pas avec lui', async ({ page, pageErrors }) => {
  await page.goto('/accueil', { waitUntil: 'domcontentloaded' })
  const rail = page.locator('ul:has([data-tuile])').first()
  await expect(rail).toBeVisible({ timeout: 20_000 })

  /**
   * 🔴 LE DÉFAUT CLASSIQUE DU RAIL : il emporte la PAGE avec lui. Un
   * `-mx-4` mal compensé, et tout l'écran se décale vers la droite — on
   * s'en aperçoit par un ascenseur horizontal en bas de page, que personne
   * ne regarde sur un téléphone.
   */
  const pageDeborde = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  )
  expect(pageDeborde, 'le rail fait déborder la PAGE entière').toBe(false)

  const avant = await rail.evaluate((el) => el.scrollLeft)
  await rail.evaluate((el) => el.scrollBy({ left: 200, behavior: 'instant' }))
  const apres = await rail.evaluate((el) => el.scrollLeft)
  expect(apres, 'le rail ne défile pas : `overflow-x` est perdu').toBeGreaterThan(avant)

  expect(pageErrors).toEqual([])
})

test('ce que le rail annonce, le « Tout voir » le montre', async ({ page, pageErrors }) => {
  /**
   * 🔴 LA RÈGLE ② SE MESURE ICI, ET NULLE PART AILLEURS. Un « Tout voir »
   * rend le rail honnête : il promet que rien n'est perdu hors écran. Rien
   * dans le code ne garantit cette promesse — une tuile annonce un chiffre,
   * un écran affiche une liste, et les deux peuvent dériver sans la moindre
   * erreur. Ce test les confronte.
   *
   * 🧭 Il est le seul qui traverse deux écrans, et c'est normal : la promesse
   * aussi.
   */
  await page.goto('/accueil', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-tuile]').first()).toBeVisible({ timeout: 20_000 })

  const annonce = await page.evaluate(() =>
    Object.fromEntries(
      ['jamais', 'solder', 'silence']
        .map((k) => [k, document.querySelector(`[data-tuile="${k}"] span`)?.textContent])
        .filter(([, v]) => v)
        .map(([k, v]) => [k, parseInt(v, 10)]),
    ),
  )
  const cles = Object.keys(annonce)
  expect(cles.length, 'aucune tuile de « Ce qui revient » : rien à confronter').toBeGreaterThan(0)

  await page.goto('/a-faire', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 })

  const montre = await page.evaluate(() =>
    [...document.querySelectorAll('main section')].map((s) => ({
      titre: s.querySelector('h2')?.textContent ?? '',
      lignes: s.querySelectorAll('li').length,
    })),
  )
  const total = montre.reduce((n, g) => n + g.lignes, 0)
  const somme = cles.reduce((n, k) => n + annonce[k], 0)

  expect(
    total,
    `le rail annonce ${somme} (${cles.map((k) => `${k}=${annonce[k]}`).join(' ')}) et ` +
      `l'écran en montre ${total} : la promesse du « Tout voir » est rompue`,
  ).toBe(somme)

  expect(pageErrors).toEqual([])
})

test('aucune étiquette de tuile ne se coupe', async ({ page, pageErrors }) => {
  /**
   * 🔴 LA FAUTE QUE J'AI FAITE LE JOUR MÊME (13 nov 2026). Première version
   * des tuiles à 104 px de haut : il restait **30 px** pour une étiquette
   * dont la ligne fait 18. On écrivait pour deux lignes, une et demie
   * tenaient — « rendez-vous sans » perdait son « issue », « jamais
   * contactés, » gardait une virgule orpheline.
   *
   * 🧭 Et ÇA NE RESSEMBLE PAS À UN DÉFAUT : `line-clamp` coupe proprement,
   * sans points de suspension ici, sans débordement, sans erreur. Le texte a
   * simplement disparu. C'est la panne d'affichage la plus silencieuse qui
   * soit — celle où le cadre a raison et le contenu a tort.
   *
   * La sonde compare la hauteur RÉELLE du texte à la place qu'il a.
   */
  await page.goto('/accueil', { waitUntil: 'domcontentloaded' })
  const tuiles = page.locator('[data-tuile]')
  await expect(tuiles.first()).toBeVisible({ timeout: 20_000 })

  const coupees = await page.evaluate(() =>
    [...document.querySelectorAll('[data-tuile]')]
      .map((t) => {
        // L'étiquette est le span qui porte le `line-clamp`.
        const e = [...t.querySelectorAll('span')].find((s) =>
          getComputedStyle(s).webkitLineClamp !== 'none',
        )
        if (!e) return null
        return e.scrollHeight > e.clientHeight + 1
          ? { cle: t.dataset.tuile, texte: e.textContent.trim(), a: e.scrollHeight, place: e.clientHeight }
          : null
      })
      .filter(Boolean),
  )

  // ⚠️ CONTRÔLE POSITIF : sans lui, un sélecteur devenu faux rendrait une
  // liste vide et ce test annoncerait le même vert que la réussite.
  const vues = await page.evaluate(
    () =>
      [...document.querySelectorAll('[data-tuile]')].filter((t) =>
        [...t.querySelectorAll('span')].some((s) => getComputedStyle(s).webkitLineClamp !== 'none'),
      ).length,
  )
  expect(vues, 'aucune étiquette trouvée : la sonde ne mesure rien').toBeGreaterThan(0)

  expect(
    coupees,
    coupees.map((c) => `« ${c.texte} » (${c.cle}) demande ${c.a} px, en a ${c.place}`).join(' · '),
  ).toEqual([])

  expect(pageErrors).toEqual([])
})
