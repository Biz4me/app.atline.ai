// LE FILTRE : LA COULEUR, ET PLUS AUCUN TRAIT (V2) — 17 novembre 2026.
//
//   E2E_BASE=https://v2.atline.ai E2E_COMME=humanstring@gmail.com \
//     npx playwright test tests/filtre-couleur-v2.spec.cjs

const { test, expect, suivre } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

test('aucun encadré, nulle part', async ({ page, pageErrors }) => {
  /**
   * 🔴 C'EST UNE CONSIGNE, PAS UN GOÛT. Patrice, le 17 novembre 2026 :
   * *« ne jamais mettre d'encadré ni sur filtres ni sur listes ou cartes et
   * de même sur chaque élément des filtres. Je trouve que cela crée du
   * bruit ; les changements de couleur sont suffisamment clairs. »*
   *
   * 🧭 Une consigne sans sonde se perd au premier composant recopié d'un
   * autre écran — et un trait qui revient ne casse rien, ne lève rien, et
   * ne se voit que si quelqu'un regarde. C'est exactement ce qu'une sonde
   * doit garder.
   */
  const sansTrait = async (ou, quoi) => {
    const traits = await page.locator(quoi).evaluateAll((n) =>
      n
        .map((e) => {
          const s = getComputedStyle(e)
          const px = Math.max(
            parseFloat(s.borderTopWidth) || 0,
            parseFloat(s.borderLeftWidth) || 0,
          )
          return px > 0 ? `${(e.textContent || '').trim().slice(0, 18)} (${px}px)` : null
        })
        .filter(Boolean),
    )
    expect(traits, `un encadré est revenu sur ${ou}`).toEqual([])
  }

  await page.goto('/gens', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-filtres]')).toBeVisible({ timeout: 20_000 })
  await sansTrait('le bouton Filtres', '[data-filtres]')
  await sansTrait('Liste et Carte', '[data-vue]')
  await sansTrait('le champ de recherche', '[data-champ-cherche]')

  await page.goto('/gens/filtrer', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-choix]').first()).toBeVisible({ timeout: 20_000 })
  const combien = await page.locator('[data-choix]').count()
  console.log(`  ${combien} choix relus sur l’écran de filtre`)
  expect(combien, 'aucun choix : la sonde ne mesure rien').toBeGreaterThan(10)
  await sansTrait('les choix du filtre', '[data-choix]')

  expect(pageErrors, `exception client : ${pageErrors.join(' · ')}`).toEqual([])
})

test('la couleur filtre, et le bouton dit ce qu’elle donnera', async ({ page }) => {
  await page.goto('/gens/filtrer', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-choix="couleur:rouge"]')).toBeVisible({ timeout: 20_000 })

  /* Les quatre couleurs, et « Peu importe ». Pas trois, pas cinq. */
  const couleurs = page.locator('[data-choix^="couleur:"]')
  await expect(couleurs).toHaveCount(5)

  /**
   * 🔴 LE BOUTON DIT LE RÉSULTAT, PAS L'ACTION, et on vérifie qu'il CHANGE.
   * Figer un chiffre le périmerait au premier contact ajouté ; ce qui doit
   * rester vrai, c'est que choisir une couleur donne MOINS que tout.
   */
  /**
   * LE BOUTON A TROIS FORMULATIONS, et ma premiere version n'en connaissait
   * qu'une. Sans filtre il dit « Voir tout le monde · 35 », filtre « Voir
   * 4 contacts », et vide « Personne ne correspond ». On vise donc le DEBUT
   * du mot, pas la phrase entiere -- une sonde qui recopie un libelle tombe
   * au premier mot change.
   */
  const bouton = page.getByRole('link', { name: /^Voir|^Personne/ })
  const lire = async () => Number((await bouton.innerText()).match(/\d+/)?.[0] ?? 0)
  const tout = await lire()
  expect(tout, 'le carnet est vide : rien à mesurer').toBeGreaterThan(5)

  await page.locator('[data-choix="couleur:rouge"]').click()
  await expect(page).toHaveURL(/couleur=rouge/, { timeout: 20_000 })
  const rouges = await lire()
  console.log(`  tout : ${tout} · rouges : ${rouges}`)
  expect(rouges, 'la couleur ne filtre rien').toBeLessThan(tout)
  expect(rouges, 'la couleur ne laisse personne').toBeGreaterThan(0)

  /* Et la liste tient la promesse du bouton. */
  await suivre(bouton, page, /\/gens\?/)
  await expect(page.locator('[data-contact]')).toHaveCount(rouges, { timeout: 20_000 })
})

test('un choix qui ne donnerait rien se tait', async ({ page }) => {
  /**
   * 🔴 UNE FLÈCHE EST UNE PROMESSE. « Sans nouvelle » ne concerne que
   * 2 personnes sur 45 ; plusieurs étapes aucune. Les proposer en pleine
   * lumière, c'est faire composer un filtre à l'aveugle pour découvrir le
   * vide après coup.
   */
  await page.goto('/gens/filtrer?couleur=rouge&marche=CHAUD', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-choix]').first()).toBeVisible({ timeout: 20_000 })

  const eteints = page.locator('[data-vide]')
  const n = await eteints.count()
  console.log(`  ${n} choix éteints`)
  expect(n, 'aucun choix éteint : ou la base a changé, ou le calcul est mort').toBeGreaterThan(0)

  /* Ils disent leur zéro, et ils ne se touchent pas. */
  await expect(eteints.first()).toContainText('0')
  const cliquable = await eteints
    .first()
    .evaluate((e) => getComputedStyle(e).pointerEvents !== 'none')
  expect(cliquable, 'un choix éteint reste touchable : il mènerait à une liste vide').toBe(false)

  /**
   * ⚠️ ET « PEU IMPORTE » N'EST JAMAIS ÉTEINT. Il sert à DÉFAIRE : une
   * sortie qu'on grise est une porte qu'on ferme sur quelqu'un.
   */
  const sorties = page.locator('[data-choix$=":tous"][data-vide]')
  expect(await sorties.count(), '« Peu importe » a été éteint : on ne peut plus défaire').toBe(0)
})
