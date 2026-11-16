// CONNEXION ET SÉCURITÉ (V2) — ce que l'écran doit tenir.
//
//   E2E_BASE=https://v2.atline.ai E2E_COMME=humanstring@gmail.com \
//     npx playwright test tests/securite-v2.spec.cjs
//
// ── 🔴 CE TEST N'ENREGISTRE JAMAIS UN MOT DE PASSE ────────────────────────
//
// Il tourne sur le VRAI compte de Patrice, et le chemin du succès écrirait son
// identifiant de connexion. On éprouve donc tout ce qui NE grave rien :
//
//   ① l'écran porte son adresse, ses champs, son bouton ;
//   ② un mauvais mot de passe actuel est REFUSÉ — ce qui prouve que l'action
//     tourne vraiment, que `bcrypt.compare` est appelé, et que le message
//     revient à l'écran (Next masque les exceptions en production, donc un
//     message qui s'affiche prouve qu'il est une valeur de RETOUR) ;
//   ③ deux saisies différentes sont refusées ;
//   ④ aucune exception client en route.
//
// 🧭 Le chemin du succès reste à la main : il est le seul à écrire, et le
// vérifier coûterait le mot de passe de quelqu'un.

const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

const LONG = 'une phrase assez longue'

test('l’écran porte l’adresse, les champs et le bouton', async ({ page, pageErrors }) => {
  await page.goto('/compte/securite', { waitUntil: 'domcontentloaded' })

  // ① L'adresse, en lecture seule — et on vérifie que c'est bien une adresse,
  //    pas un gabarit resté vide.
  const email = page.locator('[data-email]')
  await expect(email).toBeVisible({ timeout: 20_000 })
  await expect(email).toContainText('@')
  // ⚠️ Et PAS un champ : la lecture seule est le sujet de ce bloc.
  expect(await email.locator('input').count(), 'l’adresse est devenue modifiable').toBe(0)

  await expect(page.locator('[data-enregistrer]')).toBeVisible()
  // Le nouveau et sa confirmation existent toujours ; « actuel » dépend du
  // compte, donc on ne l'exige pas ici.
  await expect(page.locator('input[name="nouveau"]')).toBeVisible()
  await expect(page.locator('input[name="confirmation"]')).toBeVisible()

  /**
   * 🔴 `autoComplete` EST CE QUI FAIT MARCHER LES GESTIONNAIRES DE MOTS DE
   * PASSE. Sans lui, le navigateur ne propose pas d'enregistrer, et quelqu'un
   * qui vient de choisir une phrase longue la perd. Rien ne le signalerait :
   * c'est un attribut absent, pas une erreur.
   */
  await expect(page.locator('input[name="nouveau"]')).toHaveAttribute('autocomplete', 'new-password')

  // Et ce que l'écran NE fait pas est écrit noir sur blanc.
  await expect(page.getByText('ne déconnecte pas tes autres appareils')).toBeVisible()
  expect(pageErrors, `exception client : ${pageErrors.join(' · ')}`).toEqual([])
})

test('un mauvais mot de passe actuel est refusé, et rien n’est écrit', async ({ page, pageErrors }) => {
  await page.goto('/compte/securite', { waitUntil: 'domcontentloaded' })
  const actuel = page.locator('input[name="actuel"]')

  // ⚠️ SI LE COMPTE N'A PAS DE MOT DE PASSE, ce cas n'existe pas — et le test
  // le DIT au lieu de passer au vert sans avoir rien éprouvé.
  if ((await actuel.count()) === 0) {
    test.skip(true, 'ce compte arrive par Google : il n’y a pas de mot de passe actuel à refuser')
    return
  }

  await actuel.fill('ceci n est pas le bon mot de passe')
  await page.locator('input[name="nouveau"]').fill(LONG)
  await page.locator('input[name="confirmation"]').fill(LONG)
  await page.locator('[data-enregistrer]').click()

  // 🔴 LE MESSAGE PROUVE DEUX CHOSES À LA FOIS : que l'action a tourné jusqu'à
  // `bcrypt.compare`, et qu'elle RETOURNE son erreur au lieu de la lever —
  // une exception serait remplacée par `{"digest":"…"}` en production.
  await expect(page.locator('[data-erreur]'), 'le refus ne s’affiche pas').toBeVisible({ timeout: 15_000 })
  await expect(page.locator('[data-erreur]')).toContainText('mot de passe actuel')
  // Et surtout : rien n'a été enregistré.
  await expect(page.locator('[data-fait]')).toHaveCount(0)
  expect(pageErrors, `exception client : ${pageErrors.join(' · ')}`).toEqual([])
})

test('deux saisies différentes sont refusées', async ({ page }) => {
  await page.goto('/compte/securite', { waitUntil: 'domcontentloaded' })
  const actuel = page.locator('input[name="actuel"]')
  if (await actuel.count()) await actuel.fill('peu importe, on n’arrivera pas jusque là')
  await page.locator('input[name="nouveau"]').fill(LONG)
  await page.locator('input[name="confirmation"]').fill(LONG + ' mais pas pareil')
  await page.locator('[data-enregistrer]').click()

  await expect(page.locator('[data-erreur]')).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('[data-fait]')).toHaveCount(0)
})
