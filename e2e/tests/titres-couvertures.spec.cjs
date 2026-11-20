// LE TITRE ÉCRIT SUR LES COUVERTURES — le même objet sur les trois surfaces.
//
//   E2E_BASE=https://v2.atline.ai npx playwright test tests/titres-couvertures.spec.cjs
//
// ── 🔴 CE QU'ELLE TIENT, ET QUI SE DÉCALE SANS UN MOT ──────────────────────
//
// Patrice, le 20 novembre 2026 : *« sur l'accueil, module 2 est sur 3 lignes,
// après on le retrouve sur 2 lignes »*. Les trois copies du calque écrivaient
// la MÊME taille (11 px) sur des images de largeurs DIFFÉRENTES — 144 px sur
// l'étagère, 210 ailleurs. Rien n'était cassé, aucune erreur nulle part : la
// même couverture avait simplement l'air de deux objets.
//
// 🧭 LA RÈGLE EST UNE PROPORTION, PAS UNE TAILLE. 120 px utiles sur la carte
// contre 186 sur le livre, soit 1,55 ; 11 × 1,55 = 17,05, et 17 est un cran de
// l'échelle. Une sonde qui vérifierait « 11 ici et 17 là » ne ferait que
// relire le code ; celle-ci mesure **le nombre de lignes et la part de l'image
// occupée par le texte**, c'est-à-dire ce que l'œil compare.
//
// ⚠️ ELLE NE COUVRE PAS LA PASTILLE DU LECTEUR, et c'est voulu : sa pochette
// fait 42 px, elle ne porte aucun titre, et celui-ci est écrit juste à côté.
const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

/** Le calque d'une couverture : sa taille, ses lignes, et sa part de l'image. */
const releve = (page, nom) =>
  page.evaluate((nom) => {
    const out = []
    for (const img of document.querySelectorAll('img')) {
      if (!/\/modules\/m\d/.test(img.getAttribute('src') || '')) continue
      const b = img.getBoundingClientRect()
      // ⚠️ La pochette de la pastille est une couverture elle aussi : on
      // l'écarte par sa TAILLE et pas par son écran, sinon la sonde la
      // compterait le jour où le lecteur joue pendant qu'elle mesure.
      if (b.width < 100) continue
      const cadre = img.closest('div, a, li') || img.parentElement
      const p = [...cadre.querySelectorAll('p')].find((e) => {
        const r = e.getBoundingClientRect()
        return r.width > 0 && r.top < b.top + b.height / 2 && r.left >= b.left - 2 && r.right <= b.right + 2
      })
      if (!p) {
        out.push({ ecran: nom, couverture: Math.round(b.width), texte: null })
        continue
      }
      const s = getComputedStyle(p)
      const dedans = p.querySelector('span')
      const h = dedans.getBoundingClientRect().height
      out.push({
        ecran: nom,
        couverture: Math.round(b.width),
        texte: p.textContent.trim().slice(0, 30),
        px: Math.round(parseFloat(s.fontSize)),
        utile: Math.round(p.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight)),
        lignes: Math.round(h / parseFloat(getComputedStyle(dedans).lineHeight)),
        part: +(h / b.height).toFixed(3),
      })
    }
    return out
  }, nom)

test('le même titre se replie pareil sur les trois couvertures', async ({ page, pageErrors }) => {
  // ── 1. L'étagère
  await page.goto('/parcours', { waitUntil: 'domcontentloaded' })
  await page.locator('a[data-module="2"]').waitFor({ state: 'visible', timeout: 20_000 })
  const etagere = (await releve(page, 'étagère')).find((x) => /Clarifier/.test(x.texte || ''))

  // ── 2. La couverture du module
  const href = await page.locator('a[data-module="2"]').getAttribute('href')
  await page.goto(href, { waitUntil: 'domcontentloaded' })
  await page.locator('[data-lecon]').first().waitFor({ state: 'visible', timeout: 20_000 })
  const module = (await releve(page, 'module'))[0]

  /**
   * 🔴 LE TITRE N'EST PLUS ÉCRIT SOUS L'IMAGE. Patrice : *« enlève le titre
   * sous le livre »*. Sans ce contrôle, le jour où il revient, on a la même
   * phrase deux fois à quarante pixels d'écart — exactement ce que le
   * déplacement servait à éviter.
   */
  const visibles = await page.evaluate(() =>
    [...document.querySelectorAll('h1, h2:not(.sr-only), h3')].map((e) => e.textContent.trim()),
  )

  /**
   * 🔴 ET SURTOUT : IL RESTE ANNONCÉ. Le calque est `aria-hidden` puisqu'il
   * double une image. En retirant le titre du dessous, **le nom du module
   * n'était plus lu nulle part** — une synthèse vocale entendait « Module 2 »,
   * « 52 min · 6 leçons », puis « Description ». Un `h2` en `sr-only` le rend,
   * et répare du même coup l'échelle des titres, qui sautait de `h1` à `h3`.
   *
   * 🧭 C'est un défaut que la correction a CRÉÉ, trouvé en mesurant ce qu'une
   * synthèse lirait. Aucune capture d'écran ne l'aurait montré.
   */
  const annonce = await page.evaluate(() => {
    const lu = []
    const marche = (n) => {
      if (n.nodeType === 1) {
        if (n.getAttribute('aria-hidden') === 'true' || n.hidden) return
        if (n.tagName === 'SCRIPT' || n.tagName === 'STYLE') return
      }
      if (n.nodeType === 3 && n.textContent.trim()) lu.push(n.textContent.trim())
      n.childNodes?.forEach(marche)
    }
    marche(document.body)
    return lu
  })

  // ── 3. L'écoute
  const lecon = await page.locator('[data-lecon]').nth(1).getAttribute('href')
  await page.goto(lecon + '/ecouter', { waitUntil: 'domcontentloaded' })
  await page.locator('[data-titre-ecoute]').waitFor({ state: 'visible', timeout: 20_000 })
  const ecoute = (await releve(page, 'écoute'))[0]

  console.log(JSON.stringify({ etagere, module, ecoute, visibles }, null, 1))

  const griefs = []
  // 🔴 SANS LES TROIS RELEVÉS, CETTE SONDE N'ÉPROUVE RIEN.
  for (const [nom, x] of [
    ['étagère', etagere],
    ['module', module],
    ['écoute', ecoute],
  ]) {
    if (!x) griefs.push('aucune couverture relevée sur « ' + nom + ' »')
    else if (!x.px) griefs.push('« ' + nom + ' » : la couverture ne porte aucun titre')
  }

  if (griefs.length === 0) {
    const trois = [etagere, module, ecoute]
    // ⚠️ LE NOMBRE DE LIGNES EST CE QUE L'ŒIL COMPARE, et c'est lui que la
    // demande nommait : « sur 3 lignes, puis sur 2 ».
    if (new Set(trois.map((x) => x.lignes)).size !== 1)
      griefs.push(
        'le titre se replie différemment : ' +
          trois.map((x) => x.ecran + ' ' + x.lignes + ' ligne(s)').join(', '),
      )
    // ⚠️ ET LA PART DE L'IMAGE OCCUPÉE, qui dit le poids visuel. Trois points
    // de tolérance : au-delà, la même couverture a l'air de deux objets.
    const parts = trois.map((x) => x.part)
    if (Math.max.apply(null, parts) - Math.min.apply(null, parts) > 0.03)
      griefs.push(
        'poids du texte trop inégal : ' +
          trois.map((x) => x.ecran + ' ' + (x.part * 100).toFixed(1) + ' %').join(', '),
      )
    // 🧭 La proportion se démontre : taille / largeur utile, à 10 % près.
    const rapports = trois.map((x) => x.px / x.utile)
    if (Math.max.apply(null, rapports) / Math.min.apply(null, rapports) > 1.1)
      griefs.push(
        'la taille ne suit pas la largeur : ' +
          trois.map((x) => x.ecran + ' ' + x.px + '/' + x.utile).join(', '),
      )
  }

  const titre = module && module.texte ? module.texte.slice(0, 20) : null
  if (titre && visibles.some((t) => t.includes(titre)))
    griefs.push('le titre est revenu SOUS l’image : « ' + visibles.join(' · ') + ' »')
  if (titre && !annonce.some((t) => t.includes(titre)))
    griefs.push('le titre du module n’est annoncé nulle part : une synthèse vocale ne le dira pas')

  expect(griefs, 'ce qui cloche :\n  · ' + griefs.join('\n  · ')).toEqual([])
  expect(pageErrors, 'exception client : ' + pageErrors.join(' · ')).toEqual([])
})
