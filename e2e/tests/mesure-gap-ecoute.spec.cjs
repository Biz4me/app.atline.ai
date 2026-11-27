// MESURE : écart pochette → légende, sur la page MODULE vs la page AUDIO.
//
//     E2E_BASE=https://v2.atline.ai npx playwright test tests/mesure-gap-ecoute.spec.cjs
//
// Patrice veut la MÊME distance sous la pochette que sur la page module
// (« 52 min · 6 leçons »). On mesure les deux avant de régler.
const { test } = require('../fixtures.cjs')
const { ouvrirEcoute } = require('../son.cjs')

test.use({ viewport: { width: 390, height: 844 } })

const IMG = '[data-carrousel-modules] [aria-current] img'

test('écart pochette → légende : module vs audio', async ({ page }) => {
  // ── MODULE ──
  await page.goto('/parcours', { waitUntil: 'domcontentloaded' })
  const href = await page.locator('a[data-module="1"]').getAttribute('href')
  await page.goto(href, { waitUntil: 'domcontentloaded' })
  await page.locator(IMG).waitFor({ state: 'visible', timeout: 20_000 })
  await page.waitForTimeout(700)
  const mod = await page.evaluate((IMG) => {
    const img = document.querySelector(IMG)
    const cap = [...document.querySelectorAll('p')].find(
      (p) => /leçon/i.test(p.textContent) && /·|min/.test(p.textContent),
    )
    if (!img || !cap) return { err: 'introuvable', img: !!img, cap: !!cap }
    return {
      gap: Math.round(cap.getBoundingClientRect().top - img.getBoundingClientRect().bottom),
      texte: cap.textContent.trim(),
    }
  }, IMG)
  console.log('MODULE ' + JSON.stringify(mod))

  // ── AUDIO ──
  await ouvrirEcoute(page)
  await page.locator('[data-rang-ecoute]').waitFor({ state: 'visible', timeout: 20_000 })
  await page.waitForTimeout(700)
  const audio = await page.evaluate((IMG) => {
    const img = document.querySelector(IMG)
    const rang = document.querySelector('[data-rang-ecoute]')
    if (!img || !rang) return { err: 'introuvable', img: !!img, rang: !!rang }
    return {
      gap: Math.round(rang.getBoundingClientRect().top - img.getBoundingClientRect().bottom),
      texte: rang.textContent.trim(),
    }
  }, IMG)
  console.log('AUDIO ' + JSON.stringify(audio))
})
