// LES FICHES DE LA LISTE FONT TOUTES LA MÊME HAUTEUR — et aucune phrase
// n'est coupée pour y arriver.
//
//   E2E_BASE=https://v2.atline.ai E2E_COMME=humanstring@gmail.com \
//     npx playwright test tests/fiches-egales.spec.cjs
//
// 🧭 DEUX SONDES, ET IL EN FAUT DEUX. Le gabarit garantit la HAUTEUR ;
// il ne garantit pas qu'on n'a pas obtenu cette hauteur en rognant une
// phrase. Or couper une phrase lui retire sa RAISON — et c'est tout ce qui
// la distingue d'un libellé d'état, ce que la maison refuse depuis le début.
// La première sonde passerait très bien sur une liste entièrement tronquée.

const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

const SEGMENTS = ['', 'prospect', 'client', 'partenaire']

test('toutes les fiches ont exactement la même hauteur', async ({ page }) => {
  for (const segment of SEGMENTS) {
    await page.goto(`/gens${segment ? `?qui=${segment}` : ''}`, { waitUntil: 'domcontentloaded' })
    await page.locator('[data-contact]').first().waitFor({ timeout: 20_000 })

    const hauteurs = await page
      .locator('[data-contact]')
      .evaluateAll((n) => n.map((e) => Math.round(e.getBoundingClientRect().height)))

    // La sonde doit prouver qu'elle sait TROUVER : une liste vide passerait
    // aussi bien qu'une liste parfaitement régulière.
    expect(hauteurs.length, `aucune fiche sur « ${segment || 'tous'} »`).toBeGreaterThan(1)

    const distinctes = [...new Set(hauteurs)]
    expect(
      distinctes,
      `« ${segment || 'tous'} » : ${distinctes.length} hauteurs différentes (${distinctes.sort((a, b) => a - b).join(', ')} px) sur ${hauteurs.length} fiches`,
    ).toHaveLength(1)
  }
})

test('aucune phrase du prochain pas n’est rognée', async ({ page }) => {
  for (const segment of SEGMENTS) {
    await page.goto(`/gens${segment ? `?qui=${segment}` : ''}`, { waitUntil: 'domcontentloaded' })
    await page.locator('[data-pas]').first().waitFor({ timeout: 20_000 })

    // 🔴 `line-clamp-2` ne coupe pas le texte, il le MASQUE : le contenu
    // déborde toujours de la boîte. C'est donc `scrollHeight > clientHeight`
    // qui dit la vérité, et rien d'autre — ni la hauteur, ni le texte lu,
    // qui reste entier dans le DOM.
    const rognees = await page.locator('[data-pas]').evaluateAll((n) =>
      n
        .filter((e) => e.scrollHeight > e.clientHeight + 1)
        .map((e) => e.textContent.trim()),
    )

    expect(
      rognees,
      `« ${segment || 'tous'} » : ${rognees.length} phrase(s) coupée(s) → ${rognees.join(' | ')}`,
    ).toHaveLength(0)
  }
})

test('la ligne du prénom ne déborde plus', async ({ page }) => {
  await page.goto('/gens', { waitUntil: 'domcontentloaded' })
  await page.locator('[data-contact]').first().waitFor({ timeout: 20_000 })

  // 🔴 Le débordement d'origine : prénom + étape + population + délai sur
  // 390 px. On mesure le CONTENU de la fiche contre sa boîte — un enfant plus
  // large que son parent est exactement ce qu'on vient de supprimer.
  const debordent = await page.locator('[data-contact]').evaluateAll((n) =>
    n
      .filter((e) => e.scrollWidth > e.clientWidth + 1)
      .map((e) => e.innerText.split('\n')[0]),
  )

  expect(debordent, `fiches qui débordent en largeur : ${debordent.join(', ')}`).toHaveLength(0)
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
