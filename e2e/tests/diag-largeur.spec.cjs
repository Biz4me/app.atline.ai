const { test, expect } = require('../fixtures.cjs')
test('largeur reelle de la colonne', async ({ page }) => {
  for (const l of [390, 1200]) {
    await page.setViewportSize({ width: l, height: 900 })
    for (const url of ['/accueil', '/parcours', '/coach/parler', '/gens']) {
      await page.goto(url, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(500)
      const d = await page.evaluate(() => {
        const c = [...document.querySelectorAll('body *')]
          .filter((e) => getComputedStyle(e).maxWidth === '430px')
        const m = document.querySelector('main')
        return {
          caps: c.length,
          largeurCap: c[0] ? Math.round(c[0].getBoundingClientRect().width) : null,
          main: m ? Math.round(m.getBoundingClientRect().width) : null,
          corps: Math.round(document.body.getBoundingClientRect().width),
        }
      })
      console.log(`  ${l}px ${url.padEnd(14)} caps ${d.caps} · colonne ${d.largeurCap} · main ${d.main} · body ${d.corps}`)
    }
  }
})
