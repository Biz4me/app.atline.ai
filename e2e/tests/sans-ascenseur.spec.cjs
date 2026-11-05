// AUCUN ASCENSEUR, ET LE DÉFILEMENT INTACT.
//
//   E2E_BASE=https://v2.atline.ai E2E_COMME=humanstring@gmail.com \
//     npx playwright test tests/sans-ascenseur.spec.cjs
//
// 🔴 Les deux moitiés comptent, et la seconde davantage : masquer la barre est
// facile, la masquer SANS casser le défilement l'est moins. Une règle posée de
// travers (`overflow: hidden`) ferait disparaître l'ascenseur ET le contenu
// qu'il permettait d'atteindre — un écran tronqué qui a l'air propre.
//
// ── ⚠️ CE QUE CETTE SONDE NE PEUT PAS PROUVER ────────────────────────────
//
// Premier jet : je mesurais la GOUTTIÈRE (`innerWidth - clientWidth`) et la
// place prise dans un conteneur. **Elle passait avant même le correctif** —
// le Chrome piloté dessine déjà ses ascenseurs en superposition, donc ils ne
// prennent aucune place, règle ou pas. Elle ne prouvait rien.
//
// 🧭 Un contrôle d'absence ne vaut que si la sonde a d'abord trouvé la chose.
//
// On mesure donc la RÈGLE — `scrollbar-width` tel que la page le calcule —
// qui vaut `auto` sans le correctif et `none` avec. Ce qui reste hors de
// portée, et qu'il faut dire : l'ascenseur tel qu'il s'affiche sur l'écran de
// quelqu'un, qui dépend de son système.

const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

const ECRANS = ['/accueil', '/parcours', '/coach/repeter', '/agenda', '/gens', '/compte']

test('aucun ascenseur sur les écrans de l’app, et ça défile quand même', async ({
  page,
  pageErrors,
}) => {
  for (const chemin of ECRANS) {
    await page.goto(chemin, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('main')).toBeVisible({ timeout: 20_000 })

    const mesure = await page.evaluate(() => {
      const racine = getComputedStyle(document.documentElement).scrollbarWidth
      const corps = getComputedStyle(document.body).scrollbarWidth

      // Un conteneur qui défile vraiment, fabriqué sur place : la règle doit
      // le couvrir aussi — la feuille, le menu et l'écran d'appel ont chacun
      // leur propre `overflow-y-auto`.
      const d = document.createElement('div')
      d.style.cssText = 'position:fixed;top:0;left:-9999px;width:120px;height:80px;overflow:scroll'
      d.innerHTML = '<div style="height:400px"></div>'
      document.body.appendChild(d)
      const interne = getComputedStyle(d).scrollbarWidth
      // 🔴 ET IL DÉFILE ENCORE. `scrollTop` qui refuse de bouger voudrait dire
      // qu'on a masqué l'ascenseur en supprimant le défilement.
      d.scrollTop = 100
      const defile = d.scrollTop > 0
      d.remove()

      return { racine, corps, interne, defile }
    })

    expect(mesure.racine, `${chemin} : la racine garde « ${mesure.racine} »`).toBe('none')
    expect(mesure.corps, `${chemin} : le corps garde « ${mesure.corps} »`).toBe('none')
    expect(
      mesure.interne,
      `${chemin} : un conteneur qui défile garde « ${mesure.interne} » — la règle ne couvre pas les panneaux`,
    ).toBe('none')
    expect(mesure.defile, `${chemin} : le défilement est CASSÉ, pas juste masqué`).toBe(true)
  }

  // ── Et sur une page assez longue pour défiler pour de vrai ──
  await page.goto('/coach/repeter/resultats', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { level: 1, name: /Où tu en es/ })).toBeVisible({
    timeout: 20_000,
  })
  const avant = await page.evaluate(() => window.scrollY)
  await page.mouse.wheel(0, 600)
  await page.waitForTimeout(300)
  const apres = await page.evaluate(() => ({
    y: window.scrollY,
    debordait: document.documentElement.scrollHeight > window.innerHeight,
  }))
  // Si la page ne dépassait pas l'écran, il n'y avait rien à faire défiler et
  // ce contrôle ne prouverait rien — on le dit plutôt que de le laisser passer.
  if (apres.debordait) {
    expect(apres.y, 'la molette ne fait plus défiler la page').toBeGreaterThan(avant)
  }

  expect(pageErrors, `exceptions JS : ${pageErrors.join(' | ')}`).toHaveLength(0)
})
