// AUCUN ENCADRÉ ORANGE AUTOUR D'UN CHAMP (V2) — 18 novembre 2026.
//
//   E2E_BASE=https://v2.atline.ai E2E_COMME=humanstring@gmail.com \
//     npx playwright test tests/sans-orange-v2.spec.cjs
//
// ── 🔴 POURQUOI CETTE SONDE EXISTE ────────────────────────────────────────
//
// Patrice l'a signalé TROIS FOIS : le composeur d'Atlas le 16 novembre
// (« c'est pourri »), la recherche de contacts le 17, et la fiche le 18 —
// « supprimer tous les encadrés orange que tu peux trouver dans la fiche,
// c'est une règle, c'est pas joli ».
//
// 🧭 Trois fois le même défaut, c'est qu'il n'était jamais vraiment retiré :
// on corrigeait l'endroit signalé, pas la famille. Il revenait par le halo
// de focus global et par le gabarit de champ, partagés par tout l'écran.
//
// ⚠️ ET ELLE NE REGARDE PAS LE CODE, elle regarde le RENDU. Un orange peut
// arriver d'une classe, d'un style en ligne, d'un halo hérité ou d'une
// feuille hors couche — ces quatre-là ne se ressemblent pas dans le source,
// et donnent le même cadre à l'écran.

const { test, expect, toucher } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

/** L'orange de la charte, et ses voisins immédiats. */
const EST_ORANGE = (c) => {
  const p = (c || '').match(/[\d.]+/g)
  if (!p || p.length < 3) return false
  const [r, v, b] = p.map(Number)
  if (p.length > 3 && Number(p[3]) === 0) return false
  // #F97316 = 249,115,22. On accepte une dérive large : ce qu'on cherche,
  // c'est « un orange », pas une valeur exacte.
  return r > 200 && v > 70 && v < 170 && b < 90
}

async function cadresOranges(page) {
  return page.evaluate(() => {
    const trouves = []
    for (const e of document.querySelectorAll('main *, [data-gestes] *')) {
      const s = getComputedStyle(e)
      const w = parseFloat(s.borderTopWidth) || 0
      const ow = parseFloat(s.outlineWidth) || 0
      const plein = s.backgroundColor
      /**
       * ⚠️ ON NE REGARDE QUE LES TRAITS, pas les aplats. L'orange reste
       * légitime quand il REMPLIT — la carte « Appeler », le bouton
       * d'enregistrement. Ce qui est refusé, c'est l'orange qui ENTOURE.
       */
      if (w > 0) trouves.push({ quoi: 'bordure', c: s.borderTopColor, t: (e.textContent || '').trim().slice(0, 20), plein })
      if (ow > 0 && s.outlineStyle !== 'none')
        trouves.push({ quoi: 'halo', c: s.outlineColor, t: (e.textContent || '').trim().slice(0, 20), plein })
    }
    return trouves
  })
}

test('aucun trait orange, nulle part dans la fiche', async ({ page, seed, pageErrors }) => {
  await page.goto(`/gens/${seed.cid}`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 })

  /* 🔴 ON PROUVE LE DÉTECTEUR SUR LA VRAIE VALEUR DU DÉFAUT. Sans ça, une
     sonde qui ne voit rien passe au vert en ne mesurant rien. */
  expect(EST_ORANGE('rgb(249, 115, 22)'), 'le détecteur ne verrait pas l’orange').toBe(true)
  expect(EST_ORANGE('rgb(231, 231, 234)'), 'le détecteur crierait sur un gris').toBe(false)
  expect(EST_ORANGE('rgba(249, 115, 22, 0)'), 'le détecteur crierait sur un trait absent').toBe(
    false,
  )

  // ── Au repos ──
  let fautifs = (await cadresOranges(page)).filter((x) => EST_ORANGE(x.c))
  expect(fautifs, `trait orange au repos : ${JSON.stringify(fautifs)}`).toEqual([])

  // ── Un champ OUVERT, c'est là que le gabarit se voyait ──
  await toucher(page.locator('[data-manque="profession"]'), page.locator('[data-saisie="profession"]'))
  fautifs = (await cadresOranges(page)).filter((x) => EST_ORANGE(x.c))
  expect(fautifs, `trait orange sur un champ ouvert : ${JSON.stringify(fautifs)}`).toEqual([])

  // ── Le champ FOCALISÉ, c'est là que le halo global frappait ──
  await page.locator('[data-saisie="profession"]').focus()
  await page.keyboard.press('Tab')
  await page.keyboard.press('Shift+Tab')
  fautifs = (await cadresOranges(page)).filter((x) => EST_ORANGE(x.c))
  expect(fautifs, `halo orange au focus : ${JSON.stringify(fautifs)}`).toEqual([])

  /**
   * ⚠️ ET L'ORANGE QUI REMPLIT RESTE. Une sonde qui aurait chassé toute
   * trace d'orange aurait aussi éteint la carte « Appeler » — et on l'aurait
   * découvert en la regardant, pas en la mesurant.
   *
   * 🔴 ON ROUVRE PAR LA RANGÉE, PAS PAR LA PASTILLE. Elle retouchait
   * « Ce qui manque » une seconde fois ; depuis les onglets du 18 novembre
   * 2026, le premier appui bascule sur Infos et la pastille — qui vit sur
   * l'onglet Fiche — n'est plus dans la page. La rangée, elle, est là.
   */
  await page.keyboard.press('Escape')
  await toucher(
    page.locator('[data-champ="profession"]'),
    page.locator('[data-saisie="profession"]'),
  )
  const bouton = await page
    .getByRole('button', { name: 'Enregistrer' })
    .evaluate((e) => getComputedStyle(e).backgroundColor)
  console.log(`  « Enregistrer » est toujours rempli d'orange : ${bouton}`)
  expect(EST_ORANGE(bouton), 'l’orange qui REMPLIT a disparu avec celui qui entoure').toBe(true)

  expect(pageErrors, `exception client : ${pageErrors.join(' · ')}`).toEqual([])
})
