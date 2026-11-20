// LE TITRE BLANC TIENT-IL SUR LA PHOTOGRAPHIE ?
//
//   E2E_BASE=https://v2.atline.ai npx playwright test tests/contraste-couvertures.spec.cjs
//
// ── 🔴 POURQUOI CE FICHIER REMPLACE `decor-module-contraste` ───────────────
//
// L'ancienne sonde mesurait le DÉCOR plein écran d'un module, un fond CSS à
// 18 % d'opacité, supprimé le 19 novembre 2026. Elle échouait donc tous les
// jours sur un écran parfaitement correct. Son en-tête nommait pourtant le
// risque équivalent, et il avait raison : **un titre composé en blanc sur une
// couverture teintée**.
//
// 🔴 ET CE RISQUE EST DEVENU RÉEL LE 20 NOVEMBRE AU SOIR. Le titre des grandes
// couvertures est passé de 11 à 17 px pour que sa proportion suive l'image :
// il couvre donc **beaucoup plus de photographie** qu'avant, et une zone
// claire qu'il ne touchait pas peut maintenant passer dessous.
//
// ── 🧭 AUCUNE RÈGLE CSS NE PEUT RÉPONDRE ICI ──────────────────────────────
//
// `contraste-texte.spec.cjs` remonte les ancêtres et compose les fonds, ce qui
// est juste partout… sauf sur une image. Elle ne voit que la couleur de fond
// CSS — transparente — et retombe sur le fond de la page : elle annonçait donc
// **blanc sur blanc, 1,09 de contraste, onze fois**, sur des titres
// parfaitement lisibles posés sur des scènes sombres. Un faux défaut répété
// onze fois est le plus sûr moyen de faire désactiver un garde.
//
// 🔴 ON LIT DONC LES PIXELS. On charge le fichier dans une toile, on échantillonne
// EXACTEMENT le rectangle qu'occupe le titre, et on prend le pixel le PLUS
// CLAIR de cette zone — pas la moyenne. Une image à la moyenne honnête peut
// avoir un éclat de lumière en travers d'un mot, et c'est ce mot-là qu'on ne
// lit plus.
const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

/** Le seuil de l'app pour du texte gras d'au moins 14 px est 3, sinon 4,5. */
const SEUIL = 4.5

/**
 * Mesurer, sur l'écran courant, le contraste de chaque titre de couverture
 * contre les pixels de SON image.
 */
const mesurer = (page, ecran) =>
  page.evaluate(async (ecran) => {
    const lin = (v) => {
      const s = v / 255
      return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
    }
    const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)

    const out = []
    for (const p of document.querySelectorAll('[data-titre-couverture]')) {
      const cadre = p.closest('div, a, li') || p.parentElement
      const img = cadre?.querySelector('img')
      if (!img) continue
      const ri = img.getBoundingClientRect()
      const dedans = p.querySelector('span') || p
      const rt = dedans.getBoundingClientRect()
      if (ri.width < 40 || rt.width < 10) continue

      // Redessiner l'image à sa taille affichée : `object-cover` recadre, et
      // échantillonner le fichier à sa taille native viserait à côté.
      const toile = document.createElement('canvas')
      toile.width = Math.round(ri.width)
      toile.height = Math.round(ri.height)
      const ctx = toile.getContext('2d')
      /**
       * 🔴 `complete` SEUL, ET UNE CEINTURE. Première version :
       * `if (img.complete && img.naturalWidth) return r()`. Une image CHARGÉE
       * mais de largeur **zéro** — c'est-à-dire un 404, exactement le défaut
       * que cette sonde existe pour voir — ne passait pas ce test, et attendait
       * alors un `onload` qui ne viendrait jamais puisqu'il avait déjà eu lieu.
       * **La sonde expirait au bout de soixante secondes au lieu d'annoncer
       * l'image manquante.** Trouvé en lui faisant servir une image blanche.
       */
      await new Promise((r) => {
        if (img.complete) return r()
        img.onload = r
        img.onerror = r
        setTimeout(r, 3_000)
      })
      if (!img.naturalWidth) {
        out.push({ ecran, src: img.getAttribute('src'), erreur: 'image absente' })
        continue
      }
      // `object-cover` : on couvre, donc on garde le plus grand facteur.
      const f = Math.max(toile.width / img.naturalWidth, toile.height / img.naturalHeight)
      const l = img.naturalWidth * f
      const h = img.naturalHeight * f
      ctx.drawImage(img, (toile.width - l) / 2, (toile.height - h) / 2, l, h)

      const zone = ctx.getImageData(
        Math.max(0, Math.round(rt.left - ri.left)),
        Math.max(0, Math.round(rt.top - ri.top)),
        Math.max(1, Math.min(toile.width, Math.round(rt.width))),
        Math.max(1, Math.min(toile.height, Math.round(rt.height))),
      ).data

      let pire = 0
      for (let i = 0; i < zone.length; i += 4) pire = Math.max(pire, lum(zone[i], zone[i + 1], zone[i + 2]))

      const encre = getComputedStyle(p)
        .color.match(/[\d.]+/g)
        .slice(0, 3)
        .map(Number)
      const lt = lum(encre[0], encre[1], encre[2])
      out.push({
        ecran,
        src: (img.getAttribute('src') || '').replace(/^.*\/modules\//, ''),
        couverture: Math.round(ri.width),
        px: Math.round(parseFloat(getComputedStyle(p).fontSize)),
        encre: `rgb(${encre.join(',')})`,
        contraste: Number(((Math.max(lt, pire) + 0.05) / (Math.min(lt, pire) + 0.05)).toFixed(2)),
      })
    }
    return out
  }, ecran)

test('le titre blanc tient sur chacune des onze couvertures', async ({ page, pageErrors }) => {
  const tout = []

  // ── 1. L'étagère : onze couvertures d'un coup, en 144 px
  await page.goto('/parcours', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('a[data-module]').first()).toBeVisible({ timeout: 20_000 })
  // ⚠️ La rangée défile : les couvertures hors écran ne sont pas chargées
  // (`loading="lazy"`), et mesurer une image vide donnerait un faux vert.
  await page.evaluate(async () => {
    const r = document.querySelector('[data-etagere]')
    if (!r) return
    for (let x = 0; x < r.scrollWidth; x += 200) {
      r.scrollLeft = x
      await new Promise((ok) => setTimeout(ok, 120))
    }
    r.scrollLeft = 0
    await new Promise((ok) => setTimeout(ok, 300))
  })
  tout.push(...(await mesurer(page, 'étagère')))

  // ── 2. La couverture d'un module, en 210 px et 17 px de titre
  const href = await page.locator('a[data-module="2"]').getAttribute('href')
  await page.goto(href, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('ol li a[data-lecon]').first()).toBeVisible({ timeout: 20_000 })
  tout.push(...(await mesurer(page, 'module')))

  // ── 3. L'écoute, même taille
  const lecon = await page.locator('ol li a[data-lecon]').nth(1).getAttribute('href')
  await page.goto(lecon + '/ecouter', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-titre-ecoute]')).toBeVisible({ timeout: 20_000 })
  tout.push(...(await mesurer(page, 'écoute')))

  for (const m of tout.sort((a, b) => a.contraste - b.contraste))
    console.log(
      `  ${m.contraste >= SEUIL ? '✓' : '✗'} ${m.ecran} ${m.src} — ${m.contraste} (${m.px} px sur ${m.couverture})`,
    )

  const griefs = []
  /**
   * 🔴 SANS LES ONZE, CETTE SONDE N'ÉPROUVE RIEN. Les couvertures ne se valent
   * pas — c'est la phrase que l'ancienne sonde avait laissée : *« le sablier
   * est bien plus clair que le phare »*. Mesurer celles qui passent et rater
   * celle qui ne passe pas, c'est précisément ce qu'on veut éviter.
   */
  const surLEtagere = tout.filter((m) => m.ecran === 'étagère')
  if (surLEtagere.length !== 11)
    griefs.push(`${surLEtagere.length} couverture(s) mesurée(s) sur l’étagère au lieu de 11`)
  if (!tout.some((m) => m.ecran === 'module')) griefs.push('aucune couverture mesurée sur la page du module')
  if (!tout.some((m) => m.ecran === 'écoute')) griefs.push('aucune couverture mesurée sur l’écoute')

  for (const m of tout) {
    if (m.erreur) griefs.push(`${m.ecran} ${m.src} : ${m.erreur}`)
    else if (m.contraste < SEUIL)
      griefs.push(`${m.ecran} ${m.src} : ${m.contraste} de contraste pour ${SEUIL} exigés`)
  }

  expect(griefs, `ce qui cloche :\n  · ${griefs.join('\n  · ')}`).toEqual([])
  expect(pageErrors, `exception client : ${pageErrors.join(' · ')}`).toHaveLength(0)
})

/**
 * ── 🔴 ET ELLE SAIT ÉCHOUER ────────────────────────────────────────────────
 *
 * Une sonde de contraste qui ne mesure rien rend « aucun défaut » exactement
 * comme une sonde qui mesure tout. Celle-ci se prouve avant de compter : on
 * blanchit une couverture, et le contraste du blanc sur blanc DOIT tomber.
 *
 * 🧭 C'est la leçon de la version précédente de ce fichier, qui avait son
 * propre test de ce genre — la seule chose qui méritait d'être gardée d'elle.
 */
test('la sonde sait échouer : sur une couverture blanchie, le blanc tombe', async ({ page }) => {
  await page.goto('/parcours', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('a[data-module]').first()).toBeVisible({ timeout: 20_000 })

  await page.evaluate(() => {
    // Un pixel blanc, servi à la place de la première couverture.
    // ⚠️ UN PNG, PAS UN SVG. Un SVG en `data:` rend `naturalWidth` à zéro sur
    // certains moteurs : la sonde aurait alors mesuré « image absente » au lieu
    // de « blanc sur blanc », et se serait prouvée sur le mauvais défaut.
    const blanc =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFElEQVR42mP8/5+hnoEIwDiqkL4KAcLiBQW9D8E2AAAAAElFTkSuQmCC'
    const img = document.querySelector('a[data-module] img')
    img.removeAttribute('srcset')
    img.src = blanc
  })
  await page.waitForTimeout(400)

  const m = (await mesurer(page, 'étagère'))[0]
  console.log(JSON.stringify(m))
  expect(m, 'la sonde n’a rien mesuré : elle ne peut donc pas échouer').toBeTruthy()
  expect(m.contraste, 'du blanc sur du blanc doit s’effondrer').toBeLessThan(1.5)
})
