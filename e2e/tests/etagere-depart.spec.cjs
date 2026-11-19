// L'ÉTAGÈRE ARRIVE POUSSÉE SUR CE QUI RESTE À FAIRE.
//
//     E2E_BASE=https://v2.atline.ai E2E_COMME=humanstring@gmail.com \
//       npx playwright test tests/etagere-depart.spec.cjs
//
// ── 🔴 UN DÉFILEMENT, ET SURTOUT PAS UN TRI ──────────────────────────────
//
// Première version, le 20 novembre : j'avais RÉORDONNÉ la liste, modules finis
// à la fin. Patrice : *« la leçon 1 terminée ne doit pas être en fin de rangée
// mais rester en première position, c'est juste que la leçon 2 passe en
// première position comme si on avait déplacé les leçons vers la droite, et du
// coup si on fait glisser vers la gauche on la voit »*.
//
// 🧭 LA DIFFÉRENCE EST ENTIÈRE : un tri change ce qui EXISTE, un défilement
// change ce qu'on VOIT EN PREMIER. Mon tri rendait un module **plus difficile
// à rouvrir une fois terminé qu'avant de l'être** — il partait au bout de onze
// couvertures. Or on relit une leçon ; c'est tout l'intérêt d'une formation
// qu'on garde.
//
// Cette sonde vérifie donc LES DEUX MOITIÉS, parce que l'une sans l'autre est
// exactement la faute commise : l'ordre du parcours est intact, ET la rangée
// est déjà poussée.
//
// ⚠️ ELLE N'A DE SENS QUE SI UN MODULE EST TERMINÉ. Sans ça il n'y a rien à
// dépasser, le départ est à zéro, et la sonde le dit au lieu de passer au vert
// pour rien. `humanstring@gmail.com` a le module 1 fini — 8 leçons sur 8 et le
// quiz réussi.
const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

test('la rangée garde son ordre et démarre au premier module non terminé', async ({
  page,
  pageErrors,
}) => {
  await page.goto('/parcours', { waitUntil: 'domcontentloaded' })
  await page.locator('[data-module="1"]').waitFor({ state: 'visible', timeout: 20_000 })

  const vu = await page.evaluate(() => {
    const ul = document.querySelector('[data-etagere]')
    const cellules = [...ul.querySelectorAll('[data-module]')]
    const prochain = ul.querySelector('[data-prochain]')
    return {
      ordre: cellules.map((c) => Number(c.dataset.module)),
      prochain: prochain ? Number(prochain.dataset.module) : null,
      scrollLeft: Math.round(ul.scrollLeft),
      // L'écart entre le bord gauche de la cellule visée et la gouttière de la
      // page : c'est ça qu'on a réglé, pas une position absolue.
      ecart: prochain
        ? Math.round(
            prochain.getBoundingClientRect().left - (ul.getBoundingClientRect().left + 16),
          )
        : null,
      // Un ruban « Terminé » quelque part prouve qu'il y a de quoi dépasser.
      termines: ul.querySelectorAll('[data-ruban="termine"]').length,
      enCours: ul.querySelectorAll('[data-ruban="en-cours"]').length,
    }
  })

  console.log(
    `  ordre ${vu.ordre.join(',')} · prochain ${vu.prochain} · scrollLeft ${vu.scrollLeft} · écart ${vu.ecart} · ${vu.termines} terminé(s), ${vu.enCours} en cours`,
  )

  // ── ① L'ORDRE DU PARCOURS EST INTACT ──
  expect(
    vu.ordre,
    'la rangée doit rester dans l’ordre des modules — c’est un défilement, pas un tri',
  ).toEqual([...vu.ordre].sort((a, b) => a - b))

  expect(
    vu.termines,
    'aucun module terminé sur ce compte : la sonde ne peut rien prouver (passer E2E_COMME)',
  ).toBeGreaterThan(0)

  // ── ② ET ELLE EST DÉJÀ POUSSÉE ──
  expect(vu.prochain, 'aucun module non terminé n’est désigné').toBeTruthy()
  expect(
    vu.prochain,
    'le premier module non terminé n’est pas le 1 — sinon il n’y a rien à dépasser',
  ).toBeGreaterThan(1)
  expect(
    vu.scrollLeft,
    'la rangée est restée au départ : le module terminé occupe encore le premier regard',
  ).toBeGreaterThan(0)

  // ⚠️ À deux pixels près : les arrondis de sous-pixel d'un défilement ne sont
  // pas une erreur de calage, et exiger l'égalité stricte rendrait cette sonde
  // capricieuse sans rien garder de plus.
  expect(
    Math.abs(vu.ecart),
    `la couverture visée n’est pas alignée sur la gouttière (${vu.ecart} px)`,
  ).toBeLessThanOrEqual(2)

  // ── ③ ET ON REVIENT EN GLISSANT ──
  await page.evaluate(() => {
    document.querySelector('[data-etagere]').scrollTo({ left: 0, behavior: 'instant' })
  })
  await expect(page.locator('[data-module="1"]')).toBeInViewport()

  expect(pageErrors, `exception client : ${pageErrors.join(' · ')}`).toHaveLength(0)
})
