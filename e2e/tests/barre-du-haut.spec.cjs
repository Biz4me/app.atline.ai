// UN SEUL GABARIT DE BARRE DU HAUT, SUR TOUTES LES PAGES, SANS EXCEPTION.
//
//   E2E_BASE=https://v2.atline.ai npx playwright test tests/barre-du-haut.spec.cjs
//
// ── 🔴 POURQUOI ELLE EXISTE (21 novembre 2026) ─────────────────────────────
//
// Patrice : *« toutes les barres à la même hauteur, avec une police de même
// taille, texte centré avec icône, c'est la meilleure des cohérences »*. Puis,
// quand j'ai répondu que 20 écrans portaient déjà ce gabarit : *« tu es sûr
// que toutes les topbars auront le même gabarit, du coup, sans exception ? »*
//
// 🔴 ET JE NE POUVAIS PAS EN ÊTRE SÛR. Relevé réel : **30 barres, SIX formes,
// QUATRE hauteurs** — 45, 65, 67, 74. Dont une écrite à la main HORS de la
// coquille, que relire le composant commun n'aurait jamais montrée. Mon
// « 20 écrans » était faux : il y en avait cinq.
//
// 🧭 « SANS EXCEPTION » NE SE PROMET PAS, ÇA SE MESURE. C'est tout l'objet de
// ce fichier : il parcourt chaque écran et refuse le moindre écart. Une
// réponse d'humain vaut pour aujourd'hui ; celle-ci vaut pour demain.
//
// ── LE GABARIT ────────────────────────────────────────────────────────────
//
//   hauteur 65 · icône 22 collée au titre · titre 23/700 · la PAIRE centrée
//
// ⚠️ L'ICÔNE N'EST PAS TOUJOURS UN `<svg>` : sur l'accueil c'est la pastille
// de l'activité, un `<span>` de 22. On cherche donc « quelque chose de 22 px
// juste avant le titre », pas une balise.
const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

const HAUTEUR = 65
const TAILLE = 23
const MILIEU = 195
/** Le centre du bloc peut dériver de ce qui l'accompagne (un chevron). */
const JEU = 12

const mesurer = (page, r) =>
  page.evaluate((r) => {
    const h = document.querySelector('header')
    if (!h) return { r, barre: null }
    const hb = h.getBoundingClientRect()
    const lisible = (e) => {
      const b = e.getBoundingClientRect()
      return b.height > 4 && b.width > 4 && getComputedStyle(e).clipPath === 'none'
    }
    // Le titre : le plus grand texte visible de la barre.
    const titre = [...h.querySelectorAll('h1, p, span, b')]
      .filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && lisible(e))
      .sort((a, b) => parseFloat(getComputedStyle(b).fontSize) - parseFloat(getComputedStyle(a).fontSize))[0]
    if (!titre) return { r, barre: Math.round(hb.height), texte: null }
    const bt = titre.getBoundingClientRect()
    // L'icône : n'importe quoi d'environ 22 px juste à gauche du titre.
    const ic = [...h.querySelectorAll('svg, span, img')]
      .filter((e) => {
        const b = e.getBoundingClientRect()
        return b.width >= 18 && b.width <= 26 && b.height >= 18 && b.height <= 26 &&
          b.right <= bt.left + 2 && b.right > bt.left - 26
      })
      .pop()
    /**
     * ⚠️ ON CENTRE LE CONTRÔLE, PAS LE TEXTE. Sur l'accueil la paire
     * icône + nom vit dans un BOUTON qui porte aussi un chevron : la paire
     * seule paraît décalée de 14 px alors que le bouton, lui, est centré à
     * 194. Mesurer le texte aurait fait crier la sonde sur un écran juste.
     */
    const bloc = titre.closest('button, a') ?? (ic ? null : titre)
    const g = bloc ? bloc.getBoundingClientRect() : null
    const gauche = g ? g.left : ic ? ic.getBoundingClientRect().left : bt.left
    const droite = g ? g.right : bt.right
    return {
      r,
      barre: Math.round(hb.height),
      texte: titre.textContent.trim().slice(0, 24),
      px: Math.round(parseFloat(getComputedStyle(titre).fontSize)),
      poids: Number(getComputedStyle(titre).fontWeight),
      icone: ic ? Math.round(ic.getBoundingClientRect().width) : null,
      centre: Math.round((gauche + droite) / 2),
    }
  }, r)

test('toutes les barres du haut portent le même gabarit', async ({ page, pageErrors }) => {
  test.setTimeout(900_000)

  // ── Les adresses à paramètre, résolues et pas devinées ──
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

  /**
   * 🔴 LA LISTE EST ÉCRITE, ET C'EST VOULU. La déduire des fichiers de routes
   * donnerait une sonde qui s'étend toute seule — et qui, le jour où un écran
   * naît, passerait au vert sans qu'on ait regardé sa barre. Ajouter une ligne
   * ici est le geste qui dit « j'ai vu cet écran ».
   *
   * ⚠️ `/auth` N'Y EST PAS, et son absence est une décision : l'écran de
   * connexion vit hors de l'app, il n'a pas de barre à harmoniser.
   */
  const routes = [
    '/accueil', '/a-faire', '/activite', '/agenda', '/agenda/nouveau', '/agenda/passe',
    '/agenda/connexion', '/atlas', '/coach/repeter', '/coach/repeter/appels',
    '/coach/repeter/resultats', '/coach/repeter/appel', '/compte', '/compte/securite',
    '/gens', fiche, fiche + '/appeler', fiche + '/ecrire', '/gens/filtrer', '/gens/importer',
    '/gens/incomplets', '/gens/nouveau', '/parcours', '/parcours/competences',
    mod, mod + '/carte', lecon, lecon + '/ecouter', '/profil', '/profil/identite',
  ]

  const vus = []
  for (const r of routes) {
    await page.goto(r, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(400)
    vus.push(await mesurer(page, r))
  }

  const griefs = []
  for (const v of vus) {
    const ou = v.r.replace(/\/[a-z0-9]{20,}/gi, '/…')
    if (v.barre === null) {
      griefs.push(`${ou} : aucune barre du haut`)
      continue
    }
    if (v.barre !== HAUTEUR) griefs.push(`${ou} : barre de ${v.barre} px au lieu de ${HAUTEUR}`)
    if (!v.texte) {
      griefs.push(`${ou} : aucun titre visible dans la barre`)
      continue
    }
    if (v.px !== TAILLE) griefs.push(`${ou} : titre en ${v.px} px au lieu de ${TAILLE} — « ${v.texte} »`)
    if (v.poids < 700) griefs.push(`${ou} : titre en graisse ${v.poids} au lieu de 700`)
    if (!v.icone) griefs.push(`${ou} : aucune icône de 22 px contre le titre — « ${v.texte} »`)
    if (Math.abs(v.centre - MILIEU) > JEU)
      griefs.push(`${ou} : bloc centré à ${v.centre} au lieu de ${MILIEU} — « ${v.texte} »`)
  }

  const hauteurs = [...new Set(vus.map((v) => v.barre))].sort()
  const tailles = [...new Set(vus.map((v) => v.px))].sort()
  console.log(`  ${vus.length} barres · hauteurs ${hauteurs.join('/')} · tailles de titre ${tailles.join('/')}`)

  // 🔴 SANS LES TRENTE, CETTE SONDE N'ÉPROUVE RIEN. Une adresse qui redirige
  // en silence ferait mesurer deux fois le même écran et manquer l'autre.
  expect(vus.length, 'la sonde n’a pas parcouru tous les écrans').toBe(routes.length)
  expect(griefs, `ce qui cloche :\n  · ${griefs.join('\n  · ')}`).toEqual([])
  expect(pageErrors, `exception client : ${pageErrors.join(' · ')}`).toEqual([])
})
