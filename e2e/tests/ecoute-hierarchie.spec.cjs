// LA PAGE D'ÉCOUTE DIT-ELLE OÙ L'ON EST, ET AUX BONNES TAILLES ?
//
//     E2E_BASE=https://v2.atline.ai npx playwright test tests/ecoute-hierarchie.spec.cjs
//
// Patrice, le 20 novembre 2026 : *« fais en sorte que rien ne choque ou soit
// décalé par rapport aux tailles de police »*. Cette phrase est une règle, et
// une règle qu'aucun build ne vérifie.
//
// 🔴 CE QU'ON MESURE, DEPUIS LE 25 NOVEMBRE 2026 : sous le curseur, le module
// en gras SURMONTE le titre de la leçon qui défile — le même bloc que la
// pastille. Ce qui les sépare est le POIDS et l'ENCRE (les deux à 17), et
// l'ORDRE. Le « Leçon N de M » reste, lui, sous la pochette.
//
// ⚠️ ET LES COULEURS SE LISENT SUR L'ÉLÉMENT, PAS SUR UNE CAPTURE. Sur un PNG,
// l'antialiasing sous-pixel invente des teintes. Une couleur ne se juge jamais
// à l'œil sur une image compressée.
const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

/**
 * Les crans de l'échelle maison. Rien d'autre n'a le droit d'exister.
 * 🔴 LE 19 EST ARRIVÉ LE 25 NOVEMBRE 2026 — le thème du module sous le curseur.
 * Patrice l'introduit en sachant que le compte redescendra à six quand une
 * autre taille sortira ; en attendant, elle est légitime et doit être listée.
 */
const ECHELLE = [29, 23, 21, 17, 15, 13, 11]

async function ouvrirEcoute(page) {
  await page.goto('/parcours', { waitUntil: 'domcontentloaded' })
  const href = await page.locator('a[data-module="1"]').getAttribute('href')
  await page.goto(href, { waitUntil: 'domcontentloaded' })
  const ecouter = page.getByRole('link', { name: 'Écouter' })
  await expect(ecouter).toBeVisible({ timeout: 20_000 })
  await ecouter.click()
  await page.locator('[data-titre-ecoute]').waitFor({ state: 'visible', timeout: 20_000 })
}

test('sous le curseur, le module en gras surmonte le titre qui défile', async ({ page }) => {
  await ouvrirEcoute(page)

  const m = await page.evaluate(() => {
    /**
     * ── 🔴 DEUX ÉCRANS SONT MONTÉS : L'ÉCOUTE EST UNE FEUILLE ────────────
     * Posée sur la couverture du module, les deux vivent en même temps, et
     * `document.querySelector` rend celui de DERRIÈRE. On mesure dans la
     * feuille quand il y en a une ; à l'adresse directe, c'est le document.
     */
    const racine = document.querySelector('[data-feuille-ecoute]') ?? document
    const px = (s) => Math.round(parseFloat(s))
    const lis = (sel) => {
      const e = racine.querySelector(sel)
      if (!e) return null
      const s = getComputedStyle(e)
      return {
        corps: px(s.fontSize),
        graisse: Number(s.fontWeight),
        encre: s.color,
        top: Math.round(e.getBoundingClientRect().top),
        texte: e.textContent.trim().slice(0, 50),
      }
    }
    return {
      // Sous la POCHETTE : « Leçon N de M » (RangEcoute), inchangé.
      rang: lis('[data-rang-ecoute]'),
      /**
       * ── 🔴 SOUS LE CURSEUR : DEUX LIGNES, LE MÊME BLOC QUE LA PASTILLE ──
       * Patrice, le 25 novembre 2026 : *« sous le curseur on met Le pourquoi
       * [le thème] et dessous le titre de la leçon »*. Le thème a quitté la
       * barre du haut (épurée) pour se poser ICI, en gras, au-dessus du titre
       * qui défile. Ce qui les sépare n'est ni la taille (les deux à 17) ni la
       * place : c'est le POIDS et l'ENCRE — la doctrine maison. Le module porte
       * `data-pastille-ligne="rang"`, le titre `data-titre-ecoute`.
       */
      module: lis('.lecteur-ecoute [data-pastille-ligne="rang"]'),
      titre: lis('.lecteur-ecoute [data-titre-ecoute]'),
      /**
       * 🔴 LE THÈME NE DOIT ÊTRE ÉCRIT NULLE PART AILLEURS SUR CET ÉCRAN. Il
       * a vécu sous l'image, puis dans la barre du haut ; il est maintenant la
       * ligne du module sous le curseur. On vérifie qu'il n'est revenu ni sous
       * l'illustration, ni EN CLAIR dans la barre du haut — laquelle garde un
       * `h1` en `sr-only` (masqué à l'œil, lisible par la machine), c'est voulu.
       */
      themeSousLImage: lis('[data-theme-ecoute]'),
      enteteH1Visible: (() => {
        const h = racine.querySelector('[data-coquille] header h1')
        if (!h) return null
        const s = getComputedStyle(h)
        // `sr-only` se reconnaît à sa boîte de 1 px en `position: absolute`.
        return !(s.position === 'absolute' && px(s.width) <= 1)
      })(),
      /**
       * 🔴 LA RÉSERVE DU LECTEUR VAUT SA HAUTEUR RÉELLE. Il est `fixed`, la
       * page lui réserve sa place par un `calc()` ; une somme peut se tromper
       * sans bruit le jour où une rangée s'ajoute. Elle est restée de 2 lignes
       * en passant d'« un titre sur deux lignes » à « module + titre ».
       */
      reserve: (() => {
        const reg = [...document.querySelectorAll('div')].find(
          (e) => getComputedStyle(e).overflowY === 'auto',
        )
        const lect = document.querySelector('.lecteur-ecoute')
        if (!reg || !lect) return null
        return [
          Math.round(parseFloat(getComputedStyle(reg).paddingBottom)),
          Math.round(lect.getBoundingClientRect().height),
        ]
      })(),
    }
  })
  console.log(JSON.stringify(m, null, 1))

  const griefs = []
  if (!m.rang) griefs.push('pas de « Leçon N de M » sous l’illustration')
  if (!m.module) griefs.push('pas de ligne de module sous le curseur')
  if (!m.titre) griefs.push('pas de titre de leçon sous le curseur')

  if (!m.reserve) griefs.push('la réserve du lecteur ne se mesure pas')
  else if (Math.abs(m.reserve[0] - m.reserve[1]) > 1)
    griefs.push(`la page réserve ${m.reserve[0]} px au lecteur, qui en fait ${m.reserve[1]}`)

  if (m.themeSousLImage) griefs.push(`le thème est revenu sous l'image : « ${m.themeSousLImage.texte} »`)
  if (m.enteteH1Visible)
    griefs.push('le titre du module est redevenu visible dans la barre du haut : elle devait rester nue')

  /**
   * ── 🔴 LA HIÉRARCHIE S'EST INVERSÉE LE 25 NOVEMBRE 2026 ─────────────────
   *
   * Un lecteur de musique met le TITRE en avant ; Patrice a choisi l'inverse,
   * comme la pastille : le MODULE est le repère (gras, pleine encre), le titre
   * de la leçon est le sujet qui défile (poids normal, gris). Les deux sont au
   * même corps (17) — ce qui les sépare est le poids + l'encre, et l'ORDRE : le
   * module AU-DESSUS du titre. C'est ce que cette sonde tient désormais, à la
   * place de l'ancien couple « rang sous la pochette / titre en gras ».
   */
  if (m.module && m.titre) {
    if (m.module.graisse <= m.titre.graisse)
      griefs.push(`la graisse ne les sépare pas (module ${m.module.graisse}, titre ${m.titre.graisse})`)
    if (m.module.encre === m.titre.encre)
      griefs.push('le module et le titre ont la même encre : rien ne dit lequel est le repère')
    if (m.module.top >= m.titre.top)
      griefs.push(`le module (${m.module.top}) n’est pas au-dessus du titre (${m.titre.top})`)
  }

  // L'échelle maison : rien hors des six crans. Le rang, le module et le titre
  // sont tous à 17 (--text-lecture).
  for (const [quoi, v] of [['le rang', m.rang], ['le module', m.module], ['le titre', m.titre]])
    if (v && !ECHELLE.includes(v.corps))
      griefs.push(`${quoi} est à ${v.corps} px, hors de l’échelle ${ECHELLE}`)

  expect(griefs, `ce qui cloche :\n  · ${griefs.join('\n  · ')}`).toEqual([])
})

/**
 * ── 🔴 LE SECOND TEST DE CE FICHIER A ÉTÉ RETIRÉ LE 21 NOVEMBRE 2026 ───────
 *
 * Il vérifiait que `[data-rang-entete]` soit centré « dans la barre et pas
 * dans ce qui reste ». L'élément n'existe plus, et surtout **la question est
 * posée ailleurs, mieux** : `barre-du-haut.spec.cjs` mesure le centrage du
 * bloc sur les TRENTE écrans, pas sur un seul.
 */
