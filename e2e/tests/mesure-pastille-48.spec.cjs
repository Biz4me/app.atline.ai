// MESURE DE LA PASTILLE SIMPLIFIÉE (26 nov. 2026) — play à gauche, titre,
// liseuse ; plus de vignette, plus de trait ; carte à 48 px.
//
//   E2E_BASE=https://v2.atline.ai npx playwright test tests/mesure-pastille-48.spec.cjs
//
// 🔴 CE N'EST PAS UNE SONDE QUI VERROUILLE, c'est un relevé. Elle imprime les
// nombres et croque l'image, pour qu'on voie de nos yeux ce que le déploiement
// a posé. Les sondes qui ASSERTENT l'ancien monde (hauteur 64, vignette, trait)
// seront retendues séparément.
const { test, expect } = require('../fixtures.cjs')
const { lancer, ouvrirEcoute } = require('../son.cjs')

test.use({ viewport: { width: 390, height: 844 } })

const PASTILLE = '[data-pastille-ecoute]'

test('relevé de la pastille simplifiée', async ({ page, pageErrors }) => {
  test.setTimeout(240_000)

  await ouvrirEcoute(page)
  await lancer(page)

  // On quitte d'abord la feuille d'écoute (sinon elle intercepte les clics),
  // puis on gagne l'écran le plus serré du bas : la pastille y cohabite avec la
  // barre du bas.
  await page.getByRole('link', { name: /Retour au module/ }).click()
  await page.locator(PASTILLE).waitFor({ state: 'visible', timeout: 15_000 })
  await page.getByRole('link', { name: 'Retour à Apprendre' }).click()
  // 🔬 Morph `layoutId` (27 nov.) : en quittant `/ecouter`, PleinEcoute est tenu
  // monté ~500 ms et porte SA barre « Navigation du livre » — un `[data-barre-bas]`
  // nu matcherait alors DEUX éléments (mode strict). On vise la barre principale,
  // la seule qui compte sur l'étagère ; la mesure réelle a son `waitForTimeout`.
  await page
    .locator('[data-barre-bas][aria-label="Navigation principale"]')
    .waitFor({ state: 'visible', timeout: 15_000 })
  const gens = page.locator('[data-barre-bas] a[href="/gens"]')
  if ((await gens.count()) > 0) {
    await gens.first().click()
  }
  await page.locator(PASTILLE).waitFor({ state: 'visible', timeout: 15_000 })
  await page.waitForTimeout(600)

  const m = await page.evaluate(() => {
    const p = document.querySelector('[data-pastille-ecoute]')
    const card = document.querySelector('[data-pastille-carte]')
    const play = p.querySelector('[data-pastille-basculer]')
    const glyphe = play && play.querySelector('svg')
    const titre = p.querySelector('[data-pastille-vers-lecon]')
    const reste = p.querySelector('[data-pastille-reste]')
    const livre = p.querySelector('[data-pastille-lire]')
    const r = (el) => (el ? el.getBoundingClientRect() : null)
    const b = r(card), bp = r(play), bg = r(glyphe), bt = r(titre), br = r(reste), bl = r(livre)
    const barre = document.querySelector('[data-barre-bas]')
    const rbarre = r(barre)
    const round = (n) => (n == null ? null : Math.round(n))
    return {
      hauteurCarte: round(b && b.height),
      play: bp && { x: round(bp.x), w: round(bp.width) },
      glyphePlay: bg && { w: round(bg.width), h: round(bg.height) },
      titre: bt && { x: round(bt.x), w: round(bt.width) },
      reste: br && { x: round(br.x), w: round(br.width), texte: reste.textContent },
      livre: bl && { x: round(bl.x), w: round(bl.width) },
      ecartPlayTitre: bp && bt ? round(bt.x - (bp.x + bp.width)) : null,
      ecartTitreReste: bt && br ? round(br.x - (bt.x + bt.width)) : null,
      ecartResteLivre: br && bl ? round(bl.x - (br.x + br.width)) : null,
      ecartGaucheCarte: bp && b ? round(bp.x - b.x) : null,
      ecartDroiteCarte: bl && b ? round(b.right - bl.right) : null,
      ecartCarteBarre: b && rbarre ? round(rbarre.top - b.bottom) : null,
      aVignette: !!p.querySelector('[data-pastille-vignette]'),
      aTrait: !!p.querySelector('[data-pastille-progression]'),
      aReste: !!reste,
      aPlay: !!play,
      aLivre: !!livre,
    }
  })

  console.log('\n═══ RELEVÉ PASTILLE ═══\n' + JSON.stringify(m, null, 2) + '\n═══════════════════════')

  // Croquis serré de la seule pastille, et l'écran entier pour le contexte.
  await page.locator(PASTILLE).screenshot({ path: 'pastille-48-crop.png' })
  await page.screenshot({ path: 'pastille-48-ecran.png' })

  expect(pageErrors, `exception client : ${pageErrors.join(' · ')}`).toEqual([])
  expect(m.hauteurCarte, 'la carte doit faire 48').toBe(48)
  expect(m.aVignette, 'la vignette doit avoir disparu').toBe(false)
  expect(m.aTrait, 'le trait doit avoir disparu').toBe(false)
  expect(m.glyphePlay && m.glyphePlay.w, 'le glyphe play doit faire 40').toBe(40)
  expect(m.aReste, 'le temps restant doit être présent').toBe(true)
  expect(m.ecartCarteBarre, 'écart carte↔barre = 8').toBe(8)
  expect(m.aPlay && m.aLivre, 'play et liseuse présents').toBe(true)
})
