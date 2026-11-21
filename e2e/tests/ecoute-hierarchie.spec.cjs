// LA PAGE D'ÉCOUTE DIT-ELLE OÙ L'ON EST, ET AUX BONNES TAILLES ?
//
//     E2E_BASE=https://v2.atline.ai npx playwright test tests/ecoute-hierarchie.spec.cjs
//
// Patrice, le 20 novembre 2026 : *« on a perdu un peu de clarté dans les pages
// audio »*, et surtout *« fais en sorte que rien ne choque ou soit décalé par
// rapport aux tailles de police »*. Cette dernière phrase est une règle, et
// une règle qu'aucun build ne vérifie.
//
// 🔴 CE QU'ON MESURE : le rang et le titre AU MÊME CORPS, séparés par la
// graisse — la composition déjà éprouvée dans la liseuse — et le thème un
// cran de l'échelle en dessous. Trois faits, et chacun casserait en silence.
//
// ⚠️ ET LES COULEURS SE LISENT SUR L'ÉLÉMENT, PAS SUR UNE CAPTURE. Sur le PNG
// de contrôle, « MODULE 1 » avait l'air d'avoir un « 1 » teal : c'était
// l'antialiasing sous-pixel du navigateur de test. Une couleur ne se juge
// jamais à l'œil sur une image compressée.
const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

/** Les six crans de l'échelle maison. Rien d'autre n'a le droit d'exister. */
const ECHELLE = [29, 23, 17, 15, 13, 11]

async function ouvrirEcoute(page) {
  await page.goto('/parcours', { waitUntil: 'domcontentloaded' })
  const href = await page.locator('a[data-module="1"]').getAttribute('href')
  await page.goto(href, { waitUntil: 'domcontentloaded' })
  const ecouter = page.getByRole('link', { name: 'Écouter' })
  await expect(ecouter).toBeVisible({ timeout: 20_000 })
  await ecouter.click()
  await page.locator('[data-titre-ecoute]').waitFor({ state: 'visible', timeout: 20_000 })
}

test('rang et titre au même corps, le thème un cran dessous', async ({ page }) => {
  await ouvrirEcoute(page)

  const m = await page.evaluate(() => {
    const px = (s) => Math.round(parseFloat(s))
    const lis = (sel) => {
      const e = document.querySelector(sel)
      if (!e) return null
      const s = getComputedStyle(e)
      return {
        corps: px(s.fontSize),
        graisse: Number(s.fontWeight),
        encre: s.color,
        texte: e.textContent.trim().slice(0, 50),
      }
    }
    return {
      rangEntete: lis('[data-rang-entete]'),
      rang: lis('[data-rang-ecoute]'),
      titre: lis('[data-titre-ecoute]'),
      theme: lis('[data-theme-ecoute]'),
      barre: (() => {
        const h = document.querySelector('[data-coquille] header')
        return h ? Math.round(h.getBoundingClientRect().height) : null
      })(),
    }
  })
  console.log(JSON.stringify(m, null, 1))

  const griefs = []
  /**
   * ── 🔴 `data-rang-entete` A ÉTÉ SUPPRIMÉ LE 21 NOVEMBRE 2026 ─────────────
   *
   * La barre du haut portait « MODULE 1 » en 11 majuscules, dans une barre de
   * 44 px. Patrice a demandé un gabarit unique — *« toutes les barres à la
   * même hauteur, texte centré avec icône »* — et ce rang était la dernière
   * forme à part : 65 px et un titre en 23 désormais, comme les 29 autres.
   *
   * 🧭 CE QUE CETTE SONDE GARDE EST L'ESSENTIEL : la hiérarchie DANS la page.
   * Le rang, le titre et le thème sous l'illustration ne doivent pas se
   * confondre, et c'est là que la clarté se joue — pas dans le chrome.
   * Le gabarit de la barre, lui, est tenu par `barre-du-haut.spec.cjs`.
   */
  if (!m.rang) griefs.push('pas de « Leçon N de M » sous l’illustration')
  if (!m.titre) griefs.push('pas de titre de leçon')
  if (!m.theme) griefs.push('pas de thème')

  if (m.rang && m.titre) {
    if (m.rang.corps !== m.titre.corps)
      griefs.push(`rang ${m.rang.corps} px contre titre ${m.titre.corps} px : deux niveaux là où il n’y en a qu’un`)
    if (m.rang.graisse >= m.titre.graisse)
      griefs.push(`la graisse ne les sépare pas (${m.rang.graisse} contre ${m.titre.graisse})`)
    if (m.rang.encre === m.titre.encre)
      griefs.push('le rang et le titre ont la même encre : rien ne dit lequel est le repère')
  }
  if (m.theme && m.titre) {
    const i = ECHELLE.indexOf(m.titre.corps)
    if (m.theme.corps >= m.titre.corps)
      griefs.push(`le thème (${m.theme.corps}) n’est pas sous le titre (${m.titre.corps})`)
    if (i === -1) griefs.push(`le titre est à ${m.titre.corps} px, hors de l’échelle ${ECHELLE}`)
    if (!ECHELLE.includes(m.theme.corps))
      griefs.push(`le thème est à ${m.theme.corps} px, hors de l’échelle ${ECHELLE}`)
  }
  /**
   * 🔴 CE CONTRÔLE EXIGEAIT UNE BARRE SOUS 48 PX, et il a eu raison deux
   * jours : la barre était tombée de 62 à 44 le 19 novembre, et il gardait
   * cette hauteur. Elle vaut 65 depuis le 21, par décision — le gabarit
   * unique. Une sonde qui défend un chiffre contre une décision n'est plus un
   * filet, c'est un frein. La hauteur est tenue ailleurs, sur les 30 écrans.
   */

  expect(griefs, `ce qui cloche :\n  · ${griefs.join('\n  · ')}`).toEqual([])
})

/**
 * ── 🔴 LE SECOND TEST DE CE FICHIER A ÉTÉ RETIRÉ LE 21 NOVEMBRE 2026 ───────
 *
 * Il vérifiait que `[data-rang-entete]` soit centré « dans la barre et pas
 * dans ce qui reste ». L'élément n'existe plus, et surtout **la question est
 * posée ailleurs, mieux** : `barre-du-haut.spec.cjs` mesure le centrage du
 * bloc sur les TRENTE écrans, pas sur un seul.
 *
 * 🧭 On ne le repointe pas, on le supprime : deux sondes qui posent la même
 * question finissent par se contredire, et c'est alors la plus ancienne qu'on
 * croit.
 */
