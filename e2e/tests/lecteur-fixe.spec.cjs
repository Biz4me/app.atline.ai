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

/**
 * ── 🔴 LA DISTANCE DU BOUTON AU MEUBLE, CHOISIE ET NON CALCULÉE ───────────
 *
 * Patrice, le 21 novembre 2026 au soir : *« et si on décidait d'une distance
 * entre la bottom et le play pour commencer »*. **40 px.**
 *
 * 🧭 DEUX RÈGLES ONT ÉCHOUÉ AVANT CELLE-LÀ, ET POUR LA MÊME RAISON. D'abord
 * un nombre, 52, « la moitié d'un total constant » — le total n'était pas
 * constant, et l'écart du bas est tombé à 28 le soir même, dès que la mise en
 * page a changé. Puis un partage à parts égales de l'espace libre, qui faisait
 * dépendre la place du bouton de la hauteur de l'écran. **Les deux liaient une
 * cible du pouce à la taille du téléphone.**
 *
 * Ancrée sur le meuble, elle tombe au même endroit partout, et c'est l'air du
 * HAUT qui absorbe la différence — ce que personne ne vise.
 *
 * ⚠️ ET ELLE SE MESURE, parce qu'elle ne s'écrit pas d'un seul morceau : la
 * coquille en donne 16 (sa réserve, moins la hauteur VUE de la barre) et le
 * lecteur pose les 24 qui restent. Ces deux nombres ne vivent pas dans le
 * même fichier et changeront sans se prévenir.
 */
const SOUS_LE_BOUTON = 40
/** Un pixel de tolérance : les arrondis de mise en page, rien de plus. */
const PRES = 2

/**
 * ── 🔴 ET ILS NE BOUGENT PAS NON PLUS QUAND ON FAIT DÉFILER ────────────────
 *
 * Patrice, le 21 novembre 2026 : *« fixe vraiment le bouton play, car il bouge
 * encore quand je remonte ou descends la page »*. Le test au-dessus ne le
 * voyait pas : il mesure à 844 px de haut, où **rien ne défile**. Une sonde qui
 * ne met jamais la page en situation de défiler ne peut rien dire du
 * défilement.
 *
 * 🧭 ON MESURE DONC SUR UN ÉCRAN COURT, et on vérifie d'abord qu'il défile
 * VRAIMENT. Sans ce contrôle, « le bouton n'a pas bougé » serait vrai pour la
 * mauvaise raison — parce qu'on n'a rien fait défiler du tout.
 */
test('le bouton ne bouge pas quand on fait défiler', async ({ page }) => {
  test.setTimeout(180_000)
  await page.setViewportSize({ width: 390, height: 667 })
  await page.goto('/parcours', { waitUntil: 'domcontentloaded' })
  const href = await page.locator('a[data-module="2"]').getAttribute('href')
  await page.goto(href, { waitUntil: 'domcontentloaded' })
  await page.getByRole('link', { name: 'Écouter' }).click()
  await expect(page.locator('[data-titre-ecoute]')).toBeVisible({ timeout: 20_000 })
  await page.waitForTimeout(800)

  const ou = () =>
    page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((x) =>
        /Écouter la leçon|Mettre en pause/.test(x.getAttribute('aria-label') || ''),
      )
      const c = document.querySelector('.piste-ecoute')
      const meuble = document.querySelector('[data-barre-action]')
      return {
        bouton: b ? Math.round(b.getBoundingClientRect().top) : null,
        curseur: c ? Math.round(c.getBoundingClientRect().top) : null,
        sous:
          b && meuble
            ? Math.round(meuble.getBoundingClientRect().top - b.getBoundingClientRect().bottom)
            : null,
      }
    })

  const pousser = (vers) =>
    page.evaluate((vers) => {
      const r = [...document.querySelectorAll('div')].find(
        (e) => e.scrollHeight > e.clientHeight + 2 && getComputedStyle(e).overflowY === 'auto',
      )
      const m = document.querySelector('main')
      if (r) r.scrollTop = vers === 'bas' ? r.scrollHeight : 0
      if (m) m.scrollTop = vers === 'bas' ? m.scrollHeight : 0
      scrollTo(0, vers === 'bas' ? document.body.scrollHeight : 0)
      return { region: r ? r.scrollHeight - r.clientHeight : 0 }
    }, vers)

  const combien = await pousser('bas')
  await page.waitForTimeout(300)
  const enBas = await ou()
  await pousser('haut')
  await page.waitForTimeout(300)
  const enHaut = await ou()

  const griefs = []
  // 🔴 LA SONDE DOIT D'ABORD AVOIR FAIT DÉFILER QUELQUE CHOSE.
  if (combien.region < 20)
    griefs.push(`rien ne défile (${combien.region} px) : la mesure ne prouve rien`)
  if (enHaut.bouton !== enBas.bouton)
    griefs.push(`le bouton passe de ${enHaut.bouton} à ${enBas.bouton} au défilement`)
  if (enHaut.curseur !== enBas.curseur)
    griefs.push(`le curseur passe de ${enHaut.curseur} à ${enBas.curseur} au défilement`)
  for (const [q, v] of [['en haut', enHaut.sous], ['en bas', enBas.sous]])
    if (Math.abs(v - SOUS_LE_BOUTON) > PRES)
      griefs.push(`${q} du défilement : ${v} px sous le bouton au lieu de ${SOUS_LE_BOUTON}`)

  console.log(
    `  région défile de ${combien.region} px · bouton ${enHaut.bouton}→${enBas.bouton} · ` +
      `curseur ${enHaut.curseur}→${enBas.curseur} · sous ${enHaut.sous}/${enBas.sous}`,
  )
  expect(griefs, `ce qui cloche :\n  · ${griefs.join('\n  · ')}`).toEqual([])
})

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
   * 🔴 ET LE BOUTON RESTE À SA DISTANCE DU MEUBLE. C'est la seule des trois
   * règles qui ne dépende pas de la hauteur de l'écran — voir l'en-tête.
   */
  for (const v of vus.filter((x) => !x.manque)) {
    if (Math.abs(v.air.dessous - SOUS_LE_BOUTON) > PRES)
      griefs.push(
        `« ${v.texte} » : ${v.air.dessous} px sous le bouton au lieu de ${SOUS_LE_BOUTON}`,
      )
  }

  console.log(
    `  ${vus.length} leçons · curseur ${curseurs.join('/')} · bouton ${boutons.join('/')} · ` +
      `air ${vus[0]?.air?.dessus}/${vus[0]?.air?.dessous}`,
  )
  expect(griefs, `ce qui cloche :\n  · ${griefs.join('\n  · ')}`).toEqual([])
  expect(pageErrors, `exception client : ${pageErrors.join(' · ')}`).toEqual([])
})
