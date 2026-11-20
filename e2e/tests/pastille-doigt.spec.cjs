// LE CURSEUR DE LA PASTILLE, AU DOIGT
//
//     E2E_BASE=https://v2.atline.ai npx playwright test tests/pastille-doigt.spec.cjs
//
// 🔴 CE FICHIER EXISTE PARCE QU'UNE SONDE À LA SOURIS A LAISSÉ PASSER UN VRAI
// DÉFAUT. Patrice, sur son téléphone : *« quand je déplace le curseur l'audio
// ne change pas d'endroit, il continue normalement »*. La sonde à la souris,
// elle, visait le centre géométrique du rail et passait au vert.
//
// 🧭 LA DIFFÉRENCE N'EST PAS LE PÉRIPHÉRIQUE, C'EST L'ENDROIT QU'ON VISE. Un
// doigt vise LE SEUL REPÈRE VISIBLE — la boule — et non une coordonnée. Quand
// la boule déborde de sa zone de prise, on tombe à moitié dehors, et dehors
// c'est le glissement de fermeture qui prend le geste : la pastille
// tressaille, l'audio ne bouge pas.
//
// ⚠️ `hasTouch` ET DES ÉVÉNEMENTS TACTILES RÉELS, par CDP : un clic de souris
// emprunte un autre chemin dans le navigateur, et c'est précisément ce chemin
// qui mentait.
const { test, expect } = require('../fixtures.cjs')
const { lancer, ouvrirEcoute } = require('../son.cjs')

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

test('on déplace la lecture en tirant la boule au doigt', async ({ page }) => {
  await ouvrirEcoute(page)
  await lancer(page)
  await page.getByRole('link', { name: /Retour au module/ }).click()
  await page.locator('[data-pastille-ecoute]').waitFor({ state: 'visible', timeout: 15_000 })

  const g = await page.evaluate(() => {
    const r = (s) => {
      const b = document.querySelector(s).getBoundingClientRect()
      return { x: b.x, y: b.y, w: b.width, h: b.height }
    }
    return {
      boule: r('[data-pastille-boule]'),
      zone: r('[data-pastille-curseur]'),
      d: document.querySelector('audio').duration,
    }
  })

  const cdp = await page.context().newCDPSession(page)
  // 🔴 ON VISE LE CENTRE DE LA BOULE, comme un doigt le ferait — pas le rail.
  const x = g.boule.x + g.boule.w / 2
  const y = g.boule.y + g.boule.h / 2
  const cible = 0.7

  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
  for (const p of [0.3, 0.5, cible]) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: g.zone.x + g.zone.w * p, y }],
    })
  }
  const pendant = await page.evaluate(
    () => document.querySelector('[data-pastille-ecoute] a span span')?.textContent.trim() ?? null,
  )
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })

  const apres = await page.evaluate(() => ({
    t: document.querySelector('audio').currentTime,
    pastille: !!document.querySelector('[data-pastille-ecoute]'),
  }))
  console.log(JSON.stringify({ vise: Math.round(g.d * cible), pendant, ...apres }, null, 1))

  const griefs = []
  if (!apres.pastille) griefs.push('tirer la boule au doigt a fermé la pastille')
  if (Math.abs(apres.t - g.d * cible) > g.d * 0.03)
    griefs.push(`arrivé à ${Math.round(apres.t)} s au lieu de ${Math.round(g.d * cible)}`)
  if (!/^\d+:\d\d \/ \d+:\d\d$/.test(pendant ?? ''))
    griefs.push(`pendant le geste, la ligne affiche « ${pendant} » au lieu du temps`)

  expect(griefs, `ce qui cloche :\n  · ${griefs.join('\n  · ')}`).toEqual([])
})
