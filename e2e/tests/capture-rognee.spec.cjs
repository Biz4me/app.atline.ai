// Capture de la première fiche dont la phrase est ROGNÉE, à 320 px : c'est
// là qu'on vérifie à l'œil que les points de suspension sont bien présents.
const { test, expect } = require('../fixtures.cjs')

test('capture d’une fiche rognée', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 })
  await page.goto('/gens', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-contact]').first()).toBeVisible({ timeout: 20_000 })

  const i = await page
    .locator('[data-pas]')
    .evaluateAll((n) => n.findIndex((e) => e.scrollHeight > e.clientHeight + 1))
  console.log(`  première fiche rognée : index ${i}`)
  expect(i, 'aucune fiche rognée à 320 px').toBeGreaterThanOrEqual(0)

  const fiche = page.locator('[data-contact]').nth(i)
  await fiche.scrollIntoViewIfNeeded()
  await page.evaluate(() => window.scrollBy(0, -140))
  await page.evaluate(() => {
    document.getAnimations().forEach((a) => {
      try {
        a.finish()
      } catch {}
    })
  })
  const texte = await fiche.innerText()
  console.log(`  texte : ${texte.split('\n').join(' | ')}`)
  await page.screenshot({ path: 'capture-fiche-rognee.png' })
})
