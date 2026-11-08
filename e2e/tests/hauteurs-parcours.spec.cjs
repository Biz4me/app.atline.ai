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
    // ⚠️ `[data-lecon]` et pas `ol li a` : depuis le chemin, le quiz et la
    // simulation sont aussi des nœuds, avec un gabarit qui n'est pas celui
    // d'une leçon. Les mesurer ensemble ferait crier la sonde sur un écran
    // correct — exactement le défaut qu'elle vient de nous coûter.
    const combien = await page.locator('ol li a[data-lecon]').count()
    await controler(page, `module ${i + 1}`, 'ol li a[data-lecon]', 'ol li a[data-lecon] > span:nth-child(2) > span:nth-child(2)', combien)
  }
  expect(pageErrors).toEqual([])
})

test('le tracé passe par le centre des nœuds', async ({ page }) => {
  /**
   * 🔴 Il passait 4 px à droite : nœuds centrés à 18, trait à 22. Invisible à
   * l'œil sur une capture, flagrant dès qu'on mesure.
   *
   * 🧭 Et c'est un écart qui DÉRIVE EN SILENCE : le jour où la taille d'un
   * nœud change, le trait reste où il est et plus personne ne s'en aperçoit.
   * Un alignement se vérifie par un nombre, jamais par une capture.
   */
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/parcours', { waitUntil: 'domcontentloaded' })
  const href = await page.locator('ol li a').nth(1).getAttribute('href')
  await page.goto(href, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('ol li a[data-lecon]').first()).toBeVisible({ timeout: 20_000 })

  const ecarts = await page.locator('ol li').evaluateAll((n) =>
    n
      .map((li) => {
        const r = li.getBoundingClientRect()
        const p = li.querySelector('a > span[aria-hidden]')?.getBoundingClientRect()
        const t = li.querySelector(':scope > span[aria-hidden]')?.getBoundingClientRect()
        if (!p || !t) return null
        return Math.round(t.left + t.width / 2 - (p.left + p.width / 2))
      })
      .filter((x) => x !== null),
  )
  console.log(`  écarts tracé/nœud : ${ecarts.join(' ')} px`)
  expect(ecarts.length, 'la sonde ne voit aucun tracé').toBeGreaterThan(2)
  for (const e of ecarts) expect(Math.abs(e), 'le tracé ne passe pas par le centre').toBeLessThanOrEqual(1)
})
