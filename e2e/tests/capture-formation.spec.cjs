const { test, expect } = require('../fixtures.cjs')
test('formation', async ({ page, pageErrors }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/parcours', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 })
  await page.evaluate(() => { document.getAnimations().forEach((a) => { try { a.finish() } catch {} }) })
  // 🔴 LA HAUTEUR DES ONZE CARTES. C'est la demande de Patrice, et c'est le
  // genre de chose qu'une capture ne dit pas : à 390 px tout peut sembler
  // aligné pendant qu'un titre long déborde à 320.
  for (const l of [320, 360, 390, 430]) {
    await page.setViewportSize({ width: l, height: 844 })
    const h = await page.locator('ol li a').evaluateAll((n) => n.map((e) => Math.round(e.getBoundingClientRect().height)))
    const rognes = await page.locator('ol li a p:nth-child(2)').evaluateAll((n) => n.filter((e) => e.scrollHeight > e.clientHeight + 1).length)
    console.log(`  ${l}px : ${new Set(h).size} hauteur(s) ${[...new Set(h)].join('/')} · ${rognes} titre(s) rogné(s)`)
    expect(new Set(h).size, `${l}px : les cartes n'ont pas toutes la même hauteur`).toBe(1)
    expect(rognes, `${l}px : un titre de module est rogné`).toBe(0)
  }
  await page.setViewportSize({ width: 390, height: 844 })
  console.log('  bouton : ' + (await page.locator('main ~ a, a').filter({ hasText: /module/i }).last().innerText().catch(() => '?')))
  await page.screenshot({ path: 'formation.png', fullPage: true })
  expect(pageErrors).toEqual([])
})
