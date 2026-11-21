// LE CURSEUR ET LE BOUTON NE BOUGENT PAS D'UNE LEÇON À L'AUTRE.
//
//   E2E_BASE=https://v2.atline.ai npx playwright test tests/lecteur-fixe.spec.cjs
//
// ── 🔴 CE QU'ELLE TIENT, ET POURQUOI ÇA SE DÉRÈGLE TOUT SEUL ──────────────
//
// Patrice, le 21 novembre 2026 : *« le bouton play doit toujours garder sa
// position, de même pour le curseur »*.
//
// 🔴 MESURÉ SUR LES 71 LEÇONS : **1 titre tient sur une ligne, 40 sur deux,
// 30 sur trois.** Le bloc du titre variait donc de 28 à 84 px, et le bouton
// descendait de 28 px entre une leçon à deux lignes et une à trois. La cible
// qu'on vise le plus souvent se déplaçait selon la longueur d'un texte.
//
// 🧭 LA PARADE EST DE RÉSERVER LE PIRE CAS, pas de l'ajuster : le titre a la
// hauteur de trois lignes et s'y centre. C'est au TEXTE d'absorber sa propre
// variation, jamais aux commandes.
//
// ⚠️ ET CETTE SONDE PARCOURT PLUSIEURS MODULES, parce qu'un seul ne contient
// pas les trois longueurs. Mesurer une leçon aurait rendu « rien ne bouge »
// sur un écran qui bouge de 28 px dès la suivante.
const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

/** L'air au-dessus et en dessous du bouton doit être le même, à l'imparité près. */
const IMPARITE = 2

test('le curseur et le bouton tiennent leur place sur toutes les leçons', async ({
  page,
  pageErrors,
}) => {
  test.setTimeout(900_000)

  await page.goto('/parcours', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('a[data-module="1"]')).toBeVisible({ timeout: 20_000 })
  const modules = await page
    .locator('a[data-module]')
    .evaluateAll((n) => n.map((e) => e.getAttribute('href')))

  const vus = []
  // Cinq modules : assez pour rencontrer les trois longueurs de titre.
  for (const m of modules.slice(0, 5)) {
    await page.goto(m, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('ol li a[data-lecon]').first()).toBeVisible({ timeout: 20_000 })
    const lecons = await page
      .locator('ol li a[data-lecon]')
      .evaluateAll((x) => x.map((e) => e.getAttribute('href')))
    for (const l of lecons) {
      await page.goto(l + '/ecouter', { waitUntil: 'domcontentloaded' })
      await page.locator('[data-titre-ecoute]').waitFor({ state: 'visible', timeout: 20_000 })
      await page.waitForTimeout(220)
      vus.push(
        await page.evaluate(() => {
          const t = document.querySelector('[data-titre-ecoute]')
          const b = [...document.querySelectorAll('button')].find((x) =>
            /Écouter la leçon|Mettre en pause/.test(x.getAttribute('aria-label') || ''),
          )
          const c = document.querySelector('.piste-ecoute')
          const meuble =
            document.querySelector('[data-barre-action]') || document.querySelector('[data-barre-bas]')
          if (!t || !b || !c) return { manque: true }
          const rt = t.getBoundingClientRect()
          const rb = b.getBoundingClientRect()
          const inter = parseFloat(getComputedStyle(t).lineHeight)
          return {
            texte: t.textContent.trim().slice(0, 24),
            // Les lignes RÉELLES du texte, pas la hauteur réservée du bloc.
            lignes: Math.round((t.firstChild?.textContent ? rt.height : 0) / inter),
            curseur: Math.round(c.getBoundingClientRect().top),
            bouton: Math.round(rb.top),
            air: {
              dessus: Math.round(rb.top - rt.bottom),
              dessous: Math.round(
                (meuble ? meuble.getBoundingClientRect().top : innerHeight) - rb.bottom,
              ),
            },
          }
        }),
      )
    }
  }

  const griefs = []
  // 🔴 SANS PLUSIEURS LEÇONS, CETTE SONDE N'ÉPROUVE RIEN : « une position »
  // est toujours constante quand on n'en relève qu'une.
  if (vus.length < 10) griefs.push(`${vus.length} leçon(s) relevée(s) : trop peu pour parler de stabilité`)
  if (vus.some((v) => v.manque)) griefs.push('le lecteur manque sur au moins une leçon')

  const curseurs = [...new Set(vus.map((v) => v.curseur))]
  const boutons = [...new Set(vus.map((v) => v.bouton))]
  if (curseurs.length > 1) griefs.push(`le curseur se déplace : ${curseurs.sort().join(', ')}`)
  if (boutons.length > 1) griefs.push(`le bouton se déplace : ${boutons.sort().join(', ')}`)

  /**
   * 🔴 ET L'AIR DOIT RESTER PARTAGÉ. Les deux écarts se disputent un total
   * CONSTANT — mesuré à 147 px — donc en donner au-dessus en reprend en
   * dessous. Première tentative : j'avais posé 91 en haut, croyant le bloc
   * ancré en bas ; les deux se sont simplement ÉCHANGÉS et le bouton est
   * descendu de 625 à 704. C'est cette sonde qui l'a dit.
   */
  for (const v of vus.filter((x) => !x.manque)) {
    if (Math.abs(v.air.dessus - v.air.dessous) > IMPARITE)
      griefs.push(
        `« ${v.texte} » : ${v.air.dessus} px au-dessus du bouton contre ${v.air.dessous} en dessous`,
      )
  }

  console.log(
    `  ${vus.length} leçons · curseur ${curseurs.join('/')} · bouton ${boutons.join('/')} · ` +
      `air ${vus[0]?.air?.dessus}/${vus[0]?.air?.dessous}`,
  )
  expect(griefs, `ce qui cloche :\n  · ${griefs.join('\n  · ')}`).toEqual([])
  expect(pageErrors, `exception client : ${pageErrors.join(' · ')}`).toEqual([])
})
