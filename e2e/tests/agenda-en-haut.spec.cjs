// L'AGENDA EN HAUT À DROITE — et ce qu'il NE perd pas.
//
//   E2E_BASE=https://v2.atline.ai E2E_COMME=humanstring@gmail.com \
//     npx playwright test tests/agenda-en-haut.spec.cjs
//
// 🔴 CE QUE CE FICHIER GARDE N'EST PAS LA PLACE DE L'ICÔNE, c'est le fait que
// **l'agenda reste un LIEU**. Le piège du changement était là : une seule
// liste servait la barre ET `lieuDe` — qui décide du titre centré, de l'icône
// de l'en-tête, de la teinte et des sous-pages. L'en sortir lui aurait tout
// retiré d'un coup, sans un mot.

const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

const BARRE = 'Navigation principale'
const haut = (page) => page.locator('[data-agenda-haut]')

test('l’agenda est en haut sur les lieux, et plus dans la barre', async ({ page, pageErrors }) => {
  for (const [adresse, titre] of [
    ['/accueil', 'Accueil'],
    ['/parcours', 'Apprendre'],
    ['/gens', 'Contacts'],
  ]) {
    await page.goto(adresse, { waitUntil: 'domcontentloaded' })
    const barre = page.getByRole('navigation', { name: BARRE })
    await expect(barre).toBeVisible({ timeout: 20_000 })

    // Plus de case en bas…
    await expect(barre.getByRole('link', { name: 'Agenda' })).toHaveCount(0)
    // …et un seul chemin en haut.
    await expect(haut(page)).toHaveCount(1)
    await expect(haut(page)).toHaveAttribute('href', '/agenda')
    // ⚠️ `toBeVisible` ne détecte PAS l'occultation : l'en-tête est `sticky`
    // et l'avatar est son voisin immédiat.
    await haut(page).click({ trial: true })

    expect(pageErrors, `${titre} : ${pageErrors.join(' · ')}`).toHaveLength(0)
  }
})

test('dans l’agenda : pas de doublon en haut, et la barre reste grise', async ({ page }) => {
  await page.goto('/agenda', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { level: 1, name: 'Agenda' })).toBeVisible({
    timeout: 20_000,
  })

  // 🔴 IL RESTE UN LIEU : son nom est CENTRÉ dans l'en-tête, avec son icône.
  // C'est ce que `lieuDe` donne, et c'est ce qu'on aurait perdu en le sortant
  // de la liste.
  await expect(page.locator('header svg')).not.toHaveCount(0)

  // Pas de second glyphe d'agenda dans le même en-tête.
  await expect(haut(page)).toHaveCount(0)

  // 🔴 ET LA BARRE RESTE GRISE — décision de Patrice, 10 novembre 2026.
  // Ce n'est pas le défaut du 8 novembre : là, le lieu ÉTAIT dans la barre
  // et n'arrivait pas à s'allumer. Ici il n'y est légitimement pas, et c'est
  // l'en-tête qui répond « où suis-je ». On l'écrit pour que ce soit une
  // DÉCISION, et non une dérive qu'on découvrirait un jour.
  const barre = page.getByRole('navigation', { name: BARRE })
  await expect(barre).toBeVisible()
  await expect(barre.locator('[aria-current="page"]')).toHaveCount(0)

  // ⚠️ ET LA SONDE SAIT VOIR LA CHOSE : sur un lieu DE la barre, une entrée
  // s'allume. Sans ce contre-contrôle, « aucune allumée » serait vert même si
  // plus rien ne s'allumait nulle part.
  await page.goto('/gens', { waitUntil: 'domcontentloaded' })
  await expect(barre.locator('[aria-current="page"]')).toHaveCount(1, { timeout: 20_000 })
})

test('le titre d’un lieu reste CENTRÉ malgré le coin droit chargé', async ({ page }) => {
  // 🔴 LE DÉFAUT QUE CE CONTRÔLE GARDE. L'en-tête était un `flex` : le titre,
  // en `flex-1`, se centrait dans la place QUI RESTE. Tant que rien
  // n'occupait la droite, « ce qui reste » et « toute la largeur » se
  // confondaient — l'agenda à droite a cassé la coïncidence, et le titre
  // serait parti vers la gauche de la moitié du coin droit. Une grille
  // `1fr auto 1fr` le centre dans le CADRE.
  //
  // ⚠️ DEUX LARGEURS, parce qu'on s'est déjà trompé deux fois en concluant
  // d'une seule.
  for (const largeur of [320, 390]) {
    await page.setViewportSize({ width: largeur, height: 844 })
    for (const adresse of ['/parcours', '/gens']) {
      await page.goto(adresse, { waitUntil: 'domcontentloaded' })
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 })
      // Le bloc du milieu : c'est lui qui porte l'icône et le nom.
      const ecart = await page.evaluate(() => {
        const h = document.querySelector('header')
        const bloc = h.children[1]
        const a = h.getBoundingClientRect()
        const b = bloc.getBoundingClientRect()
        return Math.round(b.x + b.width / 2 - (a.x + a.width / 2))
      })
      expect(
        Math.abs(ecart),
        `${adresse} à ${largeur} px : titre décalé de ${ecart} px`,
      ).toBeLessThanOrEqual(1)
    }
  }
})
