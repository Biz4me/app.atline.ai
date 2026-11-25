// LE CURSEUR ET LE BOUTON NE BOUGENT PAS D'UNE LEÇON À L'AUTRE, NI AU DÉFILEMENT.
//
//   E2E_BASE=https://v2.atline.ai npx playwright test tests/lecteur-fixe.spec.cjs
//
// ── 🔴 CE QU'ELLE TIENT, ET POURQUOI ÇA SE DÉRÈGLE TOUT SEUL ──────────────
//
// Patrice, le 21 novembre 2026 : *« le bouton play doit toujours garder sa
// position, de même pour le curseur »*.
//
// 🔴 MESURÉ SUR LES 71 LEÇONS : les titres vont d'une à deux lignes, et le
// bloc du titre varierait donc en hauteur — poussant le bouton. La parade est
// de RÉSERVER le pire cas (le titre a sa hauteur fixe) : c'est au TEXTE
// d'absorber sa variation, jamais aux commandes.
//
// ── 🔴 ET LE PLAY N'EST PLUS « POSÉ COMME AJOUTER UN CONTACT » (25 nov. 2026)
//
// Il l'était : même taille, même distance au meuble (12 px), posé pareil. Mais
// Patrice a demandé de CENTRER le transport *« entre le trait de la bottombar et
// le titre qui défile »* — sur un écran d'écoute, le lecteur EST le sujet, pas
// un geste posé sur le meuble. Le play n'a donc plus 12 px sous lui mais le MÊME
// air que par-dessus (31). L'invariant n'est plus « à 12 du meuble », c'est
// « CENTRÉ » : autant d'air dessus que dessous. Et il tient toujours sa place.
const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

/** Un pixel de tolérance : les arrondis de mise en page, rien de plus. */
const PRES = 2

/** Mesure le transport sur l'écran d'écoute : fixe, taille, et ses deux airs. */
function mesurerTransport(page) {
  return page.evaluate(() => {
    const titre = document.querySelector('[data-titre-ecoute]')
    const b = [...document.querySelectorAll('button')].find((x) =>
      /Écouter la leçon|Mettre en pause/.test(x.getAttribute('aria-label') || ''),
    )
    // La barre du livre est une barre de NAVIGATION (`data-barre-bas`) depuis le
    // 21 nov. 2026 ; l'action (`data-barre-action`) n'existe que sur d'autres
    // écrans. On prend celle qui est là.
    const meuble =
      document.querySelector('[data-barre-action]') || document.querySelector('[data-barre-bas]')
    if (!titre || !b || !meuble) return null
    const rt = titre.getBoundingClientRect()
    const rb = b.getBoundingClientRect()
    let fixe = false
    for (let e = b; e && e !== document.body; e = e.parentElement)
      if (getComputedStyle(e).position === 'fixed') fixe = true
    return {
      fixe,
      haute: Math.round(rb.height),
      dessus: Math.round(rb.top - rt.bottom),
      dessous: Math.round(meuble.getBoundingClientRect().top - rb.bottom),
    }
  })
}

async function ouvrirUneEcoute(page, module = 2) {
  await page.goto('/parcours', { waitUntil: 'domcontentloaded' })
  const href = await page.locator(`a[data-module="${module}"]`).getAttribute('href')
  await page.goto(href, { waitUntil: 'domcontentloaded' })
  await page.getByRole('link', { name: 'Écouter' }).click()
  await expect(page.locator('[data-titre-ecoute]')).toBeVisible({ timeout: 20_000 })
  await page.waitForTimeout(800)
}

test('le transport est fixe et centré entre le titre et le meuble', async ({ page }) => {
  test.setTimeout(120_000)
  await ouvrirUneEcoute(page)
  const t = await mesurerTransport(page)
  console.log(`  transport ${JSON.stringify(t)}`)

  const griefs = []
  if (!t) griefs.push('le transport est introuvable : rien à mesurer')
  else {
    // 🔴 FIXE, et pas « immobile par la mise en page ». Patrice a dû le redire
    // trois fois : un bouton sorti du flux souple a l'air fixe sans l'être, et
    // la première mise en page de demain le déplace.
    if (!t.fixe) griefs.push('le bouton de lecture n’est pas dans un élément fixe')
    if (t.haute !== 48) griefs.push(`le bouton fait ${t.haute} px de haut au lieu de 48`)
    // 🔴 L'INVARIANT DU 25 NOVEMBRE : CENTRÉ. Autant d'air au-dessus (du titre)
    // qu'au-dessous (du meuble). On ne fige PAS le nombre — c'est l'égalité qui
    // porte le sens, pas « 31 ».
    if (Math.abs(t.dessus - t.dessous) > PRES)
      griefs.push(`le transport n’est pas centré : ${t.dessus} px au-dessus, ${t.dessous} en dessous`)
  }
  expect(griefs, `ce qui cloche :\n  · ${griefs.join('\n  · ')}`).toEqual([])
})

test('le bouton ne bouge pas quand on fait défiler', async ({ page }) => {
  test.setTimeout(180_000)
  /**
   * 🔴 ON MESURE SUR UN ÉCRAN COURT (568, le premier iPhone SE), parce qu'à
   * 844 px rien ne défile et « le bouton n'a pas bougé » serait vrai pour la
   * mauvaise raison. On vérifie d'abord qu'il y a VRAIMENT eu du défilement.
   */
  await page.setViewportSize({ width: 390, height: 568 })
  await ouvrirUneEcoute(page)

  const ou = () =>
    page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((x) =>
        /Écouter la leçon|Mettre en pause/.test(x.getAttribute('aria-label') || ''),
      )
      const c = document.querySelector('.piste-ecoute')
      return {
        bouton: b ? Math.round(b.getBoundingClientRect().top) : null,
        curseur: c ? Math.round(c.getBoundingClientRect().top) : null,
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
  if (combien.region < 20)
    griefs.push(`rien ne défile (${combien.region} px) : la mesure ne prouve rien`)
  if (enHaut.bouton !== enBas.bouton)
    griefs.push(`le bouton passe de ${enHaut.bouton} à ${enBas.bouton} au défilement`)
  if (enHaut.curseur !== enBas.curseur)
    griefs.push(`le curseur passe de ${enHaut.curseur} à ${enBas.curseur} au défilement`)

  console.log(
    `  région défile de ${combien.region} px · bouton ${enHaut.bouton}→${enBas.bouton} · ` +
      `curseur ${enHaut.curseur}→${enBas.curseur}`,
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
  // Cinq modules : assez pour rencontrer les différentes longueurs de titre.
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
          return {
            texte: t.textContent.trim().slice(0, 24),
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
  // 🔴 SANS PLUSIEURS LEÇONS, CETTE SONDE N'ÉPROUVE RIEN : « une position » est
  // toujours constante quand on n'en relève qu'une.
  if (vus.length < 10) griefs.push(`${vus.length} leçon(s) relevée(s) : trop peu pour parler de stabilité`)
  if (vus.some((v) => v.manque)) griefs.push('le lecteur manque sur au moins une leçon')

  const curseurs = [...new Set(vus.map((v) => v.curseur))]
  const boutons = [...new Set(vus.map((v) => v.bouton))]
  if (curseurs.length > 1) griefs.push(`le curseur se déplace : ${curseurs.sort().join(', ')}`)
  if (boutons.length > 1) griefs.push(`le bouton se déplace : ${boutons.sort().join(', ')}`)

  // 🔴 ET LE TRANSPORT RESTE CENTRÉ : autant d'air dessus que dessous, sur
  // chaque leçon. C'est l'invariant du 25 novembre, en remplacement de l'ancien
  // « 12 px du meuble ».
  for (const v of vus.filter((x) => !x.manque)) {
    if (Math.abs(v.air.dessus - v.air.dessous) > PRES)
      griefs.push(
        `« ${v.texte} » : transport décentré (${v.air.dessus} dessus, ${v.air.dessous} dessous)`,
      )
  }

  console.log(
    `  ${vus.length} leçons · curseur ${curseurs.join('/')} · bouton ${boutons.join('/')} · ` +
      `air ${vus[0]?.air?.dessus}/${vus[0]?.air?.dessous}`,
  )
  expect(griefs, `ce qui cloche :\n  · ${griefs.join('\n  · ')}`).toEqual([])
  expect(pageErrors, `exception client : ${pageErrors.join(' · ')}`).toEqual([])
})
