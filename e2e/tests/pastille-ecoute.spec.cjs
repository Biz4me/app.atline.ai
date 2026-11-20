// LE SON SURVIT-IL AU CHANGEMENT D'ÉCRAN ?
//
//     E2E_BASE=https://v2.atline.ai npx playwright test tests/pastille-ecoute.spec.cjs
//
// Patrice, le 20 novembre 2026 : *« je veux pouvoir écouter en travaillant dans
// Atline »*. Le lecteur vivait DANS la page d'écoute : changer d'écran le
// démontait et le son s'arrêtait net au milieu d'une phrase. Il vit maintenant
// dans la coquille, et une pastille suit la personne.
//
// 🔴 QUATRE FAITS, ET AUCUN NE SE VOIT SUR UNE CAPTURE. Que le son CONTINUE,
// que ce soit LA MÊME piste et non un rechargement qui repart du début, que la
// pastille ne chevauche aucun meuble du bas, et qu'elle ne flotte pas dans le
// vide là où il n'y a pas de meuble.
//
// ⚠️ ET TOUTE NAVIGATION SE FAIT AU CLIC, JAMAIS PAR `goto`. Un chargement de
// document détruit l'élément : le son s'arrêterait pour une raison qui n'est
// pas celle qu'on mesure, et la sonde accuserait l'app d'un défaut qu'elle
// n'a pas.
const { test, expect } = require('../fixtures.cjs')
const { lancer, ouvrirEcoute } = require('../son.cjs')

test.use({ viewport: { width: 390, height: 844 } })

const PASTILLE = '[data-pastille-ecoute]'
const BAS = '[data-barre-bas] a'

/**
 * Quitter la leçon vers la couverture du module.
 *
 * 🔴 CET ÉCRAN EST UNE PLEINE PAGE, DONC SANS BARRE DU BAS. C'est le cas qui a
 * fait rater la première version de cette sonde — elle cherchait la barre des
 * lieux ici et attendait pour toujours. Et c'est aussi le cas intéressant pour
 * la pastille : sans meuble, elle doit se poser au ras du bas et non flotter à
 * 64 px du vide.
 */
async function auModule(page) {
  await page.getByRole('link', { name: /Retour au module/ }).click()
  await page.locator(PASTILLE).waitFor({ state: 'visible', timeout: 15_000 })
}

/** Puis l'étagère, qui porte la barre des cinq lieux. */
async function aLEtagere(page) {
  await page.getByRole('link', { name: 'Retour à Apprendre' }).click()
  await page.locator(PASTILLE).waitFor({ state: 'visible', timeout: 15_000 })
  await page.locator('[data-barre-bas]').waitFor({ state: 'visible', timeout: 15_000 })
}

const etat = (page) =>
  page.evaluate(() => {
    const a = document.querySelector('audio')
    const p = document.querySelector('[data-pastille-ecoute]')
    return {
      src: a.currentSrc,
      t: a.currentTime,
      arrete: a.paused,
      pastille: !!p,
      texte: p?.textContent.trim() ?? null,
    }
  })

test('on quitte la leçon, le son continue, et la pastille prend le relais', async ({ page }) => {
  await ouvrirEcoute(page)
  await lancer(page)

  // 🔴 PAS DE PASTILLE SUR LA PAGE DE LA LEÇON QU'ON ÉCOUTE : le lecteur
  // entier y est, et deux commandes pour un même son sont une hésitation.
  expect(
    await page.locator(PASTILLE).count(),
    'la pastille ne doit pas doubler le lecteur sur sa propre page',
  ).toBe(0)

  const depart = await etat(page)
  await auModule(page)
  const module = await etat(page)
  await aLEtagere(page)

  // Puis un VRAI autre lieu, par la barre du bas : c'est la demande, pas
  // seulement « sortir de la leçon ».
  const liens = page.locator(BAS)
  const nb = await liens.count()
  expect(nb, 'aucun lien dans la barre du bas : la sonde n’éprouverait rien').toBeGreaterThan(1)
  // ⚠️ On évite la case qui ouvre le menu : elle poserait un voile par-dessus
  // la pastille, et on mesurerait sa disparition au lieu de sa survie.
  let vers = null
  for (let i = nb - 1; i >= 0 && !vers; i--) {
    const h = await liens.nth(i).getAttribute('href')
    if (h && !h.includes('menu=')) vers = { i, h }
  }
  expect(vers, 'aucune case de la barre ne mène ailleurs qu’au menu').toBeTruthy()
  await liens.nth(vers.i).click()
  await expect.poll(() => page.url(), { timeout: 15_000 }).toContain(vers.h.split('?')[0])
  await page.locator(PASTILLE).waitFor({ state: 'visible', timeout: 15_000 })

  const ailleurs = await etat(page)
  console.log(JSON.stringify({ vers: vers.h, depart, module, ailleurs }, null, 1))

  const griefs = []
  for (const [nom, e] of [
    ['la couverture du module', module],
    [`l’écran ${vers.h}`, ailleurs],
  ]) {
    if (e.arrete) griefs.push(`le son s’est arrêté en arrivant sur ${nom}`)
    if (!e.pastille) griefs.push(`aucune pastille sur ${nom}`)
    else if (!e.texte?.includes('Leçon'))
      griefs.push(`sur ${nom}, la pastille ne dit pas ce qu’elle joue : « ${e.texte} »`)
    // 🔴 LA MÊME PISTE, ET PAS UN RECHARGEMENT QUI REPART. Sans ce contrôle, un
    // lecteur remonté à neuf sur chaque écran passerait pour un lecteur qui
    // survit : il jouerait, simplement depuis le début.
    if (e.src !== depart.src) griefs.push(`sur ${nom}, la source a changé : l’élément a été rechargé`)
  }
  if (ailleurs.t <= depart.t)
    griefs.push(
      `la tête de lecture n’a pas avancé de bout en bout : ${depart.t.toFixed(1)} puis ${ailleurs.t.toFixed(1)}`,
    )

  expect(griefs, `ce qui cloche :\n  · ${griefs.join('\n  · ')}`).toEqual([])
})

/**
 * ── 🔴 OÙ ELLE SE POSE SE MESURE, ÇA NE S'ÉCRIT PAS ─────────────────────────
 *
 * Le mobilier du bas n'est pas le même d'un écran à l'autre : la barre des cinq
 * lieux, plus parfois le geste du jour au-dessus d'elle, et **sur une pleine
 * page rien du tout**. Une hauteur écrite en dur ferait flotter la pastille à
 * 64 px du vide sur les trois écrans du livre, et la ferait chevaucher le geste
 * du jour ailleurs. L'invariant est « au-dessus de tout ce qui est en bas », et
 * il se vérifie en pixels.
 *
 * ⚠️ LA SONDE DIT CE QU'ELLE A RENCONTRÉ. Première version : elle parcourait
 * une liste vide et passait au vert sans avoir rien éprouvé — un contrôle
 * d'absence qui n'a jamais vu la chose. Les deux comptes du bas sont là pour
 * que ce silence-là ne puisse plus passer pour un succès.
 */
test('la pastille ne chevauche aucun meuble, et ne flotte pas sans meuble', async ({ page }) => {
  await ouvrirEcoute(page)
  await lancer(page)

  const geo = () =>
    page.evaluate(() => {
      const boite = (s) => {
        const e = document.querySelector(s)
        return e ? e.getBoundingClientRect() : null
      }
      const p = boite('[data-pastille-ecoute]')
      const bas = boite('[data-barre-bas]')
      const action = boite('[data-barre-action]')
      return {
        pastilleBas: Math.round(p.bottom),
        ecran: window.innerHeight,
        barreHaut: bas ? Math.round(bas.top) : null,
        actionHaut: action ? Math.round(action.top) : null,
      }
    })

  const vus = []
  await auModule(page)
  vus.push({ ou: 'couverture du module (pleine page)', ...(await geo()) })

  /**
   * ── LA LISEUSE, parce que c'est LÀ que la demande se réalise ──────────────
   *
   * *« je veux pouvoir écouter en travaillant dans Atline »* commence par le
   * cas le plus évident : écouter la leçon en suivant le texte des yeux. Cet
   * écran est une pleine page qui porte sa propre barre d'outils — donc la
   * configuration de meubles la plus serrée de l'app.
   */
  /**
   * ⚠️ `[data-lecon]` ET NON UNE FORME D'ADRESSE. Première version : un motif
   * `/parcours/<x>/<y>`, qui a attrapé `/parcours/<module>/carte` — la carte du
   * module — et l'a étiquetée « liseuse » dans le journal. La sonde passait au
   * vert **en se trompant sur ce qu'elle avait mesuré**, ce qui est pire qu'un
   * échec : elle affirmait avoir éprouvé l'écran du texte sans y être allée.
   * Le repère est posé par `chemin.tsx` sur les rangées de LEÇON, et sur elles
   * seules.
   */
  const rangees = page.locator('[data-lecon]')
  const versLecon = (await rangees.count()) > 0 ? await rangees.first().getAttribute('href') : null
  if (versLecon) {
    await rangees.first().click()
    await expect.poll(() => page.url(), { timeout: 15_000 }).toContain(versLecon)
    await page.locator(PASTILLE).waitFor({ state: 'visible', timeout: 15_000 })
    vus.push({ ou: `liseuse ${versLecon}`, ...(await geo()) })
    /**
     * ⚠️ ON SORT PAR LE VRAI GESTE, PAS PAR `goBack()`. Le retour du navigateur
     * remontait jusqu'à la PAGE D'ÉCOUTE, où la pastille est volontairement
     * absente — la sonde attendait donc un élément qui ne doit pas être là, et
     * accusait l'app d'un défaut qui était le sien. Les liens de leçon portent
     * `replace`, exprès, pour que le geste de retour du téléphone sorte du
     * livre au lieu de refaire huit leçons à l'envers : une sonde qui s'appuie
     * sur l'historique s'appuie donc sur ce que l'app a justement choisi de ne
     * pas empiler.
     */
    await page.getByRole('link', { name: /Retour au module/ }).click()
    await page.locator(PASTILLE).waitFor({ state: 'visible', timeout: 15_000 })
  }

  await aLEtagere(page)
  vus.push({ ou: 'étagère', ...(await geo()) })

  const cases = page.locator(BAS)
  const nb = await cases.count()
  expect(nb, 'aucun lien dans la barre du bas : la sonde n’éprouverait rien').toBeGreaterThan(1)
  for (let i = 0; i < nb; i++) {
    const h = await cases.nth(i).getAttribute('href')
    if (!h || h.includes('menu=')) continue
    await cases.nth(i).click()
    await expect.poll(() => page.url(), { timeout: 15_000 }).toContain(h.split('?')[0])
    await page.locator(PASTILLE).waitFor({ state: 'visible', timeout: 15_000 })
    vus.push({ ou: h, ...(await geo()) })
  }
  console.log(JSON.stringify(vus, null, 1))

  const griefs = []
  for (const v of vus) {
    if (v.barreHaut !== null && v.pastilleBas > v.barreHaut)
      griefs.push(`${v.ou} : la pastille descend à ${v.pastilleBas}, la barre du bas commence à ${v.barreHaut}`)
    if (v.actionHaut !== null && v.pastilleBas > v.actionHaut)
      griefs.push(`${v.ou} : la pastille descend à ${v.pastilleBas}, le geste du jour commence à ${v.actionHaut}`)
    // Sans aucun meuble, elle doit être PRÈS du bas : c'est le défaut nommé
    // dans `ConteneurAction` — un geste qui flotte à 64 px du vide.
    if (v.barreHaut === null && v.actionHaut === null && v.ecran - v.pastilleBas > 44)
      griefs.push(
        `${v.ou} : aucun meuble en bas et la pastille s’arrête ${v.ecran - v.pastilleBas} px au-dessus du bord`,
      )
  }
  const avecGeste = vus.filter((v) => v.actionHaut !== null).length
  const sansMeuble = vus.filter((v) => v.barreHaut === null && v.actionHaut === null).length
  console.log(
    `éprouvé sur ${vus.length} écran(s) · ${avecGeste} avec un geste du jour · ${sansMeuble} sans aucun meuble`,
  )
  /**
   * ⚠️ CE QUE CETTE SONDE N'ÉPROUVE PAS, ET IL FAUT LE DIRE. Le repli « aucun
   * meuble en bas » — la marge gestuelle du téléphone — ne s'est présenté sur
   * AUCUN écran : même les pleines pages du livre portent une barre d'action,
   * posée au ras du bas. Ce chemin du code reste donc défensif et non mesuré.
   *
   * 🧭 Une première version EXIGEAIT ce cas et échouait de ne pas le trouver :
   * c'était demander à l'app d'avoir un écran qu'elle n'a pas. Ce qui protège
   * vraiment du test vide, c'est de compter les écrans VISITÉS et ceux qui
   * portaient un geste du jour — les deux chiffres ci-dessous.
   */
  expect(vus.length, 'trop peu d’écrans visités pour que ce test prouve quoi que ce soit').toBeGreaterThan(3)
  expect(avecGeste, 'aucun écran visité ne portait de geste du jour : le cas serré n’est pas éprouvé').toBeGreaterThan(0)

  expect(griefs, `ce qui cloche :\n  · ${griefs.join('\n  · ')}`).toEqual([])
})

test('la pastille met en pause, et sa croix met fin', async ({ page }) => {
  await ouvrirEcoute(page)
  await lancer(page)
  await auModule(page)

  await page.locator('[data-pastille-basculer]').click()
  await expect
    .poll(() => page.evaluate(() => document.querySelector('audio')?.paused), { timeout: 10_000 })
    .toBe(true)

  // Et elle repart : c'est une bascule, pas un bouton d'arrêt.
  await page.locator('[data-pastille-basculer]').click()
  await expect
    .poll(() => page.evaluate(() => !document.querySelector('audio')?.paused), { timeout: 15_000 })
    .toBe(true)

  /**
   * 🔴 LA CROIX EST LE SEUL ENDROIT OÙ L'ON DIT « J'AI FINI ». Puisque plus
   * aucune sortie d'écran n'arrête le son, sans elle on serait obligé de
   * mettre en pause avant de partir — et la pastille suivrait pour toujours.
   */
  await page.locator('[data-pastille-fermer]').click()
  await expect(page.locator(PASTILLE)).toHaveCount(0, { timeout: 10_000 })
  expect(
    await page.evaluate(() => document.querySelector('audio')?.paused ?? true),
    'la croix doit aussi faire taire le son, pas seulement cacher la pastille',
  ).toBe(true)
})
