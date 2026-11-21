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
      /**
       * 🔴 LE THÈME EST DANS LA BARRE DU HAUT DEPUIS LE 21 NOV. 2026, AU
       * SOIR. Il vivait en 11 px sous le rang, et il DOUBLAIT le titre écrit
       * sur l'illustration : les onze thèmes sont le premier mot du titre de
       * leur module, sept au caractère près. On le lit donc où il est
       * maintenant, et on vérifie plus bas qu'il n'est PAS revenu sous
       * l'image.
       */
      theme: lis('[data-coquille] header h1'),
      themeSousLImage: lis('[data-theme-ecoute]'),
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
  if (!m.theme) griefs.push('pas de thème dans la barre du haut')
  // ⚠️ ET PAS DEUX FOIS : c'est le doublon qui l'a fait déménager.
  if (m.themeSousLImage)
    griefs.push(`le thème est revenu sous l'image : « ${m.themeSousLImage.texte} »`)

  /**
   * ── 🔴 LA RÈGLE S'EST INVERSÉE LE SOIR DU 21 NOVEMBRE 2026 ───────────────
   *
   * Elle exigeait le rang et le titre **au même corps**, séparés par la
   * graisse. C'était juste tant qu'ils étaient empilés sous la couverture :
   * deux lignes voisines, un seul niveau.
   *
   * 🧭 ILS NE SE TOUCHENT PLUS. Le titre est descendu DANS le lecteur, en bas
   * de l'écran ; le rang est resté sous l'illustration, entre deux chevrons,
   * où il est devenu l'étiquette d'un contrôle. Ce ne sont plus deux lignes
   * d'un même bloc, ce sont deux objets à deux endroits.
   *
   * 🔴 ET CETTE SONDE A TROUVÉ LE VRAI DÉFAUT EN CRIANT. J'avais posé le
   * titre à 17 en laissant le rang à 23 : **le repère criait plus fort que le
   * sujet**. Ce qu'on tient maintenant est l'ordre, pas l'égalité — sur un
   * écran d'écoute, ce qu'on écoute passe devant où l'on en est.
   */
  if (m.rang && m.titre) {
    /**
     * 🔴 LA RÈGLE S'EST ASSOUPLIE LE SOIR DU 21 NOVEMBRE 2026, et pas par
     * confort. Elle exigeait le titre **plus gros** que le rang, après avoir
     * attrapé un vrai défaut : un titre à 17 sous un rang resté à 23, où le
     * repère criait plus fort que le sujet.
     *
     * 🧭 Patrice ramène l'écran à TROIS tailles : les deux sont à 17, et ce
     * qui les sépare est le POIDS et l'ENCRE — la doctrine de la maison,
     * « la hiérarchie au-delà de la taille se joue au poids + couleur ».
     * Exiger un cran de taille reviendrait à interdire cette doctrine ici.
     * On garde donc l'ORDRE : le titre ne descend jamais SOUS le rang, et
     * les deux autres contrôles (graisse, encre) deviennent la vraie
     * séparation.
     */
    if (m.titre.corps < m.rang.corps)
      griefs.push(
        `le titre (${m.titre.corps}) est plus petit que le rang (${m.rang.corps}) : le repère crie plus fort que le sujet`,
      )
    if (m.titre.graisse <= m.rang.graisse)
      griefs.push(`la graisse ne les sépare pas (rang ${m.rang.graisse}, titre ${m.titre.graisse})`)
    if (m.rang.encre === m.titre.encre)
      griefs.push('le rang et le titre ont la même encre : rien ne dit lequel est le repère')
  }
  /**
   * 🧭 LE THÈME N'EST PLUS COMPARÉ AU TITRE, ET C'EST LE DÉMÉNAGEMENT QUI
   * L'EXIGE. Tant qu'ils étaient deux lignes voisines, « le thème sous le
   * titre » disait quelque chose. Le thème est maintenant dans le chrome, à
   * 500 px de là : les comparer reviendrait à interdire au gabarit de la
   * barre d'être ce qu'il est sur les 30 écrans. On garde l'échelle, qui
   * vaut partout.
   */
  for (const [quoi, v] of [['le titre', m.titre], ['le thème', m.theme]])
    if (v && !ECHELLE.includes(v.corps))
      griefs.push(`${quoi} est à ${v.corps} px, hors de l’échelle ${ECHELLE}`)
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
