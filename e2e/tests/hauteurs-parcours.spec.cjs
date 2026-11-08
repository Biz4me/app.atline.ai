// LES CARTES ONT-ELLES TOUTES LA MEME HAUTEUR, ET AUCUN TITRE N'EST-IL ROGNE ?
//
// 🔴 Aux QUATRE largeurs, sur les DEUX ecrans. Mesurer a une seule largeur a
// deja laisse passer ce defaut deux fois : sur les fiches contacts, et sur
// les modules. Une hauteur ne se verifie jamais a une seule largeur.
//
// ⚠️ Et sur PLUSIEURS modules : les 71 titres de lecon vont de 30 a 76
// caracteres. Un seul module ne contient pas le pire cas.
const { test, expect } = require('../fixtures.cjs')

const LARGEURS = [320, 360, 390, 430]

async function controler(page, nom, selecteurCarte, selecteurTitre, combien) {
  // 🔴 UNE SONDE DOIT PROUVER QU'ELLE A MESURÉ QUELQUE CHOSE.
  //
  // Les deux versions précédentes se sont trompées de deux façons opposées, et
  // aucune ne l'a dit :
  //   · l'une cherchait un `p` là où le titre était devenu un `span` : zéro
  //     élément, donc « zéro rogné », donc verte en permanence ;
  //   · l'autre écrivait `span:nth-child(2)` SANS le combinateur direct, et
  //     attrapait aussi un `sr-only` haut de 1 px, qu'elle comptait comme un
  //     titre rogné — elle criait sur un écran correct.
  //
  // 🧭 Les deux échouent pareil : on cesse de s'en servir. D'où le compte
  // attendu, déclaré par l'appelant et vérifié avant toute autre mesure.
  const vus = await page.locator(selecteurTitre).count()
  expect(vus, `${nom} : la sonde voit ${vus} titre(s) au lieu de ${combien}`).toBe(combien)

  for (const l of LARGEURS) {
    await page.setViewportSize({ width: l, height: 844 })
    const h = await page.locator(selecteurCarte).evaluateAll((n) =>
      n.map((e) => Math.round(e.getBoundingClientRect().height)),
    )
    const rognes = await page.locator(selecteurTitre).evaluateAll((n) =>
      n.filter((e) => e.scrollHeight > e.clientHeight + 1).length,
    )
    console.log(`  ${nom} ${l}px : ${h.length} cartes · ${new Set(h).size} hauteur(s) ${[...new Set(h)].join('/')} · ${rognes} rogné(s)`)
    expect(new Set(h).size, `${nom} ${l}px : hauteurs différentes`).toBe(1)
    expect(rognes, `${nom} ${l}px : titre rogné`).toBe(0)
  }
}

test('les modules', async ({ page, pageErrors }) => {
  await page.goto('/parcours', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('ol li a').first()).toBeVisible({ timeout: 20_000 })
  await controler(page, 'modules', 'ol li a', 'ol li a > span:nth-child(2)', 11)
  expect(pageErrors).toEqual([])
})

test('les leçons, sur les trois modules aux titres les plus longs', async ({ page, pageErrors }) => {
  await page.goto('/parcours', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('ol li a').first()).toBeVisible({ timeout: 20_000 })
  // Modules 1, 4 et 11 : ils portent les titres de 76, 70 et 71 caractères.
  const liens = await page.locator('ol li a').evaluateAll((n) => n.map((e) => e.getAttribute('href')))
  for (const i of [0, 3, 10]) {
    await page.goto(liens[i], { waitUntil: 'domcontentloaded' })
    await expect(page.locator('ol li a').first()).toBeVisible({ timeout: 20_000 })
    const combien = await page.locator('ol li a').count()
    await controler(page, `module ${i + 1}`, 'ol li a', 'ol li a span.min-w-0 > span:nth-child(2)', combien)
  }
  expect(pageErrors).toEqual([])
})
