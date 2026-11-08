// TOUS LES ECRANS TIENNENT LA MEME COLONNE.
//
// 🔴 /coach/parler prenait toute la fenetre pendant que le reste tenait dans
// 430 px : l'app changeait de forme quand on ouvrait Atlas. Invisible sur un
// telephone — a 390 px tout le monde fait 390 — donc jamais vu tant qu'on ne
// regardait que des captures de telephone.
//
// 🧭 On mesure donc A 1200 PX, la seule largeur ou un cap manquant se voit.
const { test, expect } = require('../fixtures.cjs')

const ECRANS = [
  '/accueil', '/accueil?menu=1', '/parcours', '/parcours/cours',
  '/parcours/competences', '/coach/parler', '/coach/repeter', '/agenda', '/gens', '/compte',
]

test('aucun écran ne déborde de la colonne', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 })
  const larges = []
  for (const url of ECRANS) {
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(400)
    // La plus large boîte qui porte du contenu, juste sous <body>.
    const l = await page.evaluate(() => {
      const enfants = [...document.body.children].filter((e) => e.getBoundingClientRect().height > 50)
      return Math.round(Math.max(0, ...enfants.map((e) => e.getBoundingClientRect().width)))
    })
    console.log(`  ${url.padEnd(24)} ${l} px`)
    if (l > 431) larges.push(`${url} : ${l} px`)
  }
  expect(larges, 'des écrans débordent de la colonne de 430 px').toEqual([])
})
