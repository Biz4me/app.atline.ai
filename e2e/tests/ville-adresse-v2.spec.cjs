// LA VILLE APPARTIENT À L'ADRESSE (V2) — 16 novembre 2026.
//
//   E2E_BASE=https://v2.atline.ai E2E_COMME=humanstring@gmail.com \
//     npx playwright test tests/ville-adresse-v2.spec.cjs
//
// Patrice : « enlève donc la ville de ce que je sais d'elle pour ne pas avoir
// de doublons ». Elle était seule de sa famille, à deux sections de la rue et
// du code postal — et l'autocomplétion d'adresse aurait rempli des champs dans
// deux blocs différents.
//
// ── 🔴 DEUX FOIS MA SONDE A EU TORT AVANT DE MESURER QUELQUE CHOSE ────────
//
// ① Elle cherchait « Ce que je sais » en respectant la casse. `innerText`
//   applique `text-transform` : le titre sort en capitales. C'est le piège le
//   mieux documenté de cette maison, et je l'ai repayé.
// ② Puis, insensible à la casse, elle ne trouvait toujours rien — parce que
//   **sur un contact neuf, aucune section d'adresse n'existe** : les champs
//   vides sont tous regroupés sous « AJOUTER AUTRE CHOSE », quel que soit leur
//   bloc déclaré. Je vérifiais une section qui n'apparaît que remplie.
//
// 🧭 CE QUI EST VRAI ET VÉRIFIABLE, C'EST L'ORDRE. Les cinq champs d'adresse
// se suivent désormais dans l'ordre d'une enveloppe, et la ville vient APRÈS
// la rue. Avant le changement elle était déclarée dans le bloc « savoir »,
// donc rendue AVANT — cette assertion échouerait sur l'ancien état, ce qui est
// la seule chose qui fait d'elle un garde.

const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

test('les cinq champs d’adresse se suivent dans l’ordre d’une enveloppe', async ({
  page,
  seed,
  pageErrors,
}) => {
  await page.goto(`/gens/${seed.cid}`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('main')).toBeVisible({ timeout: 20_000 })
  const corps = await page.locator('main').innerText()

  const ou = (mot) => {
    const i = corps.indexOf(mot)
    // 🔴 Une ancre introuvable S'ARRÊTE : sans ça, des -1 se compareraient
    // entre eux et le test serait vert sur une page vide.
    expect(i, `« ${mot} » est absent de la fiche`).toBeGreaterThan(-1)
    return i
  }

  const rue = ou('Rue')
  const complement = ou('Complément')
  const codePostal = ou('Code postal')
  const ville = ou('Ville')
  const pays = ou('Pays')

  // L'ordre d'une enveloppe, celui dans lequel on lit une adresse à voix haute.
  expect([rue, complement, codePostal, ville, pays], 'l’ordre des champs d’adresse a changé').toEqual(
    [rue, complement, codePostal, ville, pays].slice().sort((a, b) => a - b),
  )

  // ⚠️ ET LE GARDE QUI COMPTE : la ville ne doit plus précéder la rue. C'est
  // exactement ce qu'elle faisait quand elle était déclarée dans « savoir ».
  expect(ville, 'la ville est revenue avant la rue, donc dans l’autre bloc').toBeGreaterThan(rue)

  expect(pageErrors, `exception client : ${pageErrors.join(' · ')}`).toEqual([])
})
