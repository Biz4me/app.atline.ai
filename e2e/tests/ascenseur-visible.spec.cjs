// L'ASCENSEUR DE LA LISEUSE SE VOIT-IL VRAIMENT ?
//
//     E2E_BASE=https://v2.atline.ai npx playwright test tests/ascenseur-visible.spec.cjs
//
// 🔴 PATRICE, LE 20 NOVEMBRE 2026 : *« je ne vois toujours pas de barre
// ascenseur sur la droite dans la liseuse »*. Le code était écrit, committé et
// présent dans le build déployé — les trois vérifiés. Donc il était là et il
// ne se voyait pas, et aucune relecture ne pouvait dire pourquoi.
//
// La mesure l'a dit en un coup : le rail était peint en `rgb(236, 237, 238)`,
// **l'encre du mode sombre de l'APP**, par-dessus le papier BLANC du livre.
// Un trait presque blanc sur du blanc. En thème clair il se voyait, et c'est
// pourquoi lui ne l'a jamais vu et moi si.
//
// ── 🔴 CE QU'ON MESURE : LE CONTRASTE, PAS L'EXISTENCE ──────────────────────
//
// Un rail opaque, bien placé, large de 3 px et de la couleur du fond passe
// tous les contrôles d'existence. On compose donc sa couleur sur celle du
// papier et on calcule le rapport WCAG, comme `encre-invisible.spec.cjs` le
// fait pour le texte. C'est le seul contrôle qui aurait trouvé ce défaut.
//
// ⚠️ MA PREMIÈRE VERSION TESTAIT `elementFromPoint`, et ce contrôle était
// FAUX : le rail est `pointer-events-none` par construction, donc cette
// fonction le traverse toujours. Il accusait un défaut qui n'existait pas, à
// côté d'un défaut qui existait.
//
// ⚠️ ET LA MESURE ATTEND LE FONDU SANS DÉPASSER LE REPOS. Le rail monte en
// 300 ms et s'efface 900 ms après le dernier mouvement : mesuré tout de
// suite on l'attrape à mi-fondu, mesuré trop tard il est déjà reparti.
const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

/** Sous ça, un trait de 3 px ne se distingue plus du papier. */
const PLANCHER = 1.8

async function ouvrirUneLecon(page) {
  await page.goto('/parcours', { waitUntil: 'domcontentloaded' })
  const vers = await page.locator('[data-module="1"]').getAttribute('href')
  await page.goto(vers, { waitUntil: 'domcontentloaded' })
  const lire = page.getByRole('link', { name: 'Lire' })
  await expect(lire).toBeVisible({ timeout: 20_000 })
  await lire.click()
  await page.locator('[data-rang]').waitFor({ state: 'visible', timeout: 20_000 })
}

/** Tout ce qui décide si un trait de 3 px se voit ou non. */
const RELEVE = `(() => {
  const r = document.querySelector('[data-ascenseur]')
  if (!r) return { absent: true }
  const dedans = r.firstElementChild
  const sr = getComputedStyle(r)
  const br = r.getBoundingClientRect()
  const lis = (c) => (String(c).match(/[\\d.]+/g) || []).map(Number)
  const lum = ([x, y, z]) => {
    const v = [x, y, z].map((n) => {
      const s = n / 255
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]
  }
  const sur = (dessus, dessous, a) =>
    dessus.slice(0, 3).map((c, i) => c * a + dessous[i] * (1 - a))
  const rapport = (a, b) => {
    const [h, l] = [lum(a), lum(b)].sort((x, y) => y - x)
    return Math.round(((h + 0.05) / (l + 0.05)) * 100) / 100
  }

  // 🔴 LE PAPIER, c'est-à-dire ce sur quoi le rail est RÉELLEMENT peint : la
  // couche \`[data-papier]\` du livre, pas le fond du \`body\`.
  const papier = document.querySelector('[data-papier]')
  const fond = lis(getComputedStyle(papier || document.body).backgroundColor)

  let contraste = null, compose = null
  if (dedans) {
    const sd = getComputedStyle(dedans)
    const c = lis(sd.backgroundColor)
    // L'opacité du curseur ET celle du rail se multiplient.
    const a = (c.length > 3 ? c[3] : 1) * Number(sd.opacity) * Number(sr.opacity)
    compose = sur(c, fond, a).map(Math.round)
    contraste = rapport(compose, fond)
  }

  return {
    rail: {
      opacite: Number(sr.opacity).toFixed(2),
      boite: { x: Math.round(br.x), l: Math.round(br.width), h: Math.round(br.height) },
    },
    curseur: dedans && {
      fond: getComputedStyle(dedans).backgroundColor,
      opacite: getComputedStyle(dedans).opacity,
      h: Math.round(dedans.getBoundingClientRect().height),
    },
    papier: 'rgb(' + fond.slice(0, 3).join(', ') + ')',
    compose: compose && 'rgb(' + compose.join(', ') + ')',
    contraste,
    ecran: { l: window.innerWidth },
  }
})()`

test('l’ascenseur se détache du papier pendant qu’on fait glisser', async ({ page }) => {
  await ouvrirUneLecon(page)

  await page.evaluate(() => window.scrollTo({ top: 500, behavior: 'instant' }))
  // Le fondu dure 300 ms, le repos vient à 900 : on mesure entre les deux.
  await page.waitForTimeout(400)
  const vu = await page.evaluate(RELEVE)
  console.log('EN GLISSANT', JSON.stringify(vu, null, 1))

  // ⚠️ On relève tout AVANT d'échouer sur quoi que ce soit : un `expect` qui
  // tombe au premier écart cacherait les suivants, et c'est leur combinaison
  // qui dit pourquoi rien ne se voit.
  const griefs = []
  if (vu.absent) griefs.push('aucun élément [data-ascenseur] dans la page')
  else {
    if (Number(vu.rail.opacite) < 0.9)
      griefs.push(`rail à l'opacité ${vu.rail.opacite} pendant le glissement`)
    if (vu.rail.boite.l < 2) griefs.push(`rail large de ${vu.rail.boite.l} px`)
    if (vu.rail.boite.x + vu.rail.boite.l > vu.ecran.l + 1)
      griefs.push(`rail hors écran : x=${vu.rail.boite.x} sur ${vu.ecran.l}`)
    if (!vu.curseur) griefs.push('le rail est vide : pas de curseur dedans')
    else {
      if (vu.curseur.h < 4) griefs.push(`curseur haut de ${vu.curseur.h} px`)
      if (vu.contraste !== null && vu.contraste < PLANCHER)
        griefs.push(
          `INVISIBLE : ${vu.compose} sur le papier ${vu.papier} = ` +
            `${vu.contraste} de contraste, plancher ${PLANCHER}`,
        )
    }
  }

  expect(griefs, `ce qui empêche de le voir :\n  · ${griefs.join('\n  · ')}`).toEqual([])
})

test('il s’efface au repos, et revient au mouvement suivant', async ({ page }) => {
  await ouvrirUneLecon(page)

  await page.evaluate(() => window.scrollTo({ top: 500, behavior: 'instant' }))
  await page.waitForTimeout(1400)
  const repos = await page.evaluate(RELEVE)
  expect(Number(repos.rail.opacite), 'au repos il doit être parti').toBeLessThan(0.1)

  await page.evaluate(() => window.scrollTo({ top: 900, behavior: 'instant' }))
  await page.waitForTimeout(400)
  const encore = await page.evaluate(RELEVE)
  expect(Number(encore.rail.opacite), 'il doit revenir au mouvement').toBeGreaterThan(0.9)
})
