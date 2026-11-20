// TOUTES LES TAILLES DE « APPRENDRE », MESURÉES SUR L'ÉCRAN RÉEL
//
//     E2E_BASE=https://v2.atline.ai npx playwright test tests/audit-typo-apprendre.spec.cjs
//
// Demandé par Patrice le 20 novembre 2026 : *« un check des tailles de polices
// de Apprendre et de toutes ces pages sans oublier une seule taille, même les
// icônes et dans les barres »*.
//
// 🔴 ON MESURE, ON NE RELIT PAS LE CODE. Une classe `text-[length:var(…)]` dit
// quel JETON est demandé, pas ce qui est peint : l'héritage, une règle plus
// forte ou un `<style>` local peuvent le contredire — c'est exactement ce qui
// avait mis la gélule d'un filtre à 18 px au lieu de 44. Seul `getComputedStyle`
// sur la page vivante dit la vérité.
//
// ⚠️ ET LES ICÔNES COMPTENT AUSSI. Elles ne sont pas de la typographie, mais
// deux glyphes de 18 et 20 px côte à côte se voient comme du bruit, et c'est
// la même question : combien de valeurs différentes pour un même rôle.
const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

/** L'échelle maison, telle que `globals.css` la déclare. */
const ECHELLE = [29, 23, 17, 15, 13, 11]

/**
 * Relever CE QUI EST PEINT.
 *
 * ⚠️ ON NE GARDE QUE LES ÉLÉMENTS QUI PORTENT DU TEXTE EN PROPRE. Sans ça, un
 * conteneur hérite de la taille de son enfant et le même texte est compté cinq
 * fois, une par niveau de la pile.
 */
const releve = (page) =>
  page.evaluate(() => {
    const visible = (e) => {
      const r = e.getBoundingClientRect()
      const s = getComputedStyle(e)
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.opacity !== '0'
    }
    const textes = []
    for (const e of document.querySelectorAll('body *')) {
      if (e.tagName === 'SCRIPT' || e.tagName === 'STYLE' || e.tagName === 'SVG') continue
      const propre = [...e.childNodes]
        .filter((n) => n.nodeType === 3)
        .map((n) => n.textContent.trim())
        .join(' ')
        .trim()
      if (!propre || !visible(e)) continue
      const s = getComputedStyle(e)
      textes.push({
        px: Math.round(parseFloat(s.fontSize)),
        graisse: Number(s.fontWeight),
        texte: propre.slice(0, 44),
        balise: e.tagName.toLowerCase(),
      })
    }
    const icones = []
    for (const e of document.querySelectorAll('svg')) {
      if (!visible(e)) continue
      const r = e.getBoundingClientRect()
      icones.push({
        px: Math.round(r.width),
        haut: Math.round(r.height),
        ou: e.closest('[data-barre-bas]')
          ? 'barre du bas'
          : e.closest('[data-barre-action]')
            ? 'geste du jour'
            : e.closest('[data-pastille-ecoute]')
              ? 'pastille'
              : e.closest('header')
                ? 'barre du haut'
                : 'page',
      })
    }
    return { textes, icones }
  })

/** Regrouper par taille, avec quelques exemples. */
function parTaille(liste, cle = 'texte') {
  const m = new Map()
  for (const x of liste) {
    const e = m.get(x.px) ?? { px: x.px, n: 0, exemples: [], graisses: new Set() }
    e.n++
    if (x.graisse) e.graisses.add(x.graisse)
    if (e.exemples.length < 4 && !e.exemples.includes(x[cle])) e.exemples.push(x[cle])
    m.set(x.px, e)
  }
  return [...m.values()]
    .sort((a, b) => b.px - a.px)
    .map((e) => ({ ...e, graisses: [...e.graisses].sort() }))
}

test('relevé des tailles sur tous les écrans d’Apprendre', async ({ page }) => {
  const jetons = await page.goto('/parcours', { waitUntil: 'domcontentloaded' }).then(() =>
    page.evaluate(() => {
      const s = getComputedStyle(document.documentElement)
      return ['display', 'titre', 'lecture', 'corps', 'label', 'micro'].map((n) => ({
        jeton: `--text-${n}`,
        valeur: s.getPropertyValue(`--text-${n}`).trim(),
      }))
    }),
  )
  console.log('ÉCHELLE DÉCLARÉE ' + JSON.stringify(jetons))

  const moduleHref = await page.locator('a[data-module="1"]').getAttribute('href')
  const ecrans = []

  const noter = async (nom) => {
    const r = await releve(page)
    ecrans.push({ nom, adresse: page.url().replace(/^https?:\/\/[^/]+/, ''), ...r })
  }

  // ── 1. L'étagère
  await noter('Apprendre (étagère)')

  // ── 2. La couverture du module
  await page.goto(moduleHref, { waitUntil: 'domcontentloaded' })
  await page.locator('[data-lecon]').first().waitFor({ state: 'visible', timeout: 20_000 })
  await noter('Couverture du module')

  // ── 3. La carte mentale, si le module en a une
  const carte = page.locator(`a[href="${moduleHref}/carte"]`)
  if (await carte.count()) {
    await carte.first().click()
    await page.waitForURL(/\/carte$/, { timeout: 20_000 })
    await noter('Carte mentale')
    await page.goBack()
    await page.locator('[data-lecon]').first().waitFor({ state: 'visible', timeout: 20_000 })
  }

  // ── 4. La liseuse
  const versLecon = await page.locator('[data-lecon]').first().getAttribute('href')
  await page.goto(versLecon, { waitUntil: 'domcontentloaded' })
  await page.locator('[data-rang]').waitFor({ state: 'visible', timeout: 20_000 })
  await noter('Liseuse (texte)')

  // ── 5. Les options de lecture (la feuille du filtre)
  const filtre = page.locator('[data-options-lecture], [data-options]').first()
  if (await filtre.count()) {
    await filtre.click()
    await page.waitForTimeout(400)
    await noter('Liseuse · options')
    await page.keyboard.press('Escape').catch(() => {})
    await page.waitForTimeout(300)
  }

  // ── 6. L'écoute
  await page.goto(`${versLecon}/ecouter`, { waitUntil: 'domcontentloaded' })
  await page.locator('[data-titre-ecoute]').waitFor({ state: 'visible', timeout: 20_000 })
  await noter('Écoute')

  // ── 7. Les options d'écoute
  const filtreEcoute = page.locator('[data-options-ecoute]')
  if (await filtreEcoute.count()) {
    await filtreEcoute.click()
    await page.waitForTimeout(400)
    await noter('Écoute · options')
  }

  // ── 8. La pastille, sur un écran qui n'est pas celui de la leçon
  await page.goto(moduleHref, { waitUntil: 'domcontentloaded' })
  await page.locator('[data-lecon]').first().waitFor({ state: 'visible', timeout: 20_000 })
  if (await page.locator('[data-pastille-ecoute]').count()) await noter('Couverture + pastille')

  // ── Le rapport
  const tout = { textes: [], icones: [] }
  for (const e of ecrans) {
    tout.textes.push(...e.textes)
    tout.icones.push(...e.icones)
    console.log(`\n━━ ${e.nom}  (${e.adresse})`)
    console.log('  TEXTE  ' + JSON.stringify(parTaille(e.textes)))
    console.log('  ICÔNES ' + JSON.stringify(parTaille(e.icones, 'ou')))
  }

  console.log('\n━━━━ TOUT APPRENDRE ━━━━')
  const tTextes = parTaille(tout.textes)
  const tIcones = parTaille(tout.icones, 'ou')
  console.log('TEXTE  ' + JSON.stringify(tTextes))
  console.log('ICÔNES ' + JSON.stringify(tIcones))

  const hors = tTextes.filter((t) => !ECHELLE.includes(t.px))
  console.log('\nHORS ÉCHELLE ' + JSON.stringify(hors))
  console.log(`\nRÉSUMÉ · ${tTextes.length} tailles de texte, ${tIcones.length} tailles d’icône, ${hors.length} hors échelle`)

  // 🔴 LE RELEVÉ N'ÉCHOUE PAS : on vient CONSTATER, pas sanctionner. Les écarts
  // se règlent ensuite, et c'est alors qu'une sonde les tiendra.
  expect(ecrans.length, 'aucun écran relevé').toBeGreaterThan(4)
})
