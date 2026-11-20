// JUGER UNE OU PLUSIEURS COUVERTURES CANDIDATES SUR LA VRAIE ÉTAGÈRE.
//     E2E_BASE=https://v2.atline.ai COUVERTURE=<chemin.png> \
//       npx playwright test tests/essai-couverture.spec.cjs
//
// ── 🔴 ET SURTOUT, PLUSIEURS À LA FOIS ────────────────────────────────────
//
//     COUVERTURES="1=m01.png,2=m02.png" npx playwright test …
//
// Une couverture seule ne se juge pas : **une collection tient par ce qui ne
// change pas**, et ça ne se voit qu'en mettant deux voisines côte à côte. Une
// scène ambrée est toujours flatteuse ; la même grammaire en teal peut tourner
// au froid clinique. C'est la PAIRE qui dit si la série tient, et les onze
// ensemble qui disent si c'est une étagère.
//
// Chaque candidate est mesurée séparément : une seule qui tombe sous 4,5 fait
// échouer le lot, en nommant laquelle.
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

/** « 1=a.png,2=b.png » — ou, forme courte d'une seule candidate, le module 1. */
function lesCandidates() {
  if (process.env.COUVERTURES) {
    return process.env.COUVERTURES.split(',').map((paire) => {
      const [module, ...reste] = paire.split('=')
      return { module: Number(module.trim()), fichier: reste.join('=').trim() }
    })
  }
  return process.env.COUVERTURE ? [{ module: 1, fichier: process.env.COUVERTURE }] : []
}

test('les couvertures candidates, à leur taille réelle, entre les autres', async ({ page }) => {
  const candidates = lesCandidates()
  /**
   * ── 🔴 CE FICHIER EST UN OUTIL, PAS UNE SONDE ─────────────────────────────
   *
   * Il sert à JUGER une couverture candidate avant de l'adopter : on lui passe
   * un fichier, il la pose sur la vraie étagère et la mesure entre les autres.
   * Sans ce fichier, il n'y a rien à juger.
   *
   * 🔴 IL ÉCHOUAIT DONC À CHAQUE PASSAGE DE LA SUITE, en annonçant « passer
   * COUVERTURE=<image> ». Un rouge permanent qui ne signale aucun défaut, et
   * la suite en comptait **trente** : à ce régime, on cesse de lire la liste,
   * et le jour où un vrai défaut s'y glisse, personne ne le voit.
   *
   * 🧭 UN OUTIL SE SAUTE À VOIX HAUTE, IL N'ÉCHOUE PAS. `test.skip` dit sa
   * raison dans le rapport : il reste visible, mais il ne prétend plus avoir
   * trouvé quelque chose.
   */
  test.skip(
    candidates.length === 0,
    'outil de jugement, pas sonde : passer COUVERTURE=<image> ou COUVERTURES="1=a.png,2=b.png"',
  )
  for (const c of candidates) {
    c.donnee = `data:image/png;base64,${fs.readFileSync(c.fichier).toString('base64')}`
  }

  await page.goto('/parcours', { waitUntil: 'domcontentloaded' })
  await page.locator('[data-module="1"]').waitFor({ state: 'visible', timeout: 20_000 })

  /**
   * ⚠️ ON NE REMPLACE QUE L'IMAGE. Le cadre, la bordure, l'arrondi, la teinte
   * et le titre restent ceux de l'app : si on redessinait la cellule, on
   * jugerait une maquette, et c'est exactement ce que cette sonde existe pour
   * éviter.
   */
  for (const { module, donnee } of candidates) {
    await page.evaluate(
      ({ module, src }) => {
        const carte = document.querySelector(`[data-module="${module}"] > div`)
        if (!carte) throw new Error(`la cellule du module ${module} est introuvable`)
        // Les deux couches d'image actuelles — le reflet flouté et l'objet —
        // cèdent la place ; le titre reste par-dessus.
        for (const n of carte.querySelectorAll('div')) n.style.display = 'none'
        carte.style.backgroundImage = `url(${src})`
        carte.style.backgroundSize = 'cover'
        carte.style.backgroundPosition = 'center'
      },
      { module, src: donnee },
    )

    // On laisse le navigateur décoder l'image avant de tirer : une capture
    // prise avant montrerait un cadre vide, ce qui ressemble à un défaut.
    await page.evaluate(
      (src) => new Promise((ok) => Object.assign(new Image(), { onload: ok, onerror: ok, src })),
      donnee,
    )
  }

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
  const mesurer = (module, src) => page.evaluate(({ module, src }) => {
    const carte = document.querySelector(`[data-module="${module}"] > div`)
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
  }, { module, src })

  // ⚠️ ON CAPTURE AVANT DE MESURER. Une assertion qui tombe emporte la fin du
  // test avec elle — et c'est précisément quand une candidate échoue qu'on
  // veut la voir, pour comprendre POURQUOI elle échoue.
  await page.screenshot({ path: 'essai-etagere.png' })
  await page.locator('[data-module="1"]').scrollIntoViewIfNeeded()
  const rangee = page.locator('[data-module="1"]').locator('xpath=ancestor::ul')
  await rangee.screenshot({ path: 'essai-rangee.png' })

  /**
   * ⚠️ ET LA PLANCHE — UN OUTIL DE JUGEMENT, PAS LA VRAIE ÉTAGÈRE.
   *
   * La rangée défile : à l'écran on n'en voit jamais que deux cellules et
   * demie, ce qui est la vérité de l'usage et une infirmité pour juger une
   * COLLECTION. On replie donc la même rangée sur plusieurs lignes, sans rien
   * changer d'autre — même cellule, même surface, mêmes 146 px, même titre.
   * Ce que cette image ne prouve PAS : ce qu'on voit en arrivant sur l'écran.
   */
  await rangee.evaluate((ul) => {
    ul.style.flexWrap = 'wrap'
    ul.style.overflowX = 'visible'
    ul.style.rowGap = '16px'
    // ⚠️ Et on écarte le chrome collant. Repliée, la rangée passe DERRIÈRE
    // l'en-tête et la barre du bas : deux couvertures sur onze se retrouvaient
    // amputées de leur titre, ce qui est exactement ce qu'on vient mesurer.
    for (const n of document.querySelectorAll('body *')) {
      const p = getComputedStyle(n).position
      if ((p === 'fixed' || p === 'sticky') && !n.contains(ul)) n.style.visibility = 'hidden'
    }
  })
  await rangee.screenshot({ path: 'essai-planche.png' })

  /**
   * 🔴 ON MESURE LES ONZE AVANT D'EN REFUSER UNE. Une assertion dans la boucle
   * arrête tout à la première qui tombe : on relance, la suivante tombe, on
   * relance — onze allers-retours pour un verdict qu'un seul passage donnait.
   * Le lot entier est mesuré, imprimé, puis jugé.
   */
  const recalees = []
  for (const { module, donnee, fichier } of candidates) {
    const mesure = await mesurer(module, donnee)
    const verdict = mesure.contraste >= 4.5 ? '✓' : '✗'
    console.log(`  ${verdict} module ${module} — contraste ${mesure.contraste} · ${fichier}`)
    if (mesure.contraste < 4.5) recalees.push(`module ${module} : ${mesure.contraste}`)
  }

  expect(
    recalees,
    `le titre ne tient pas sur ${recalees.length} couverture(s) — ${recalees.join(' · ')} — pour 4,5 exigés`,
  ).toEqual([])
})
