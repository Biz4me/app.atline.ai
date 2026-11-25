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

/**
 * ── 🔴 VISITE DIRECTE, ET PAS LE CLIC « ÉCOUTER » DEPUIS LE MODULE ─────────
 *
 * Tourner la page du module puis ouvrir l'écoute l'empile en FEUILLE au-dessus
 * de la page du module : deux `[data-coquille]` en flux, donc un document deux
 * fois plus haut que la vue — et le DOCUMENT défile alors, même si la région de
 * l'écoute, elle, est bien clipée. C'est un artefact de l'empilement, pas l'état
 * de l'écran que la personne voit (une seule coquille, `winSerre = 0`). On visite
 * donc `/ecouter` EN DIRECT quand on veut juger si la page défile.
 */
async function ouvrirEcouteDirecte(page, module = 2) {
  await page.goto('/parcours', { waitUntil: 'domcontentloaded' })
  const href = await page.locator(`a[data-module="${module}"]`).getAttribute('href')
  await page.goto(href, { waitUntil: 'domcontentloaded' })
  const lecon = await page.locator('ol li a[data-lecon]').first().getAttribute('href')
  await page.goto(lecon + '/ecouter', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-titre-ecoute]')).toBeVisible({ timeout: 20_000 })
  await page.waitForTimeout(600)
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

test('la page est figée à la verticale, même quand le contenu déborde', async ({ page }) => {
  test.setTimeout(180_000)
  /**
   * ── 🔴 L'INVARIANT A CHANGÉ LE 25 NOVEMBRE 2026 ──────────────────────────
   *
   * Avant, on prouvait que le bouton ne bougeait PAS QUAND la page défilait.
   * Patrice : *« cette page ne doit bouger pour rien d'autre que la réduction
   * avec le morphing »*. La région est passée en `overflow-y-clip` : la page
   * ne défile donc PLUS DU TOUT à la verticale, et c'est ÇA qu'on tient
   * maintenant. L'ancienne sonde criait « rien ne défile : la mesure ne prouve
   * rien » — vrai hier, à l'envers aujourd'hui : le non-défilement EST l'acquis.
   *
   * 🧭 DEUX AXES À NE PAS CONFONDRE. Le carrousel des pochettes, lui, défile à
   * l'HORIZONTALE (`overflow-x-visible`) — un autre axe, qu'on ne touche pas.
   * On mesure donc le seul débord VERTICAL.
   *
   * 🔴 ET LA MESURE N'EST PAS VIDE. Sur un écran court (480), le contenu
   * DÉBORDE la région clipée : il y a bien quelque chose qui défilerait sans le
   * clip (`serre > 0`). C'est ce qui empêche « la page ne bouge pas » d'être
   * vrai pour la mauvaise raison — une page qui ne déborde pas ne prouve rien.
   */
  await page.setViewportSize({ width: 390, height: 480 })
  await ouvrirEcouteDirecte(page)

  const sonde = () =>
    page.evaluate(() => {
      const cov =
        document.querySelector('[data-carrousel-modules] [aria-current] img') ||
        document.querySelector('[data-carrousel-modules] img')
      // La région d'écoute est celle que l'on a passée en `overflow-y: clip`.
      const region = [...document.querySelectorAll('div')].find(
        (e) => getComputedStyle(e).overflowY === 'clip',
      )
      return {
        // L'illustration : c'est elle que « monte alors que mon doigt est dessus »
        // visait. Si la page bouge, elle bouge.
        cover: cov ? Math.round(cov.getBoundingClientRect().top) : null,
        // Ce que la région serre sous le clip : ce qui défilerait sans lui.
        serre: region ? Math.max(0, region.scrollHeight - region.clientHeight) : -1,
        regionScroll: region ? Math.round(region.scrollTop) : -1,
        scrollY: Math.round(window.scrollY),
      }
    })

  const avant = await sonde()
  // On tente de pousser TOUT ce qui pourrait défiler à la verticale.
  await page.evaluate(() => {
    scrollTo(0, 99999)
    const m = document.querySelector('main')
    if (m) m.scrollTop = 99999
    document.querySelectorAll('div').forEach((e) => {
      const o = getComputedStyle(e).overflowY
      if (o === 'auto' || o === 'scroll') e.scrollTop = 99999
    })
  })
  await page.waitForTimeout(300)
  const apres = await sonde()

  const griefs = []
  // 🔴 LE GARDE ANTI-VIDE, INVERSÉ : il faut que ça DÉBORDE pour que « figé »
  // veuille dire quelque chose. Sur un écran de 480, la pochette (280) et ses
  // commandes ne tiennent pas : la région serre donc du contenu sous le clip.
  if (avant.serre <= 2)
    griefs.push(`la région ne déborde pas (${avant.serre} px serrés) : la mesure ne prouve rien`)
  // L'ACQUIS : rien n'a bougé à la verticale malgré la poussée.
  if (apres.scrollY > 2) griefs.push(`la fenêtre a défilé de ${apres.scrollY} px : la page n'est pas figée`)
  if (apres.regionScroll > 2)
    griefs.push(`la région a défilé de ${apres.regionScroll} px : le clip ne tient pas`)
  if (avant.cover !== apres.cover)
    griefs.push(`l'illustration passe de ${avant.cover} à ${apres.cover} sous la poussée`)

  console.log(
    `  déborde de ${avant.serre} px sous le clip · fenêtre ${apres.scrollY} px · ` +
      `région ${apres.regionScroll} px · illustration ${avant.cover}→${apres.cover}`,
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
