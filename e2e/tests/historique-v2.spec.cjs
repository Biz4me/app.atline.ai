// L'HISTORIQUE DES CONVERSATIONS D'ATLAS.
//
//   E2E_BASE=https://v2.atline.ai E2E_COMME=humanstring@gmail.com \
//     npx playwright test tests/historique-v2.spec.cjs
//
// 🔴 CE QUE CES CONTRÔLES GARDENT N'EST PAS « LE PANNEAU S'OUVRE » — ça se
// verrait. Ce sont les trois choses qui cassent EN SILENCE :
//
//   · l'ADRESSE. Sans `?historique=1`, le bouton retour du téléphone n'a rien
//     à refermer et QUITTE l'application. Le piège est déjà payé sur le menu.
//   · le FIL RESTE MONTÉ dessous. S'il se démontait, refermer rechargerait —
//     et un appel en cours serait perdu sans un mot.
//   · la BARRE DU BAS reste touchable. Un panneau qui la couvrirait serait un
//     cul-de-sac dont la seule sortie est le geste qui l'a ouvert.

const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

const lien = (page) => page.locator('[data-historique-lien]')
const panneau = (page) => page.locator('[data-historique]')

test('le coin haut-gauche ouvre, et l’adresse change avec lui', async ({ page, pageErrors }) => {
  await page.goto('/atlas', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-composeur]')).toBeVisible({ timeout: 20_000 })

  await expect(lien(page), 'pas de porte vers l’historique').toHaveCount(1)
  await expect(lien(page)).toHaveAttribute('aria-expanded', 'false')
  await expect(panneau(page), 'le panneau est ouvert sans qu’on ait touché').toHaveCount(0)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Atlas')

  await lien(page).click()

  // 🔴 L'ADRESSE, et c'est le contrôle qui compte : sans elle le retour du
  // téléphone sort de l'app au lieu de refermer.
  await expect(page).toHaveURL(/\?historique=1$/, { timeout: 20_000 })
  await expect(panneau(page)).toBeVisible()
  await expect(lien(page)).toHaveAttribute('aria-expanded', 'true')
  // Le titre change, l'icône du lieu non : on est toujours DANS Atlas.
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tes conversations')

  expect(pageErrors, `exception client : ${pageErrors.join(' · ')}`).toEqual([])
})

test('le fil reste MONTÉ dessous, et la barre reste touchable', async ({ page }) => {
  await page.goto('/atlas?historique=1', { waitUntil: 'domcontentloaded' })
  await expect(panneau(page)).toBeVisible({ timeout: 20_000 })

  /**
   * 🔴 LE COMPOSEUR EST ENCORE DANS LE DOCUMENT. S'il n'y était plus, le fil
   * aurait été démonté — refermer rechargerait tout, et un appel en cours
   * serait perdu. ⚠️ On vérifie la PRÉSENCE, pas la visibilité : il est
   * légitimement recouvert.
   */
  await expect(
    page.locator('[data-composeur]'),
    'le fil a été démonté sous le panneau',
  ).toHaveCount(1)

  // 🔴 ET LA BARRE DU BAS RESTE TOUCHABLE. `trial` vérifie l'actionnabilité —
  // donc qu'elle n'est pas recouverte —, sans naviguer.
  const barre = page.getByRole('navigation', { name: 'Navigation principale' })
  await expect(barre).toBeVisible()
  await barre.getByRole('link', { name: 'Contacts' }).click({ trial: true })

  // ⚠️ ET LA SONDE SAIT VOIR LE DÉFAUT : le panneau, lui, recouvre bien le
  // fil. Sans ce contre-contrôle, « la barre est touchable » serait vert même
  // si le panneau ne couvrait rien du tout.
  const recouvre = await page.evaluate(() => {
    const p = document.querySelector('[data-historique]').getBoundingClientRect()
    const c = document.querySelector('[data-composeur]').getBoundingClientRect()
    return p.bottom > c.top - 200 && p.height > 200
  })
  expect(recouvre, 'le panneau ne recouvre pas le fil : il ne sert à rien').toBe(true)
})

test('refermer repose exactement où l’on était', async ({ page }) => {
  await page.goto('/atlas', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-composeur]')).toBeVisible({ timeout: 20_000 })

  // On laisse une trace dans le champ : si le fil était démonté, elle
  // disparaîtrait. C'est la preuve la plus simple que rien n'a été rechargé.
  const champ = page.locator('[data-composeur] textarea')
  await champ.fill('témoin')
  await lien(page).click()
  await expect(panneau(page)).toBeVisible({ timeout: 20_000 })
  await lien(page).click()
  await expect(panneau(page)).toHaveCount(0, { timeout: 20_000 })
  await expect(page).toHaveURL(/\/atlas$/)

  await expect(champ, 'le fil a été rechargé : la saisie en cours est perdue').toHaveValue(
    'témoin',
  )
  await champ.fill('')
})

test('la liste dit QUAND, et ouvre une conversation en PAGE', async ({ page }) => {
  await page.goto('/atlas?historique=1', { waitUntil: 'domcontentloaded' })
  await expect(panneau(page)).toBeVisible({ timeout: 20_000 })

  const lignes = page.locator('[data-conversation]')
  const combien = await lignes.count()
  console.log(`  ${combien} conversation(s) dans l’historique`)
  if (combien === 0) {
    // ⚠️ L'ÉTAT VIDE EST LE CAS DU PREMIER JOUR : il doit dire quoi faire.
    await expect(panneau(page)).toContainText('Ta première conversation')
    return
  }

  const premiere = lignes.first()
  const quand = await premiere.locator('p').last().innerText()
  console.log(`  la plus récente : « ${quand} »`)
  // 🔴 UNE DATE LISIBLE, PAS UN HORODATAGE. `quandCourt` dit « Aujourd'hui,
  // 14:02 », « Hier, 09:41 », un nom de jour, ou une date — jamais un ISO.
  expect(quand, `date illisible : ${quand}`).toMatch(
    /Aujourd.hui|Hier|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|\d{1,2} \p{L}+/u,
  )

  const id = await premiere.getAttribute('data-conversation')
  await premiere.click()

  // 🔴 CHOISIR EST UNE PAGE, PAS LE PANNEAU : on change de tâche.
  await expect(page).toHaveURL(new RegExp(`fil=${id}$`), { timeout: 20_000 })
  await expect(panneau(page), 'le panneau reste ouvert après le choix').toHaveCount(0)
  await expect(page.locator('[data-composeur]')).toBeVisible()
})

test('un fil qui n’est pas à soi ne révèle rien', async ({ page, pageErrors }) => {
  /**
   * ⚠️ `lireLeFil` filtre sur `userId` : un identifiant étranger rend `null`,
   * et l'écran retombe sur la dernière conversation. On ne dit donc pas si
   * l'identifiant existe, et on ne tombe pas non plus sur un écran vide
   * inexpliqué. Même garde que `/agenda/nouveau?contact=`.
   */
  await page.goto('/atlas?fil=cmaaaaaaaaaaaaaaaaaaaaaa', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-composeur]')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Atlas')
  expect(pageErrors, `exception client : ${pageErrors.join(' · ')}`).toEqual([])
})
