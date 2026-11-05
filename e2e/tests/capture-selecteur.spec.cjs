// PHOTOGRAPHIER LA BANDE D'ACTIVITÉ, pour qu'elle se voie au lieu de se
// raconter.
//
// 🔴 Elle n'apparaît qu'à partir de DEUX activités, et un seul compte en a
// deux. On ne peut donc pas la montrer depuis le compte de Patrice : il faut
// ouvrir une session sous `test1@gmail.com`, ce que le harnais sait faire sans
// aucun mot de passe.
//
//   E2E_BASE=https://v2.atline.ai E2E_COMME=test1@gmail.com \
//     npx playwright test tests/capture-selecteur.spec.cjs
//
// ⚠️ DEUX PIÈGES, tous deux rencontrés au premier essai :
//
//   1. Le harnais ouvre une fenêtre de 1280 px, mais la coquille de V2 est
//      plafonnée à 430 px et reste CENTRÉE. Un cadrage à `x: 0` photographie
//      donc le fond vide. On passe en taille de téléphone : l'app remplit
//      l'écran, et c'est de toute façon ainsi qu'on la regarde.
//   2. « NHT Global » désigne DEUX boutons — la bande elle-même et la ligne
//      dans la liste. On vise donc la liste explicitement, sinon Playwright
//      refuse, à juste titre, de choisir à notre place.

const { test, expect } = require('../fixtures.cjs')

// On la regarde debout, d'une main. C'est aussi la seule taille où la capture
// montre l'écran et non la moquette autour.
test.use({ viewport: { width: 390, height: 844 } })

test('la bande d’activité se voit, et s’ouvre', async ({ page, pageErrors }) => {
  await page.goto('/gens', { waitUntil: 'domcontentloaded' })

  // Par le libellé d'accessibilité, pas par une classe : une classe change au
  // premier coup de peigne, le sens non.
  const bande = page.getByRole('button', { name: /Changer d’activité|Changer d'activité/ })
  await expect(bande).toBeVisible({ timeout: 20_000 })
  await expect(bande).toContainText('NHT Global')

  await page.screenshot({ path: 'capture-bande-fermee.png', clip: { x: 0, y: 0, width: 390, height: 210 } })

  await bande.click()

  // Les choix vivent dans la FEUILLE, pas dans la bande. On s'y ancre par le
  // rôle `dialog` : une classe change au premier coup de peigne, le rôle non.
  const feuille = page.getByRole('dialog', { name: /Où tu travailles/ })
  await expect(feuille).toBeVisible({ timeout: 10_000 })
  const choix = feuille.getByRole('button')
  await expect(choix.filter({ hasText: 'NHT Global' })).toBeVisible({ timeout: 10_000 })
  await expect(choix.filter({ hasText: 'Forever Living' })).toBeVisible()

  // La feuille occupe 88 % de la hauteur : on prend l'écran entier, sinon on
  // photographie son bord supérieur et rien du choix.
  await page.screenshot({ path: 'capture-bande-ouverte.png' })

  // 🔴 Le filet : une exception client ne casse aucune assertion ci-dessus,
  // mais elle casserait l'écran chez le distributeur.
  expect(pageErrors, `exceptions JS : ${pageErrors.join(' | ')}`).toHaveLength(0)
})

// L'AUTRE CAS, ET IL EST LE PLUS FRÉQUENT : une seule activité.
//
// 🔴 La bande doit Être LÀ — elle dit où l'on travaille — mais ne doit PAS
// se cliquer : il n'y a rien à choisir. Un contrôle qui ne vérifierait que la
// présence laisserait passer un bouton qui ne mène nulle part.
//
//   E2E_BASE=https://v2.atline.ai E2E_COMME=humanstring@gmail.com \
//     npx playwright test tests/capture-selecteur.spec.cjs -g 'une seule'

test('avec une seule activité, la bande informe sans se cliquer', async ({ page, pageErrors }) => {
  await page.goto('/gens', { waitUntil: 'domcontentloaded' })

  // Le nom de l'activité est bien affiché…
  await expect(page.getByText('Forever Living').first()).toBeVisible({ timeout: 20_000 })

  // …et AUCUN bouton ne propose d'en changer.
  await expect(page.getByRole('button', { name: /Changer d’activité|Changer d'activité/ })).toHaveCount(0)

  await page.screenshot({ path: 'capture-bande-seule.png', clip: { x: 0, y: 0, width: 390, height: 210 } })

  expect(pageErrors, `exceptions JS : ${pageErrors.join(' | ')}`).toHaveLength(0)
})
