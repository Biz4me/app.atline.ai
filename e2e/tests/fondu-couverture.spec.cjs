// LE REFLET DE LA COUVERTURE EXISTE, ET IL MEURT SANS LAISSER DE TRAIT.
//
//   E2E_BASE=https://v2.atline.ai npx playwright test tests/fondu-couverture.spec.cjs
//
// ── 🔴 CE QU'ELLE TIENT ────────────────────────────────────────────────────
//
// Patrice, le 21 novembre 2026, deux captures côte à côte : *« le fond gris
// sur la capture 2, on le met sur audio aussi, et dans ce cas améliore le
// fondu car cela fait une coupure sous l'illustration trop verticale »*.
//
// 🧭 CE DÉFAUT EST UNE DÉRIVÉE, PAS UNE COULEUR. Le fondu d'avant était
// pourtant CONTINU : il allait de la teinte à la couleur de la page sans
// sauter. Ce qui se voyait, c'est que sa PENTE, elle, s'arrêtait net au bord
// de sa boîte — la teinte devait mourir en 24 px sous l'image. Relevé dans le
// creux entre deux couvertures avant correction : **70 de luminance au bas de
// l'image, 15 deux pixels plus bas, et plus rien ensuite.**
//
// Aucun contrôle de style n'aurait parlé : la règle CSS était valide et les
// couleurs étaient celles de la charte. On mesure donc la seule chose qui
// décrit le défaut — **la marche la plus haute entre deux pixels voisins**,
// en descendant une colonne de l'écran.
const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

/**
 * La colonne qu'on descend : le creux entre deux couvertures.
 *
 * ⚠️ PAS LE BORD DE L'ÉCRAN. Sur l'accueil d'un module le carrousel est en
 * pleine largeur, donc à x = 8 on est DANS la couverture voisine et on mesure
 * une photographie. L'écart de 20 px entre deux diapositives, lui, ne montre
 * que le reflet, et il tombe au même endroit sur les deux écrans.
 */
const X = 310

/** La marche tolérée entre deux pixels voisins, en luminance sur 255. */
const MARCHE = 3
/** De combien le reflet doit dépasser la page pour qu'on dise qu'il existe. */
const PRESENCE = 8

/**
 * ── 🔴 ON ÉTEINT L'ÉCRAN AUTOUR DU CALQUE AVANT DE MESURER ─────────────────
 *
 * Première version : la colonne traversait la page telle quelle. Elle a
 * attrapé une marche de 28 niveaux sur l'écoute et de 6 sur le module, et les
 * deux étaient JUSTES — c'étaient le curseur du lecteur et une ligne de texte.
 * Elle relevait aussi « couleur de page : 148 », qui était le bouton Écouter.
 *
 * 🧭 UNE SONDE QUI MESURE AUTRE CHOSE QUE SON SUJET NE PEUT PAS AVOIR RAISON.
 * On cache donc tout, puis on rallume le seul calque du reflet : ce qui reste
 * à l'écran est exactement ce dont on parle, sur toute la hauteur, et la
 * couleur de page se lit n'importe où en bas.
 */
const isoler = (page) =>
  page.evaluate(() => {
    const fond = document.querySelector('[data-reflet-couverture]')
    if (!fond) return false
    document.querySelectorAll('body *').forEach((e) => {
      e.style.visibility = 'hidden'
    })
    fond.style.visibility = 'visible'
    fond.querySelectorAll('*').forEach((e) => {
      e.style.visibility = 'visible'
    })
    // Le contenu du bloc n'est pas le calque : il se rhabille.
    const contenu = fond.querySelector('[data-reflet-contenu]')
    if (contenu) contenu.style.visibility = 'hidden'
    return true
  })

/** La luminance de chaque pixel d'une colonne de la capture. */
const colonne = async (page, x) => {
  const buf = await page.screenshot()
  return page.evaluate(
    async ({ b64, x }) => {
      const img = new Image()
      img.src = 'data:image/png;base64,' + b64
      await img.decode()
      const c = document.createElement('canvas')
      c.width = img.width
      c.height = img.height
      const g = c.getContext('2d')
      g.drawImage(img, 0, 0)
      const d = g.getImageData(x, 0, 1, img.height).data
      const out = []
      for (let y = 0; y < img.height; y++)
        out.push(Math.round(0.2126 * d[y * 4] + 0.7152 * d[y * 4 + 1] + 0.0722 * d[y * 4 + 2]))
      return out
    },
    { b64: buf.toString('base64'), x },
  )
}

const eprouver = async (page, nom, griefs) => {
  if (!(await isoler(page))) {
    griefs.push(`${nom} : aucun calque de reflet sur cet écran`)
    return
  }
  const p = await colonne(page, X)
  const fin = p.length - 1
  // Tout est éteint : le dernier pixel de la colonne EST la couleur de page.
  const niveauPage = p[fin]
  const sommet = Math.max(...p)

  let pire = 0
  let ou = 0
  for (let y = 1; y <= fin; y++) {
    const d = Math.abs(p[y] - p[y - 1])
    if (d > pire) {
      pire = d
      ou = y
    }
  }
  // Où le reflet redevient la page : la longueur réelle du fondu.
  let eteint = fin
  while (eteint > 0 && Math.abs(p[eteint - 1] - niveauPage) <= 1) eteint--

  console.log(
    `  ${nom} · ${fin + 1} px mesurés · page ${niveauPage} · sommet ${sommet} · ` +
      `éteint à y=${eteint} · marche max ${pire} à y=${ou}`,
  )

  /**
   * ⚠️ ON VÉRIFIE D'ABORD QUE LE REFLET EST LÀ. Sans ça, cette sonde passerait
   * au vert sur un écran qui n'a plus de fond du tout — un aplat n'a aucune
   * marche. C'est la règle déjà écrite ailleurs dans ce dossier : un contrôle
   * d'absence ne vaut que si la sonde a trouvé la chose.
   */
  if (sommet - niveauPage < PRESENCE)
    griefs.push(
      `${nom} : le reflet ne dépasse la page que de ${sommet - niveauPage} niveaux — il a disparu`,
    )
  if (pire > MARCHE)
    griefs.push(`${nom} : une marche de ${pire} niveaux à y=${ou}, le fondu laisse un trait`)
  /**
   * ⚠️ ET IL DOIT FINIR. Un fondu qui n'atteint jamais la page n'a pas de
   * trait non plus — il teinte tout l'écran, ce qui est l'autre façon de rater
   * la même chose.
   */
  if (eteint > 700) griefs.push(`${nom} : la teinte court encore à y=${eteint}, elle ne finit pas`)
}

test('le reflet de la couverture s’éteint sans laisser de trait', async ({ page, pageErrors }) => {
  const griefs = []

  await page.goto('/parcours', { waitUntil: 'domcontentloaded' })
  const href = await page.locator('a[data-module="2"]').getAttribute('href')
  await page.goto(href, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-carrousel-modules]')).toBeVisible({ timeout: 20_000 })
  await page.waitForTimeout(1200)
  await eprouver(page, 'accueil du module', griefs)

  // Et l'écran d'écoute, qui porte le même calque depuis le 21 novembre 2026.
  // 🔴 On y va par l'adresse : l'écran vient d'être éteint pour la mesure, et
  // un lien invisible ne se clique pas.
  await page.goto(href.replace(/\/$/, '') + '', { waitUntil: 'domcontentloaded' })
  await page.getByRole('link', { name: 'Écouter' }).click()
  await expect(page.locator('[data-carrousel-modules] [aria-current] img')).toBeVisible({
    timeout: 20_000,
  })
  await page.waitForTimeout(1200)
  await eprouver(page, 'écoute', griefs)

  expect(griefs, `ce qui cloche :\n  · ${griefs.join('\n  · ')}`).toEqual([])
  expect(pageErrors, `exception client : ${pageErrors.join(' · ')}`).toEqual([])
})
