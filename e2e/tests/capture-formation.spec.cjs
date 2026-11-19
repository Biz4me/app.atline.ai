const { test, expect } = require('../fixtures.cjs')
test('formation', async ({ page, pageErrors }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/parcours', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 })
  await page.evaluate(() => { document.getAnimations().forEach((a) => { try { a.finish() } catch {} }) })
  // ⚠️ ELLE NE MESURE PLUS RIEN : les hauteurs et les titres rognés sont
  // vérifiés par `hauteurs-parcours.spec.cjs`, qui le fait sur les DEUX écrans
  // et déclare le nombre de titres qu'il doit voir. Ici on ne fait qu'une
  // image — et une sonde qui mesure en double finit par diverger de l'autre.
  console.log('  bouton : ' + (await page.locator('main ~ a, a').filter({ hasText: /module/i }).last().innerText().catch(() => '?')))
  await page.screenshot({ path: 'formation.png', fullPage: true })
  expect(pageErrors).toEqual([])
})
