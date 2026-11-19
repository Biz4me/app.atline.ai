// JUGER UNE COUVERTURE CANDIDATE SUR LA VRAIE ÉTAGÈRE.
//     E2E_BASE=https://v2.atline.ai COUVERTURE=<chemin.png> \
//       npx playwright test tests/essai-couverture.spec.cjs
//
// ── 🔴 POURQUOI ON NE JUGE PAS SUR UNE PLANCHE ────────────────────────────
//
// Cette maison a déjà payé la leçon : **une vignette jugée sur son fond
// d'origine ment**. Trois registres générés sur `#101114` semblaient tenir à
// 40 px ; c'était le fond noir qui donnait du contraste à la lueur, pas
// l'objet. Posés sur la vraie surface, ils devenaient des taches brunes.
//
// 🧭 Juger à la bonne TAILLE ne suffit donc pas, il faut juger sur la vraie
// SURFACE. On ouvre l'étagère en ligne et on remplace UNE couverture par la
// candidate : tout le reste — la teinte, le titre, le fond de l'app, la
// taille réelle de 146 px — est celui des utilisateurs.
const fs = require('node:fs')
const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

test('la couverture candidate, à sa taille réelle, entre les autres', async ({ page }) => {
  const fichier = process.env.COUVERTURE
  expect(fichier, 'passer COUVERTURE=<chemin de l’image>').toBeTruthy()
  const donnee = `data:image/png;base64,${fs.readFileSync(fichier).toString('base64')}`

  await page.goto('/parcours', { waitUntil: 'domcontentloaded' })
  await page.locator('[data-module="1"]').waitFor({ state: 'visible', timeout: 20_000 })

  /**
   * ⚠️ ON NE REMPLACE QUE L'IMAGE. Le cadre, la bordure, l'arrondi, la teinte
   * et le titre restent ceux de l'app : si on redessinait la cellule, on
   * jugerait une maquette, et c'est exactement ce que cette sonde existe pour
   * éviter.
   */
  await page.evaluate((src) => {
    const carte = document.querySelector('[data-module="1"] > div')
    if (!carte) throw new Error('la cellule du module 1 est introuvable')
    // Les deux couches d'image actuelles — le reflet flouté et l'objet —
    // cèdent la place ; le titre reste par-dessus.
    for (const n of carte.querySelectorAll('div')) n.style.display = 'none'
    carte.style.backgroundImage = `url(${src})`
    carte.style.backgroundSize = 'cover'
    carte.style.backgroundPosition = 'center'
  }, donnee)

  // On laisse le navigateur décoder l'image avant de tirer : une capture
  // prise avant montrerait un cadre vide, ce qui ressemble à un défaut.
  await page.evaluate(
    (src) => new Promise((ok) => Object.assign(new Image(), { onload: ok, onerror: ok, src })),
    donnee,
  )

  /**
   * ── 🔴 LE TITRE DOIT TENIR SUR L'IMAGE, ET ÇA SE MESURE ─────────────────
   *
   * C'est le défaut qui condamnait les couvertures Flux : magnifiques, et
   * chargées de clair précisément là où le titre se pose. Une couverture n'est
   * pas jugée sur sa beauté mais sur ce qu'on peut écrire dessus.
   *
   * 🧭 ON MESURE SOUS LE TITRE, PAS AU CENTRE DE L'IMAGE. Le haut peut être
   * calme et pourtant trop clair : « calme » parle du nombre d'éléments,
   * « clair » parle de la valeur, et seule la seconde décide de la lisibilité.
   */
  const mesure = await page.evaluate((src) => {
    const carte = document.querySelector('[data-module="1"] > div')
    const titre = carte.querySelector('p')
    const c = carte.getBoundingClientRect()
    const t = titre.getBoundingClientRect()

    return new Promise((ok) => {
      const img = new Image()
      img.onload = () => {
        // On refait le calcul de `background-size: cover`, sinon on
        // échantillonnerait une zone de l'image qui n'est pas celle qu'on voit.
        const k = Math.max(c.width / img.width, c.height / img.height)
        const dessine = { w: img.width * k, h: img.height * k }
        const decalage = { x: (c.width - dessine.w) / 2, y: (c.height - dessine.h) / 2 }

        const toile = document.createElement('canvas')
        toile.width = Math.round(c.width)
        toile.height = Math.round(c.height)
        const ctx = toile.getContext('2d')
        ctx.drawImage(img, decalage.x, decalage.y, dessine.w, dessine.h)

        const zone = ctx.getImageData(
          Math.max(0, Math.round(t.left - c.left)),
          Math.max(0, Math.round(t.top - c.top)),
          Math.max(1, Math.round(t.width)),
          Math.max(1, Math.round(t.height)),
        ).data

        const lin = (v) => {
          const s = v / 255
          return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
        }
        const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)

        // ⚠️ LE PIRE CAS, PAS LA MOYENNE. Un mur sombre avec une bande de
        // lumière en travers a une moyenne honnête et un mot illisible.
        let pire = -1
        for (let i = 0; i < zone.length; i += 4) pire = Math.max(pire, lum(zone[i], zone[i + 1], zone[i + 2]))

        const encre = getComputedStyle(titre).color.match(/\d+/g).map(Number)
        const lt = lum(encre[0], encre[1], encre[2])
        const contraste = (Math.max(lt, pire) + 0.05) / (Math.min(lt, pire) + 0.05)
        ok({ contraste: Number(contraste.toFixed(2)), encre: encre.join(','), fond: pire.toFixed(3) })
      }
      img.src = src
    })
  }, donnee)

  console.log(`  titre sur l'image : contraste ${mesure.contraste} (encre ${mesure.encre})`)
  expect(
    mesure.contraste,
    `le titre ne tient pas sur cette couverture : ${mesure.contraste} pour 4,5 exigés`,
  ).toBeGreaterThanOrEqual(4.5)

  await page.screenshot({ path: 'essai-etagere.png' })
  // Et la même, recadrée sur la seule rangée : c'est là qu'on compare la
  // candidate à ses voisines.
  await page.locator('[data-module="1"]').scrollIntoViewIfNeeded()
  const rangee = page.locator('[data-module="1"]').locator('xpath=ancestor::ul')
  await rangee.screenshot({ path: 'essai-rangee.png' })
})
