const { test } = require('../fixtures.cjs')
test.use({ viewport: { width: 390, height: 844 } })

test('dom', async ({ page }) => {
  await page.goto('/parcours', { waitUntil: 'domcontentloaded' })
  await page.locator('a[data-module="1"]').waitFor({ state: 'visible', timeout: 20_000 })
  console.log(
    'ETAGERE ' +
      JSON.stringify(
        await page.evaluate(() => {
          const a = document.querySelector('a[data-module="2"]')
          const arbre = (e, d = 0) =>
            d > 3
              ? []
              : [...e.children].flatMap((c) => [
                  '  '.repeat(d) +
                    c.tagName.toLowerCase() +
                    (c.className ? '.' + String(c.className).slice(0, 40) : '') +
                    ' « ' +
                    (c.childNodes.length && c.childNodes[0].nodeType === 3
                      ? c.textContent.trim().slice(0, 24)
                      : '') +
                    ' »',
                  ...arbre(c, d + 1),
                ])
          return {
            liensParcours: document.querySelectorAll('main a[href^="/parcours/"]').length,
            dataModule: document.querySelectorAll('a[data-module]').length,
            hrefs: [...document.querySelectorAll('a[data-module]')]
              .slice(0, 3)
              .map((e) => e.getAttribute('href')),
            dansUnOl: !!a?.closest('ol'),
            dansUnLi: !!a?.closest('li'),
            arbre: arbre(a),
          }
        }),
        null,
        1,
      ),
  )

  const href = await page.locator('a[data-module="2"]').getAttribute('href')
  await page.goto(href, { waitUntil: 'domcontentloaded' })
  await page.locator('[data-lecon]').first().waitFor({ state: 'visible', timeout: 20_000 })
  console.log(
    'MODULE ' +
      JSON.stringify(
        await page.evaluate(() => ({
          lecons: document.querySelectorAll('ol li a[data-lecon]').length,
          avecDataTitre: document.querySelectorAll('ol li a[data-lecon] [data-titre]').length,
          decor: document.querySelectorAll('[data-decor-objet]').length,
          traces: document.querySelectorAll('ol li > span[aria-hidden]').length,
          exemple: [...document.querySelectorAll('ol li a[data-lecon]')]
            .slice(0, 1)
            .map((e) => e.outerHTML.slice(0, 300)),
        })),
        null,
        1,
      ),
  )
})
