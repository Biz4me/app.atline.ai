// L'INDICATIF DANS LA FICHE (V2) — 18 novembre 2026.
//
//   E2E_BASE=https://v2.atline.ai E2E_COMME=humanstring@gmail.com \
//     npx playwright test tests/indicatif-v2.spec.cjs
//
// ── 🔴 POURQUOI CE GARDE EXISTE ───────────────────────────────────────────
//
// WhatsApp ne sait router qu'un numéro international. Mesuré sur la
// production : **29 contacts portaient un numéro national, 1 seul un numéro
// international** — et le lien WhatsApp était allumé pour les 30, menant à
// une erreur 29 fois. Ce qui ressemble à un bug de WhatsApp, pas au nôtre.
//
// 🧭 La réparation est à la SAISIE, et elle est VISIBLE : l'indicatif se
// choisit dans la fiche. Ma première version convertissait en silence
// d'après le pays du distributeur — un Français notant un contact belge
// obtenait un numéro faux sans jamais le voir.

const { test, expect, toucher } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

test('on tape son numéro comme on le connaît, et il part avec son indicatif', async ({
  page,
  seed,
  pageErrors,
}) => {
  await page.goto(`/gens/${seed.cid}`, { waitUntil: 'domcontentloaded' })
  await toucher(page.locator('[data-manque="phone"]'), page.locator('[data-saisie="phone"]'))

  const champ = page.locator('[data-saisie="phone"]')
  const choix = page.locator('[data-indicatif="phone"]')
  await expect(choix, 'pas de choix d’indicatif dans la fiche').toBeVisible()
  await expect(choix, 'la France n’est pas le défaut').toHaveValue('33')

  /**
   * 🔴 LA FRAPPE N'EST PAS CORRIGÉE EN COURS DE ROUTE. Première version :
   * chaque touche recomposait le numéro, donc le zéro de tête disparaissait
   * sous les doigts — on appuyait sur « 0 » et rien n'apparaissait. C'est
   * exactement la classe de défaut que ce harnais existe pour attraper.
   */
  await champ.fill('06 90 55 72 38')
  await expect(champ, 'la frappe est corrigée sous les doigts').toHaveValue('06 90 55 72 38')

  // ⚠️ ET CE QUI SERA ÉCRIT EST MONTRÉ. Le zéro tombe à la composition, et
  // personne ne le verrait sans cette ligne.
  await expect(page.locator('[data-apercu-numero]')).toContainText('+33690557238')

  await page.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(page.locator('[data-champ="phone"]')).toContainText('+33690557238', {
    timeout: 20_000,
  })

  /* 🔴 LA SEULE PREUVE QUI COMPTE : le rechargement. */
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-champ="phone"]')).toContainText('+33690557238', {
    timeout: 20_000,
  })

  /**
   * ET WHATSAPP S'ALLUME TOUT SEUL. C'est toute la raison d'être de ce
   * chantier : le numéro porte son indicatif, donc le canal peut marcher.
   */
  await page.locator('[data-geste="Message"]').click()
  const menu = page.locator('[data-menu-canaux]')
  await expect(menu).toBeVisible({ timeout: 10_000 })
  const wa = menu.locator('[data-canal="WhatsApp"]')
  await expect(wa, 'WhatsApp reste muet alors que le numéro est international').not.toHaveAttribute(
    'data-eteint',
    '',
  )
  await expect(wa).toHaveAttribute('href', 'https://wa.me/33690557238')

  expect(pageErrors, `exception client : ${pageErrors.join(' · ')}`).toEqual([])
})

test('le menu se referme par le voile, et il n’a plus de croix', async ({ page, seed }) => {
  /**
   * 🔴 LA CROIX EST PARTIE le 18 novembre 2026, sur demande de Patrice. Le
   * voile ferme déjà, sur toute la surface de l'écran — la plus grosse cible
   * qui soit. Une croix de 44 px en plus, c'étaient deux déclencheurs pour un
   * même geste, et une ligne mangée au-dessus des cartes.
   */
  await page.goto(`/gens/${seed.cid}`, { waitUntil: 'domcontentloaded' })
  await page.locator('[data-geste="RDV"]').waitFor({ timeout: 20_000 })

  // Le contact jetable n'a aucune coordonnée : on en pose une pour que le
  // menu ait de quoi s'ouvrir.
  await toucher(page.locator('[data-manque="phone"]'), page.locator('[data-saisie="phone"]'))
  await page.locator('[data-saisie="phone"]').fill('6 12 34 56 78')
  await page.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(page.locator('[data-champ="phone"]')).toContainText('+33', { timeout: 20_000 })

  await page.locator('[data-geste="Appeler"]').click()
  const menu = page.locator('[data-menu-canaux]')
  await expect(menu).toBeVisible({ timeout: 10_000 })
  expect(await menu.locator('button').count(), 'la croix est revenue dans le menu').toBe(0)

  // Le voile ferme. ⚠️ On vise le coin HAUT de l'écran : le menu occupe le
  // bas, et cliquer dessus ne prouverait rien.
  await page.mouse.click(195, 80)
  await expect(menu, 'le voile ne referme pas le menu').toHaveCount(0, { timeout: 10_000 })
})
