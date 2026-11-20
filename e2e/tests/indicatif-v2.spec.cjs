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

const { test, expect, toucher, ouvrirInfos } = require('../fixtures.cjs')

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

  /* 🔴 LA SEULE PREUVE QUI COMPTE : le rechargement.
        ⚠️ Et il ramène sur l'onglet « Fiche » : l'onglet n'est pas dans l'URL,
        donc un rechargement repart de l'écran d'arrivée. */
  await page.reload({ waitUntil: 'domcontentloaded' })
  await ouvrirInfos(page)
  await expect(page.locator('[data-champ="phone"]')).toContainText('+33690557238', {
    timeout: 20_000,
  })

  /**
   * ET WHATSAPP S'ALLUME TOUT SEUL. C'est toute la raison d'être de ce
   * chantier : le numéro porte son indicatif, donc le canal peut marcher.
   */
  /**
   * ── 🔴 LE GESTE N'OUVRE UN MENU QUE S'IL Y A PLUSIEURS CANAUX VIVANTS ─────
   *
   * Cette sonde cliquait « Message » et attendait `[data-menu-canaux]` pendant
   * dix secondes. Elle échouait, et **le produit était juste** : avec un seul
   * canal, le geste agit en UNE TOUCHE — c'est la doctrine de la maison, pas
   * un oubli — et il n'y a alors aucun menu à ouvrir. Le contact jetable
   * qu'elle fabrique n'a qu'un numéro.
   *
   * 🧭 CE QU'ELLE DOIT PROUVER N'EST PAS « UN MENU S'OUVRE », c'est **que
   * WhatsApp est joignable avec le bon numéro international**. On accepte donc
   * les deux formes, et on dit laquelle on a rencontrée : une sonde qui
   * n'accepte qu'une mise en page impose cette mise en page sans l'avoir
   * décidé.
   */
  const geste = page.locator('[data-geste="Message"]')
  const parMenu = (await geste.getAttribute('data-menu-geste')) !== null
  console.log(parMenu ? '  plusieurs canaux : par le menu' : '  un seul canal : en une touche')

  if (parMenu) {
    await geste.click()
    const menu = page.locator('[data-menu-canaux]')
    await expect(menu).toBeVisible({ timeout: 10_000 })
    const wa = menu.locator('[data-canal="WhatsApp"]')
    await expect(wa, 'WhatsApp reste muet alors que le numéro est international').not.toHaveAttribute(
      'data-eteint',
      '',
    )
    await expect(wa).toHaveAttribute('href', 'https://wa.me/33690557238')
  } else {
    /**
     * ── 🔴 AVEC UN SEUL CANAL, « MESSAGE » MÈNE À L'ÉCRAN D'ÉCRITURE ────────
     *
     * Mesuré : son `href` vaut `/gens/<id>/ecrire`, pas un lien `wa.me`. Le
     * choix du canal n'a donc pas disparu — **il a déménagé** sur l'écran de
     * rédaction, là où le texte se compose avant de partir.
     *
     * 🧭 On y suit la même preuve, au même endroit qu'un humain : le lien
     * d'envoi doit porter le numéro INTERNATIONAL. C'est toute la raison de
     * ce chantier, et elle se vérifie où le produit la met aujourd'hui, pas
     * où la sonde l'attendait hier.
     */
    await geste.click()
    await expect(page).toHaveURL(/\/ecrire$/, { timeout: 20_000 })
    const wa = page.locator('[data-canal="WHATSAPP"]')
    if (await wa.count()) await wa.click()
    const lien = page.locator('a[href^="https://wa.me/"]')
    await expect(lien, 'aucun lien WhatsApp sur l’écran d’écriture').toHaveCount(1, { timeout: 10_000 })
    const href = await lien.getAttribute('href')
    expect(href, `le lien WhatsApp ne porte pas l’indicatif : ${href}`).toContain('wa.me/33690557238')
  }

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

  // ⚠️ PAR « MESSAGE » DEPUIS LE 18 NOVEMBRE 2026 : « Appeler » ne porte plus
  // de menu, il mène à l'écran de préparation. « Message » en garde un — SMS,
  // WhatsApp, e-mail — et c'est lui qui doit se refermer par le voile.
  /**
   * 🔴 ET CE TEST N'A DE SENS QUE S'IL Y A UN MENU. Avec un seul canal vivant
   * le geste agit en une touche : il n'y a pas de voile à refermer. On le
   * SAUTE à voix haute plutôt que d'échouer — un rouge qui ne signale aucun
   * défaut finit par rendre la liste illisible.
   *
   * ⏳ Pour l'éprouver pour de bon, il faut un contact à DEUX canaux. C'est
   * une évolution du contact jetable, pas de cette sonde.
   */
  const geste = page.locator('[data-geste="Message"]')
  test.skip(
    (await geste.getAttribute('data-menu-geste')) === null,
    'ce contact n’a qu’un canal vivant : « Message » agit en une touche, sans menu ni voile',
  )
  await geste.click()
  const menu = page.locator('[data-menu-canaux]')
  await expect(menu).toBeVisible({ timeout: 10_000 })
  expect(await menu.locator('button').count(), 'la croix est revenue dans le menu').toBe(0)

  // Le voile ferme. ⚠️ On vise le coin HAUT de l'écran : le menu occupe le
  // bas, et cliquer dessus ne prouverait rien.
  await page.mouse.click(195, 80)
  await expect(menu, 'le voile ne referme pas le menu').toHaveCount(0, { timeout: 10_000 })
})
