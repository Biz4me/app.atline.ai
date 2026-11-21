// LE MOBILIER DU BAS : UNE HAUTEUR PAR MEUBLE, SUR TOUS LES ÉCRANS.
//
//   E2E_BASE=https://v2.atline.ai npx playwright test tests/barre-du-bas.spec.cjs
//
// ── 🔴 CE QU'ELLE TIENT, ET CE QUI L'A FAIT NAÎTRE (21 novembre 2026) ──────
//
// Patrice : *« toutes les barres du bas doivent être à la même hauteur, même
// s'il faut sortir des éléments comme dans celle de l'audio »*.
//
// 🔴 RELEVÉ AVANT DE TOUCHER : la colonne fixe du bas faisait **84 px** sur la
// couverture d'un module, « ajouter » et « filtrer » ; **80** sur la liseuse ;
// et **232** sur l'écoute. Deux causes, pas une :
//
//   · 80 contre 84 — des boutons à ICÔNE hauts de 44 là où les boutons à
//     TEXTE font 48. Quatre pixels, invisibles seuls, flagrants au passage ;
//   · 232 — trois rangées empilées : le lecteur (88), le pied (48), la barre.
//
// 🧭 ET LA SECONDE N'ÉTAIT PAS UNE BARRE TROP HAUTE, c'était un malentendu :
// une barre porte des GESTES. Un lecteur avec son curseur, ses deux chronos et
// son bouton n'est pas un geste, c'est le CONTENU de l'écran. Il est descendu
// dans la page.
//
// ⚠️ DEUX MEUBLES, DEUX HAUTEURS, ET C'EST VOULU. La barre des lieux fait 64,
// la barre d'action 84 — dont **24 px de voile invisible** (sa couleur est
// celle de la page, elle ne se voit que là où elle couvre une carte). Le
// meuble visible fait donc 60 contre 64 : le poids perçu est le même.
const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

const ACTION = 84
const LIEUX = 64
/** La cible minimale pour un doigt. Harmoniser par le bas dégraderait. */
const DOIGT = 48

test('le mobilier du bas a une seule hauteur par meuble', async ({ page, pageErrors }) => {
  test.setTimeout(900_000)

  await page.goto('/parcours', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('a[data-module="2"]')).toBeVisible({ timeout: 20_000 })
  const mod = await page.locator('a[data-module="2"]').getAttribute('href')
  await page.goto(mod, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('ol li a[data-lecon]').first()).toBeVisible({ timeout: 20_000 })
  const lecon = await page.locator('ol li a[data-lecon]').first().getAttribute('href')
  await page.goto('/gens', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-contact]').first()).toBeVisible({ timeout: 20_000 })
  const fiche = await page
    .locator('[data-contact]')
    .first()
    .evaluate((e) => (e.closest('a') || e.querySelector('a'))?.getAttribute('href'))

  const ecrans = [
    ['/accueil', 'header'],
    ['/parcours', 'a[data-module]'],
    ['/gens', '[data-contact]'],
    ['/atlas', 'header'],
    ['/agenda', 'header'],
    [mod, 'ol li a[data-lecon]'],
    [lecon, '[data-rang]'],
    [lecon + '/ecouter', '[data-titre-ecoute]'],
    ['/gens/nouveau', 'header'],
    ['/gens/filtrer', 'header'],
    ['/gens/importer', 'header'],
    [fiche, 'header'],
  ]

  const vus = []
  for (const [adresse, attendre] of ecrans) {
    await page.goto(adresse, { waitUntil: 'domcontentloaded' })
    if (attendre) await page.locator(attendre).first().waitFor({ state: 'visible', timeout: 20_000 }).catch(() => {})
    await page.waitForTimeout(500)
    vus.push(
      await page.evaluate((adresse) => {
        const h = (s) => {
          const e = document.querySelector(s)
          return e ? Math.round(e.getBoundingClientRect().height) : null
        }
        const b = document.querySelector('[data-barre-action]')
        return {
          adresse,
          action: h('[data-barre-action]'),
          lieux: h('[data-barre-bas]'),
          rangees: b
            ? [...b.children]
                .map((c) => Math.round(c.getBoundingClientRect().height))
                .filter((x) => x > 2)
            : [],
          cibles: b
            ? [...b.querySelectorAll('a, button')]
                .map((e) => Math.round(e.getBoundingClientRect().height))
                .filter((x) => x > 2)
            : [],
        }
      }, adresse),
    )
  }

  const griefs = []
  for (const v of vus) {
    const ou = v.adresse.replace(/\/[a-z0-9]{20,}/gi, '/…')
    if (v.action !== null) {
      if (v.action !== ACTION)
        griefs.push(`${ou} : barre d’action de ${v.action} px au lieu de ${ACTION} — rangées ${v.rangees.join('+')}`)
      /**
       * 🔴 UNE SEULE RANGÉE, ET C'EST LA VRAIE RÈGLE. Contrôler la hauteur
       * seule laisserait passer deux rangées de 24 : le nombre serait juste et
       * la barre serait redevenue un empilement. Ce qu'on tient, c'est qu'elle
       * ne porte QU'UN niveau de gestes.
       */
      if (v.rangees.length !== 1)
        griefs.push(`${ou} : ${v.rangees.length} rangées dans la barre d’action (${v.rangees.join('+')})`)
      const petites = v.cibles.filter((x) => x < DOIGT)
      if (petites.length) griefs.push(`${ou} : ${petites.length} cible(s) sous ${DOIGT} px (${petites.join(', ')})`)
    }
    if (v.lieux !== null && v.lieux !== LIEUX)
      griefs.push(`${ou} : barre des lieux de ${v.lieux} px au lieu de ${LIEUX}`)
    /**
     * ⚠️ UN ÉCRAN A LE DROIT DE N'AVOIR AUCUN MEUBLE EN BAS, et la fiche
     * contact en est un : ses gestes — appeler, écrire, envoyer un mail —
     * sont des cartes DANS la page, pas une rangée fixe. Exiger un meuble
     * partout reviendrait à imposer une barre là où le produit a choisi
     * autre chose. Ce qui se contrôle, c'est la hauteur de ceux qui existent.
     */
  }

  const ha = [...new Set(vus.map((v) => v.action).filter(Boolean))]
  const hl = [...new Set(vus.map((v) => v.lieux).filter(Boolean))]
  console.log(`  ${vus.length} écrans · barre d’action ${ha.join('/') || '—'} · barre des lieux ${hl.join('/') || '—'}`)

  /**
   * 🔴 ET LA SONDE DOIT AVOIR RENCONTRÉ LES DEUX MEUBLES. Sans ce compte, une
   * app qui les perdrait tous les deux passerait au vert : zéro barre, zéro
   * écart de hauteur, zéro grief. C'est exactement la panne qui a laissé deux
   * sondes de hauteur mentir ensemble le 8 novembre.
   */
  expect(vus.filter((v) => v.action !== null).length, 'aucune barre d’action rencontrée').toBeGreaterThan(4)
  expect(vus.filter((v) => v.lieux !== null).length, 'aucune barre des lieux rencontrée').toBeGreaterThan(3)
  expect(griefs, `ce qui cloche :\n  · ${griefs.join('\n  · ')}`).toEqual([])
  expect(pageErrors, `exception client : ${pageErrors.join(' · ')}`).toEqual([])
})
