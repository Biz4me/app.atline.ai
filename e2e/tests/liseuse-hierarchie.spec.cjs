// TROIS TAILLES, UN CRAN D'ÉCART, UN SEUL GRIS.
//
//     E2E_BASE=https://v2.atline.ai E2E_COMME=humanstring@gmail.com \
//       npx playwright test tests/liseuse-hierarchie.spec.cjs
//
// ── 🔴 CE QUE PATRICE A DEMANDÉ, ET POURQUOI ÇA SE MESURE ─────────────────
//
// Le 20 novembre 2026 : *« ainsi on a 3 tailles qui se séparent de 1 taille
// d'écart : leçon numéro et titre, paragraphe, et texte »*. Notre échelle a
// six crans — 29 / 23 / 17 / 15 / 13 / 11 — et la liseuse en prend trois
// CONSÉCUTIFS : 23, 17, 15.
//
// 🧭 UNE HIÉRARCHIE EST UN RAPPORT, PAS UNE LISTE DE NOMBRES. On n'écrit donc
// pas « 23 » dans les assertions : on vérifie que le rang égale le titre, que
// le titre dépasse les titres de paragraphe, et que ceux-ci dépassent le
// corps. Le jour où l'échelle entière bouge, cette sonde suit sans mentir ;
// le jour où quelqu'un casse un rapport, elle parle.
//
// ⚠️ ET LA TAILLE DU CORPS EST RÉGLABLE. Le curseur des options la pousse de
// 15 à 28 px. La sonde lit donc l'écran tel qu'il arrive, sans toucher au
// curseur — une mesure prise après un réglage ne dirait rien du défaut.
const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

/** La première leçon du premier module de l'étagère. */
async function ouvrirUneLecon(page) {
  await page.goto('/parcours', { waitUntil: 'domcontentloaded' })
  const versModule = await page.locator('[data-module="1"]').getAttribute('href')
  await page.goto(versModule, { waitUntil: 'domcontentloaded' })
  const lire = page.getByRole('link', { name: 'Lire' })
  await expect(lire).toBeVisible({ timeout: 20_000 })
  await lire.click()
  await page.locator('[data-rang]').waitFor({ state: 'visible', timeout: 20_000 })
}

test('trois tailles consécutives, et le gris ne dit qu’une chose', async ({ page, pageErrors }) => {
  await ouvrirUneLecon(page)

  const vu = await page.evaluate(() => {
    const lire = (sel) => {
      const n = document.querySelector(sel)
      if (!n) return null
      const s = getComputedStyle(n)
      return { px: parseFloat(s.fontSize), couleur: s.color, texte: n.textContent.slice(0, 30) }
    }
    return {
      rang: lire('[data-rang]'),
      titre: lire('[data-titre-lecon]'),
      intro: lire('[data-intro]'),
      // Le premier titre de paragraphe et le premier paragraphe du corps.
      paragrapheTitre: lire('article h2'),
      corps: lire('article p'),
      pied: lire('[data-pied-precedent], [data-pied-suivant], [data-pied-fin]'),
    }
  })

  for (const [nom, v] of Object.entries(vu)) {
    console.log(`  ${nom.padEnd(16)} ${v ? `${v.px} px · ${v.couleur}` : '— absent'}`)
  }

  expect(vu.rang, 'le rang « Leçon N de M » est introuvable').toBeTruthy()
  expect(vu.titre, 'le titre de la leçon est introuvable').toBeTruthy()
  expect(vu.corps, 'aucun paragraphe de corps').toBeTruthy()

  // ── LES TROIS CRANS ──
  expect(vu.rang.px, 'le rang et le titre doivent être au même corps').toBe(vu.titre.px)
  expect(
    vu.titre.px,
    `le titre (${vu.titre.px}) doit dépasser les titres de paragraphe (${vu.paragrapheTitre?.px})`,
  ).toBeGreaterThan(vu.paragrapheTitre.px)
  expect(
    vu.paragrapheTitre.px,
    `un titre de paragraphe (${vu.paragrapheTitre.px}) doit dépasser le corps (${vu.corps.px})`,
  ).toBeGreaterThan(vu.corps.px)

  // ── L'INTRO EST DU TEXTE DE LEÇON ──
  // 🔴 Elle était à 17 en gris : une TROISIÈME forme entre le titre et le
  // corps, qui lui donnait un statut qu'elle n'a pas.
  if (vu.intro) {
    expect(vu.intro.px, "l'intro doit être au corps du texte").toBe(vu.corps.px)
    expect(vu.intro.couleur, "l'intro doit porter l'encre du texte").toBe(vu.corps.couleur)
  }

  // ── UN SEUL GRIS ──
  expect(vu.titre.couleur, 'le titre porte l’encre, pas le gris').toBe(vu.corps.couleur)
  expect(vu.rang.couleur, 'le rang est le SEUL gris de la page').not.toBe(vu.corps.couleur)

  // ── LE PIED DE CHAPITRE, À LA TAILLE INTERMÉDIAIRE ──
  expect(vu.pied, 'le pied de chapitre est introuvable').toBeTruthy()
  expect(
    vu.pied.px,
    `le pied (${vu.pied.px}) appartient à la page lue : taille intermédiaire, pas celle du chrome`,
  ).toBe(vu.paragrapheTitre.px)

  expect(pageErrors, `exception client : ${pageErrors.join(' · ')}`).toHaveLength(0)
})

/**
 * ── 🔴 ET SURTOUT AU DERNIER CRAN DU CURSEUR ──────────────────────────────
 *
 * C'est là que le défaut vivait. Les crans sont 15 · 17 · 19 · 21 · 24 · 28,
 * les titres de paragraphe valent le corps + 2, et le titre de la leçon était
 * FIGÉ à 23. À partir du cran 21 les titres de paragraphe l'atteignaient ; au
 * dernier ils le dépassaient — 30 contre 23.
 *
 * 🧭 **LA MOITIÉ DES RÉGLAGES INVERSAIT LA HIÉRARCHIE**, et la valeur par
 * défaut est précisément celle où tout va bien. Un test qui ne lit que l'écran
 * tel qu'il arrive aurait été vert pour toujours.
 */
test('les trois crans tiennent aussi au plus gros réglage', async ({ page }) => {
  await ouvrirUneLecon(page)

  // ⚠️ On pose la préférence APRÈS avoir chargé la page : la clé vit dans le
  // `localStorage` de l'origine, et on ne peut l'écrire qu'une fois dessus.
  await page.evaluate(() => localStorage.setItem('atline.lecture-taille', '28'))
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.locator('[data-rang]').waitFor({ state: 'visible', timeout: 20_000 })

  const vu = await page.evaluate(() => {
    const px = (sel) => {
      const n = document.querySelector(sel)
      return n ? parseFloat(getComputedStyle(n).fontSize) : null
    }
    return {
      titre: px('[data-titre-lecon]'),
      paragrapheTitre: px('article h2'),
      corps: px('article p'),
    }
  })
  console.log(`  au cran 28 — titre ${vu.titre} · paragraphe ${vu.paragrapheTitre} · corps ${vu.corps}`)

  // On repose le curseur avant de juger : une assertion qui tombe ne doit pas
  // laisser la préférence du compte de test au maximum.
  await page.evaluate(() => localStorage.removeItem('atline.lecture-taille'))

  expect(vu.corps, 'le curseur n’a pas pris : le corps est resté au défaut').toBe(28)
  expect(
    vu.paragrapheTitre,
    `les titres de paragraphe (${vu.paragrapheTitre}) doivent rester sous le titre (${vu.titre})`,
  ).toBeLessThan(vu.titre)
  expect(
    vu.corps,
    `le corps (${vu.corps}) doit rester sous les titres de paragraphe (${vu.paragrapheTitre})`,
  ).toBeLessThan(vu.paragrapheTitre)
})

test('le pied de chapitre mène quelque part, et sans empiler l’historique', async ({ page }) => {
  await ouvrirUneLecon(page)

  const suivant = page.locator('[data-pied-suivant]')
  await expect(suivant, 'la première leçon doit proposer la suivante').toBeVisible()

  // ⚠️ Sur la PREMIÈRE leçon, il n'y a pas de précédente : la cellule de
  // gauche reste vide pour que le lien de droite ne glisse pas à gauche.
  await expect(page.locator('[data-pied-precedent]')).toHaveCount(0)

  const depart = page.url()
  const profondeurAvant = await page.evaluate(() => history.length)
  await suivant.scrollIntoViewIfNeeded()
  await suivant.click()
  await page.waitForURL((u) => u.toString() !== depart, { timeout: 15_000 })

  // 🔴 `replace` ET JAMAIS `push`. Un `push` par leçon ferait repasser le
  // geste « retour » du téléphone une à une par les six leçons qu'on vient de
  // lire, au lieu de sortir du module.
  expect(
    await page.evaluate(() => history.length),
    'le pied doit remplacer l’entrée d’historique, pas en empiler une',
  ).toBe(profondeurAvant)

  // Et de là, le retour existe.
  await expect(page.locator('[data-pied-precedent]')).toBeVisible()
})
