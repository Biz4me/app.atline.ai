// DEUX LIEUX NE PORTENT JAMAIS LE MÊME DESSIN.
//
//   E2E_BASE=https://v2.atline.ai E2E_COMME=humanstring@gmail.com \
//     npx playwright test tests/glyphes-distincts.spec.cjs
//
// ── 🔴 LA PANNE QUE CE FICHIER EMPÊCHE DE REVENIR ─────────────────────────
//
// `icones.tsx` cherche le glyphe **par le LIBELLÉ** de l'entrée, et un libellé
// qu'il ne connaît pas retombe sur son repli : les deux silhouettes,
// c'est-à-dire l'icône de Contacts. **Ce n'est pas une erreur** — le repli est,
// par construction, un rendu valide. Rien ne compile de travers, rien ne crie,
// la console est muette.
//
// C'est arrivé une fois : Atlas est devenu un lieu le 8 novembre 2026 sans
// qu'on lui dessine un glyphe, et deux cases VOISINES de la barre ont porté le
// même dessin pendant des heures. Et c'est redevenu possible le 10 novembre,
// quand « Formation » a été renommée « Apprendre » : si la clé du glyphe
// n'avait pas suivi le libellé, la toque serait retombée sur les silhouettes.
//
// 🧭 D'OÙ UN CONTRÔLE SUR LA CLASSE, PAS SUR LE CAS. Il ne connaît le nom
// d'aucun lieu : il compare les DESSINS. Il protège donc tout renommage à
// venir, et tout lieu qu'on ajoutera.

const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

/**
 * L'empreinte d'un glyphe : la géométrie de son SVG, normalisée.
 *
 * ⚠️ PAS `outerHTML` : il porte la COULEUR, qui change avec l'état allumé.
 * Deux entrées identiques dont l'une est allumée auraient deux empreintes
 * différentes, et le doublon serait passé — exactement le cas du 8 novembre,
 * où l'entrée active était justement l'une des deux.
 */
const empreintes = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('nav[aria-label="Navigation principale"] a')].map((a) => {
      const svg = a.querySelector('svg')
      return {
        mot: a.textContent.trim(),
        dessin: svg
          ? [...svg.querySelectorAll('*')]
              .map((n) =>
                [
                  n.tagName,
                  n.getAttribute('d'),
                  n.getAttribute('cx'),
                  n.getAttribute('cy'),
                  n.getAttribute('r'),
                  n.getAttribute('x'),
                  n.getAttribute('y'),
                  n.getAttribute('width'),
                  n.getAttribute('height'),
                ].join('|'),
              )
              .join('§')
          : null,
      }
    }),
  )

/** Les empreintes qui apparaissent plus d'une fois. */
const doublons = (liste) => {
  const vus = new Map()
  for (const e of liste) vus.set(e.dessin, [...(vus.get(e.dessin) ?? []), e.mot])
  return [...vus.values()].filter((mots) => mots.length > 1)
}

test('chaque case de la barre porte un dessin qui n’appartient qu’à elle', async ({
  page,
  pageErrors,
}) => {
  await page.goto('/accueil', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('nav[aria-label="Navigation principale"] a').first()).toBeVisible({
    timeout: 20_000,
  })

  const liste = await empreintes(page)
  // 🔴 CE QU'ON ATTEND, DÉCLARÉ. Sans ce compte, une sonde qui ne trouve
  // AUCUNE case passerait au vert : zéro dessin, zéro doublon.
  expect(liste.length, 'la barre doit porter quatre cases').toBe(4)
  expect(
    liste.filter((e) => e.dessin === null).map((e) => e.mot),
    'une case sans aucun dessin',
  ).toEqual([])

  // 🔴 ON PROUVE QUE LE DÉTECTEUR DÉTECTE, sur les VRAIES empreintes : on
  // fabrique la collision que l'on surveille, et elle doit être vue.
  expect(
    doublons([...liste, { mot: 'copie', dessin: liste[0].dessin }]).length,
    'le détecteur ne verrait pas le doublon qu’il surveille',
  ).toBe(1)

  const trouves = doublons(liste)
  console.log(`  ${liste.length} cases : ${liste.map((e) => e.mot).join(' · ')}`)
  expect(
    trouves,
    `deux lieux portent le même dessin — un libellé a changé sans sa clé dans icones.tsx : ${trouves
      .map((m) => m.join(' = '))
      .join(' / ')}`,
  ).toEqual([])

  expect(pageErrors).toEqual([])
})

test('sur un lieu, le glyphe de l’en-tête est celui de sa case', async ({ page }) => {
  /**
   * 🔴 L'AUTRE MOITIÉ DU MÊME PIÈGE. `lieuDe` donne au titre centré le même
   * libellé, donc le même glyphe : si la clé manque, l'en-tête AUSSI tombe
   * sur les silhouettes, et un écran entier se met à dire « Contacts ».
   *
   * ⚠️ On compare un en-tête à une CASE, pas à une constante : la sonde ne
   * connaît toujours le nom d'aucun lieu.
   */
  await page.goto('/parcours', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 })

  const { titre, dansLaBarre } = await page.evaluate(() => {
    const geom = (svg) =>
      svg
        ? [...svg.querySelectorAll('*')].map((n) => `${n.tagName}|${n.getAttribute('d')}`).join('§')
        : null
    const h1 = document.querySelector('h1')
    const mot = h1.textContent.trim()
    const entree = [...document.querySelectorAll('nav[aria-label="Navigation principale"] a')].find(
      (a) => a.textContent.trim() === mot,
    )
    return {
      titre: geom(h1.closest('div')?.querySelector('svg') ?? h1.parentElement.querySelector('svg')),
      dansLaBarre: entree ? geom(entree.querySelector('svg')) : null,
    }
  })

  expect(titre, 'aucun glyphe dans l’en-tête — la sonde ne mesure rien').not.toBeNull()
  expect(dansLaBarre, 'le titre du lieu ne correspond à aucune case de la barre').not.toBeNull()
  expect(titre, 'l’en-tête et la case du même lieu portent deux dessins différents').toBe(
    dansLaBarre,
  )
})
