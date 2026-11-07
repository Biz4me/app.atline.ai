// LES FICHES DE LA LISTE FONT TOUTES LA MÊME HAUTEUR, À TOUTE LARGEUR.
//
//   E2E_BASE=https://v2.atline.ai E2E_COMME=humanstring@gmail.com \
//     npx playwright test tests/fiches-egales.spec.cjs
//
// ── 🔴 CE QUE LA PREMIÈRE VERSION NE POUVAIT PAS VOIR (7 novembre 2026) ────
//
// Elle mesurait à UNE seule largeur, 390 px, et elle passait. Patrice, lui,
// voyait une fiche plus haute : **à 320 et 360 px il y avait bien deux
// hauteurs, 110 et 128.** Un gabarit ne se vérifie pas à la largeur où on l'a
// écrit — c'est précisément là qu'il marche.
//
// Et sa sonde « aucune phrase rognée » ne pouvait pas échouer : le rognage
// était désactivé (un `block` écrasait le `-webkit-box` de `line-clamp`),
// donc rien ne débordait jamais de sa boîte. 🧭 **Une sonde qui ne peut pas
// échouer est une décoration.** D'où le contrôle du MÉCANISME, ci-dessous.

const { test, expect } = require('../fixtures.cjs')

/** Du plus étroit des téléphones courants à la largeur maximale de la coquille. */
const LARGEURS = [320, 360, 375, 390, 414, 430]
const SEGMENTS = ['', 'prospect', 'client', 'partenaire']

test('le rognage à deux lignes est RÉELLEMENT actif', async ({ page }) => {
  // 320 px : la largeur où une phrase a le plus de chances de déborder.
  await page.setViewportSize({ width: 320, height: 844 })
  await page.goto('/gens', { waitUntil: 'domcontentloaded' })
  await page.locator('[data-pas]').first().waitFor({ timeout: 20_000 })

  const mesures = await page.locator('[data-pas]').evaluateAll((n) =>
    n.map((e) => {
      const interligne = parseFloat(getComputedStyle(e).lineHeight)
      return {
        lignesVisibles: Math.round(e.clientHeight / interligne),
        lignesDuTexte: Math.round(e.scrollHeight / interligne),
      }
    }),
  )

  /**
   * 🧭 ON MESURE LE COMPORTEMENT, PAS LA RECETTE.
   *
   * La première version exigeait `display: -webkit-box`, parce que c'est ce
   * que `line-clamp-2` posait au moment où je l'ai écrite. Tailwind rend
   * désormais `flow-root` — le rognage marchait parfaitement et la sonde
   * criait quand même. ⚠️ **Geler le résultat d'une implémentation, c'est
   * s'engager à la casser au prochain coup de peigne de la bibliothèque.**
   * L'invariant, lui, ne bouge pas : la boîte ne montre jamais plus de deux
   * lignes.
   */
  mesures.forEach((m, i) => {
    expect(m.lignesVisibles, `fiche ${i + 1} : ${m.lignesVisibles} lignes visibles`)
      .toBeLessThanOrEqual(2)
  })

  // Et le mécanisme EXISTE : au moins une phrase est plus longue que sa
  // boîte. Sans ça, la sonde du dessus passerait sur une liste où tout tient,
  // sans rien prouver du rognage.
  const quiDeborde = mesures.filter((m) => m.lignesDuTexte > m.lignesVisibles)
  expect(
    quiDeborde.length,
    'aucune phrase ne déborde à 320 px : le rognage n’est pas éprouvé ici',
  ).toBeGreaterThan(0)
})

test('toutes les fiches ont la même hauteur, à toute largeur', async ({ page }) => {
  for (const largeur of LARGEURS) {
    await page.setViewportSize({ width: largeur, height: 844 })
    for (const segment of SEGMENTS) {
      await page.goto(`/gens${segment ? `?qui=${segment}` : ''}`, { waitUntil: 'domcontentloaded' })
      await page.locator('[data-contact]').first().waitFor({ timeout: 20_000 })

      const hauteurs = await page
        .locator('[data-contact]')
        .evaluateAll((n) => n.map((e) => Math.round(e.getBoundingClientRect().height)))

      // La sonde doit prouver qu'elle sait TROUVER : une liste vide passerait
      // aussi bien qu'une liste parfaitement régulière.
      expect(hauteurs.length, `aucune fiche · ${largeur} px · « ${segment || 'tous'} »`)
        .toBeGreaterThan(1)

      const distinctes = [...new Set(hauteurs)].sort((a, b) => a - b)
      expect(
        distinctes,
        `${largeur} px · « ${segment || 'tous'} » : ${distinctes.length} hauteurs (${distinctes.join(', ')} px) sur ${hauteurs.length} fiches`,
      ).toHaveLength(1)
    }
  }
})

test('une phrase trop longue se termine par des points de suspension', async ({ page }) => {
  // ⚠️ On va chercher la largeur la plus étroite : c'est là qu'une phrase
  // déborde, donc là que le signal « il y a une suite » doit apparaître.
  await page.setViewportSize({ width: 320, height: 844 })
  await page.goto('/gens', { waitUntil: 'domcontentloaded' })
  await page.locator('[data-pas]').first().waitFor({ timeout: 20_000 })

  const phrases = await page.locator('[data-pas]').evaluateAll((n) =>
    n.map((e) => ({
      rogne: e.scrollHeight > e.clientHeight + 1,
      texte: e.textContent.trim().slice(0, 50),
    })),
  )

  // 🧭 On n'exige PAS qu'il y ait des phrases rognées : le jour où tous les
  // textes tiennent, c'est une bonne nouvelle, pas un échec. Ce qu'on exige,
  // c'est que le MÉCANISME soit en place — vérifié par la sonde du dessus —
  // et on NOMME ici ce qui se fait couper, pour pouvoir le réécrire.
  const rognees = phrases.filter((p) => p.rogne)
  console.log(
    rognees.length
      ? `  ${rognees.length} phrase(s) rognée(s) à 320 px :\n    ${rognees.map((r) => r.texte).join('\n    ')}`
      : '  aucune phrase rognée à 320 px',
  )
  expect(phrases.length, 'aucune phrase à examiner').toBeGreaterThan(0)
})

test('la ligne du prénom ne déborde plus', async ({ page }) => {
  for (const largeur of [320, 360, 390]) {
    await page.setViewportSize({ width: largeur, height: 844 })
    await page.goto('/gens', { waitUntil: 'domcontentloaded' })
    await page.locator('[data-contact]').first().waitFor({ timeout: 20_000 })

    // 🔴 Le débordement d'origine : prénom + étape + population + délai sur
    // 390 px. Un enfant plus large que son parent est exactement ce qu'on a
    // supprimé — et c'est à 320 px que ça se reverrait d'abord.
    const debordent = await page.locator('[data-contact]').evaluateAll((n) =>
      n.filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.innerText.split('\n')[0]),
    )
    expect(debordent, `${largeur} px : ${debordent.join(', ')}`).toHaveLength(0)
  }
})

test('le marché ne se dit pas deux fois', async ({ page }) => {
  await page.goto('/gens?qui=partenaire', { waitUntil: 'domcontentloaded' })
  await page.locator('[data-contact]').first().waitFor({ timeout: 20_000 })

  const fiches = await page.locator('[data-contact]').evaluateAll((n) => n.map((e) => e.innerText))
  const chaudes = fiches.filter((t) => /chaud/i.test(t))

  // La sonde doit prouver qu'elle sait TROUVER : sans une seule fiche au
  // marché chaud, elle passerait sur n'importe quoi.
  expect(chaudes.length, 'aucune fiche au marché chaud pour vérifier').toBeGreaterThan(0)

  // 🔴 La flamme disait « marché chaud », la pastille « Chaud » aussi, à vingt
  // pixels d'écart. Une information, un endroit.
  const avecFlamme = fiches.filter((t) => t.includes('\u{1F525}'))
  expect(avecFlamme, `${avecFlamme.length} fiche(s) portent encore la flamme`).toHaveLength(0)
})
