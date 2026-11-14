// LA COULEUR DIT OÙ L'ON EST — un lieu, une teinte, et jamais deux la même.
//
//   E2E_BASE=https://v2.atline.ai E2E_COMME=humanstring@gmail.com \
//     npx playwright test tests/couleur-des-lieux.spec.cjs
//
// ── 🔴 LA FAUTE QUE CETTE SONDE EXISTE POUR EMPÊCHER ───────────────────────
//
// Le 12 novembre 2026, Patrice a donné le bleu à l'agenda, puis a proposé
// **le même bleu aux contacts** — « car les rdv sont avec des contacts ».
// Il a tranché autrement une minute plus tard. Mais la faute était à un mot
// près, elle ne casse rien, aucun type ne la voit, et elle vide la couleur de
// son seul travail : dire où l'on est.
//
// 🧭 C'est pour ça que le premier test ne regarde aucun écran. Il vérifie une
// PROPRIÉTÉ de la palette — que les teintes de lieu sont deux à deux
// distinctes — et cette propriété n'a pas de page où aller se vérifier.
//
// ── ⚠️ LE PIÈGE DE `color-mix()`, DÉJÀ PAYÉ DEUX FOIS ─────────────────────
//
// Chrome rend `color-mix()` en `color(srgb 0.94 …)`, en 0→1. Une expression
// régulière sur `getComputedStyle` lit 0,94 comme une valeur sur 255 et
// conclut « presque noir ». On ne compare donc JAMAIS des chaînes de CSS
// entre elles : on peint la valeur dans un élément et on relit ce que le
// navigateur en a fait — `jeton()` ci-dessous. C'est la même ruse que les
// sondes de contraste, et pour la même raison.

const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

/** Ce que le navigateur fait vraiment d'une couleur, quelle que soit sa notation. */
const jeton = (page, valeur) =>
  page.evaluate((v) => {
    const d = document.createElement('div')
    d.style.backgroundColor = v
    document.body.appendChild(d)
    const c = getComputedStyle(d).backgroundColor
    d.remove()
    return c
  }, valeur)

/** Les quatre lieux, et le nom du jeton que chacun porte. */
const LIEUX = [
  { nom: 'Atlas (le coach)', jeton: '--color-atlas' },
  { nom: 'Apprendre', jeton: '--color-aria' },
  { nom: 'Agenda', jeton: '--color-disc-bleu' },
  { nom: 'Contacts', jeton: '--color-nova' },
]

test('quatre lieux, quatre couleurs — et aucune partagée', async ({ page, pageErrors }) => {
  await page.goto('/accueil', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('nav[aria-label="Navigation principale"]')).toBeVisible({
    timeout: 20_000,
  })

  const vus = []
  for (const l of LIEUX) {
    const charte = await jeton(page, `var(${l.jeton})`)
    const texte = await jeton(page, `var(${l.jeton}-texte)`)
    // ⚠️ CONTRÔLE POSITIF : un jeton inexistant ne rendrait pas `rgb(...)`
    // mais la couleur de fond par défaut, et tout ce test passerait au vert
    // en ne mesurant rien du tout.
    expect(charte, `${l.nom} : le jeton ${l.jeton} doit exister`).toMatch(/^rgba?\(/)
    expect(texte, `${l.nom} : la variante texte doit exister`).toMatch(/^rgba?\(/)
    vus.push({ ...l, charte, texte })
  }

  for (let i = 0; i < vus.length; i++) {
    for (let j = i + 1; j < vus.length; j++) {
      expect(
        vus[i].charte,
        `${vus[i].nom} et ${vus[j].nom} portent la MÊME couleur : deux lieux de la même ` +
          `teinte cessent d'être deux lieux`,
      ).not.toBe(vus[j].charte)
    }
  }

  expect(pageErrors).toEqual([])
})

test("le filet d'une carte dit où elle mène", async ({ page, pageErrors }) => {
  await page.goto('/accueil', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('nav[aria-label="Navigation principale"]')).toBeVisible({
    timeout: 20_000,
  })

  const teal = await jeton(page, 'var(--color-aria)')
  const orange = await jeton(page, 'var(--color-atlas)')
  const violet = await jeton(page, 'var(--color-nova)')
  const bleu = await jeton(page, 'var(--color-disc-bleu)')

  const filet = (sel) =>
    page.locator(sel).first().evaluate((el) => getComputedStyle(el).borderLeftColor)

  /**
   * 🔴 LE CONTRÔLE POSITIF D'ABORD, et il n'est pas décoratif : il prouve que
   * la sonde SAIT LIRE UN FILET et que l'orange existe encore quelque part.
   * Une sonde qui cherche « plus d'orange ici » et qui, par erreur de
   * sélecteur, ne lit rien du tout, annonce exactement le même vert que la
   * réussite. Le résumé de nuit est le coach qui parle : son filet reste
   * orange, et c'est la seule carte de l'accueil dont c'est le cas.
   *
   * ⚠️ ÇA A FAILLI CESSER D'ÊTRE VRAI : la carte des mantras a porté un aplat
   * orange du 13 au 14 novembre 2026. Patrice l'a retiré. Le seul orange de
   * l'accueil est donc à nouveau ici — plus l'étiquette de famille des
   * mantras, qui est du TEXTE et prend la variante `--color-atlas-texte`.
   */
  const resume = page.locator('section[aria-labelledby="resume-titre"]')
  await expect(resume, 'le résumé de nuit doit être là, sinon ce test ne prouve rien').toBeVisible()
  expect(
    await filet('section[aria-labelledby="resume-titre"]'),
    "le filet du résumé doit être ORANGE — c'est le coach qui parle, pas un lieu",
  ).toBe(orange)

  /**
   * ── 🔴 LA RÈGLE GÉNÉRALE, ET PLUS DEUX CAS PARTICULIERS (14 nov 2026) ──
   *
   * Ce test listait les cartes du plan du jour (`[data-plan-ligne]`) et deux
   * cartes de famille (`[data-carte="a-solder"]`, `"jamais-contactes"`). Le
   * plan du jour est entré dans le rail « Apprendre », et les deux cartes
   * étaient devenues des rails la veille : **deux des trois branches ne
   * mesuraient donc plus rien**, et elles ne s'en plaignaient pas — leur
   * sélecteur rendait zéro élément et la boucle ne tournait pas.
   *
   * 🧭 On ne remplace pas une liste d'endroits par une autre liste
   * d'endroits : on écrit LA RÈGLE. **Le filet d'une tuile vaut la teinte du
   * lieu vers lequel elle mène**, quelle que soit la famille qui la porte.
   * Une tuile nouvelle est couverte le jour où elle naît, sans que personne
   * n'ait à se souvenir d'allonger ce fichier.
   */
  const LIEUX = [
    { prefixes: ['/parcours', '/coach/repeter'], teinte: teal, nom: 'Apprendre' },
    { prefixes: ['/agenda'], teinte: bleu, nom: 'Agenda' },
    { prefixes: ['/gens'], teinte: violet, nom: 'Contacts' },
  ]

  const tuiles = page.locator('[data-tuile]')
  const n = await tuiles.count()
  // ⚠️ CONTRÔLE POSITIF : un sélecteur devenu faux rendrait zéro et ce test
  // annoncerait le même vert que la réussite. C'est exactement ce qui vient
  // d'arriver aux deux branches qu'on remplace.
  expect(n, 'aucune tuile de rail : la sonde ne mesure rien').toBeGreaterThanOrEqual(3)

  const fautes = []
  for (let i = 0; i < n; i++) {
    const t = tuiles.nth(i)
    const [cle, href, bord] = await Promise.all([
      t.getAttribute('data-tuile'),
      t.getAttribute('href'),
      t.evaluate((el) => getComputedStyle(el).borderLeftColor),
    ])
    const lieu = LIEUX.find((l) => l.prefixes.some((p) => href.startsWith(p)))
    // Une tuile qui ne mène à aucun lieu prend l'orange par défaut : c'est le
    // même repli que `teinteDe`, et il doit rester explicite ici.
    const attendu = lieu ? lieu.teinte : orange
    if (bord !== attendu) {
      fautes.push(`« ${cle} » → ${href} (${lieu ? lieu.nom : 'aucun lieu'}) : ${bord} au lieu de ${attendu}`)
    }
  }
  expect(fautes, `le filet ne dit pas où la tuile mène :\n${fautes.join('\n')}`).toEqual([])

  /**
   * 🔴 ET LES CARTES DE « BIENTÔT DANS L'APP » N'ONT DROIT À AUCUNE TEINTE DE
   * LIEU. Elles désignent des écrans qui n'existent pas : leur donner une
   * couleur reviendrait à l'attribuer d'avance, puis à devoir la reprendre.
   * Leur filet est gris, et c'est l'un des quatre signaux qui disent « pas
   * encore » avant même qu'on ait lu le titre de la section.
   */
  const aVenir = page.locator('[data-avenir]')
  const m = await aVenir.count()
  expect(m, 'les cartes « bientôt » ont disparu').toBeGreaterThan(0)
  const bordure = await jeton(page, 'var(--color-bordure)')
  for (let i = 0; i < m; i++) {
    expect(
      await aVenir.nth(i).evaluate((el) => getComputedStyle(el).borderLeftColor),
      `« ${await aVenir.nth(i).getAttribute('data-avenir')} » porte une teinte de lieu alors que son écran n’existe pas`,
    ).toBe(bordure)
  }

  expect(pageErrors).toEqual([])
})

test('la barre allume Contacts en violet', async ({ page, pageErrors }) => {
  await page.goto('/gens', { waitUntil: 'domcontentloaded' })
  const barre = page.locator('nav[aria-label="Navigation principale"]')
  await expect(barre).toBeVisible({ timeout: 20_000 })

  const violetTexte = await jeton(page, 'var(--color-nova-texte)')
  const orangeTexte = await jeton(page, 'var(--color-atlas-texte)')
  expect(violetTexte, 'les deux variantes doivent différer, sinon ce test ne prouve rien').not.toBe(
    orangeTexte,
  )

  // Le mot ET le glyphe : ils vont ensemble, et c'est le glyphe qui était
  // resté orange la dernière fois qu'on a donné une couleur à un lieu.
  const allumee = barre.locator('[aria-current="page"]')
  await expect(allumee).toHaveCount(1)
  expect(
    await allumee.locator('span').first().evaluate((el) => getComputedStyle(el).color),
    'le mot « Contacts » allumé doit être en violet de texte',
  ).toBe(violetTexte)
  expect(
    await allumee.locator('svg').first().evaluate((el) => getComputedStyle(el).stroke),
    'le glyphe allumé doit suivre le mot',
  ).toBe(violetTexte)

  expect(pageErrors).toEqual([])
})
