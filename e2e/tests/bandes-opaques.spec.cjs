// LES BANDES DU BAS LAISSENT-ELLES LIRE AU TRAVERS ?
//
//   E2E_BASE=https://v2.atline.ai E2E_COMME=humanstring@gmail.com \
//     npx playwright test tests/bandes-opaques.spec.cjs
//
// ── 🔴 LE DÉFAUT QUI L'A FAIT NAÎTRE (10 novembre 2026) ───────────────────
//
// Patrice, deux fois en deux jours : « je vois des carrés en transparence
// derrière les icônes ». La première fois c'était un REMPLISSAGE oublié sous
// les gestes ; la seconde, la barre d'action, qui était un dégradé opaque sur
// ses 60 % du bas et fondu sur les 34 px du haut. Relevé sur `/gens` à 390 px,
// barre y = 696→780 :
//
//              gouttière (fond de page)   au-dessus d'une carte
//   clair       245,245,246                254,254,254  puis 187,182,181
//   sombre       15, 16, 18                 22, 23, 26  puis  77, 88, 99
//
// Les deux dernières valeurs sont du TEXTE. On lisait « valorise sa
// progression » À L'INTÉRIEUR de la barre.
//
// ── 🧭 CE QU'ELLE SURVEILLE : UN COMPORTEMENT, PAS UN MÉCANISME ───────────
//
// Elle ne regarde ni `background-image`, ni l'alpha, ni le flou. Elle FAIT
// DÉFILER la page et vérifie que les pixels de la bande **ne bougent pas**.
// Une bande opaque ne peut pas changer quand ce qu'il y a dessous change ;
// n'importe quel voile, par n'importe quel moyen, change.
//
// 🔴 C'est la leçon de la sonde qui cliquait « Écrire plutôt » : elle
// surveillait un bouton, le bouton a disparu, et elle est morte avec lui.
// Ici, le jour où le dégradé revient sous une autre forme, elle le voit.
//
// ⚠️ ET ELLE PORTE SON PROPRE CONTRÔLE POSITIF. Si le défilement n'a pas eu
// lieu — liste trop courte, geste avalé, page pas prête — la bande ne
// changerait pas non plus, et la sonde passerait au vert en n'ayant rien
// vérifié. Elle exige donc qu'un point du CONTENU, lui, ait changé.

const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 } })

/** Ce qui est censé être du mobilier, et jamais un calque. */
const BANDES = ['[data-barre-action]', '[data-gestes]', '[aria-label="Navigation principale"]']

/**
 * ── ⚠️ LE SEUIL EST MESURÉ, PAS CHOISI ────────────────────────────────────
 *
 * Écrite à 2, cette sonde a fait tomber la barre du bas ET la rangée de
 * gestes, et **elle avait tort** : toutes deux sont `--color-surface` à 94 %
 * avec un flou, un verre dépoli volontaire. Relevé au défilement, sur les
 * deux thèmes : leur écart maximal est de **4 niveaux sur 255**, soit 1,5 %.
 * Rien ne s'y lit, aucun bord ne s'y dessine — et personne ne s'en est jamais
 * plaint en six mois.
 *
 * Le vrai défaut, lui, mesurait **58 niveaux** : du texte noir sur une carte
 * blanche, en clair dans la barre. Les deux familles ne se touchent pas.
 *
 * 🧭 12 sépare les deux en laissant trois fois la marge du verre dépoli. Ce
 * n'est donc pas « assez opaque » qu'on surveille — c'est **« on ne peut pas
 * y lire »**. Confondre les deux aurait fait retirer un effet voulu pour
 * corriger un défaut qui n'était pas là.
 */
const SEUIL = 12

/**
 * Les pixels d'une capture, lus SUR UN CANVAS DANS LA PAGE.
 *
 * ⚠️ Aucun décodeur PNG n'est installé ici, et il n'en faut pas : le
 * navigateur en a un. C'est le même détour que pour le décor de l'accueil,
 * où lire `getComputedStyle` avait annoncé 1,1 contre 19,2 pour LA MÊME
 * couleur, Chrome rendant `color-mix()` en `color(srgb …)`.
 */
const lire = async (page, points) => {
  const b64 = (await page.screenshot()).toString('base64')
  return page.evaluate(
    async ({ b64, points }) => {
      const img = new Image()
      img.src = `data:image/png;base64,${b64}`
      await img.decode()
      const c = document.createElement('canvas')
      c.width = img.width
      c.height = img.height
      const ctx = c.getContext('2d')
      ctx.drawImage(img, 0, 0)
      return points.map(([x, y]) => [...ctx.getImageData(x, y, 1, 1).data].slice(0, 3))
    },
    { b64, points },
  )
}

const figer = (page) =>
  page.evaluate(() => {
    document.getAnimations().forEach((a) => {
      try {
        a.finish()
      } catch {}
    })
  })

/** Une grille de points dans chaque bande présente, plus un témoin de contenu. */
const quadriller = (page) =>
  page.evaluate((sels) => {
    const points = []
    const bandes = []
    for (const sel of sels) {
      const e = document.querySelector(sel)
      if (!e) continue
      const r = e.getBoundingClientRect()
      if (r.height < 8) continue
      const debut = points.length
      // On évite 1 px de bord : un trait d'un demi-pixel se rend différemment
      // selon la position de défilement, et ce n'est pas de la transparence.
      for (let y = Math.ceil(r.top) + 2; y < Math.floor(r.bottom) - 2; y += 6)
        for (let x = 6; x < 384; x += 12) points.push([x, y])
      bandes.push({ sel, debut, fin: points.length })
    }
    return { points, bandes }
  }, BANDES)

const ecrans = [
  { nom: 'contacts', aller: async (page) => page.goto('/gens', { waitUntil: 'domcontentloaded' }) },
  {
    nom: 'fiche',
    aller: async (page) => {
      await page.goto('/gens', { waitUntil: 'domcontentloaded' })
      await page.locator('main ul li a').first().click()
      await page.locator('[data-gestes]').waitFor({ timeout: 20_000 })
    },
  },
]

/**
 * LA MESURE, EN UN SEUL ENDROIT : ce que chaque bande laisse passer, en
 * niveaux, quand la page défile dessous.
 *
 * 🧭 Extraite parce que le contrôle positif de la sonde (plus bas) doit
 * mesurer EXACTEMENT la même chose que la sonde elle-même. Deux copies, et il
 * prouverait la bonne santé d'un code qui n'est pas celui qui tourne.
 */
const mesurer = async (page, theme) => {
  await page.emulateMedia({ colorScheme: theme })
  await page.evaluate((t) => {
    document.documentElement.dataset.theme = t
  }, theme)
  await page.locator('main').first().waitFor({ timeout: 20_000 })
  await page.waitForTimeout(500)
  await figer(page)

  const { points, bandes } = await quadriller(page)

  /**
   * LES TÉMOINS : du contenu, bien au-dessus de toute bande.
   *
   * ⚠️ PLUSIEURS, ET ON EXIGE QU'UN SEUL BOUGE. Un témoin unique peut tomber
   * au milieu d'une carte blanche et retomber sur du blanc après le
   * défilement : il annoncerait « rien n'a bougé » alors que la page a bien
   * défilé, et ferait échouer la sonde pour une raison fausse.
   */
  const temoins = [
    [60, 160],
    [195, 240],
    [60, 320],
    [195, 400],
    [60, 480],
  ]
  const tous = [...points, ...temoins]

  const avant = await lire(page, tous)
  await page.mouse.wheel(0, 150)
  await page.waitForTimeout(600)
  await figer(page)
  const apres = await lire(page, tous)

  const ecart = (i) => Math.max(...[0, 1, 2].map((c) => Math.abs(avant[i][c] - apres[i][c])))
  const bouge = Math.max(...temoins.map((_, k) => ecart(points.length + k)))

  const releve = bandes.map((b) => {
    const fautes = []
    let pire = 0
    for (let i = b.debut; i < b.fin; i++) {
      const d = ecart(i)
      if (d > pire) pire = d
      if (d > SEUIL) fautes.push(`${tous[i].join(',')} ${avant[i]} → ${apres[i]} (${d})`)
    }
    return { sel: b.sel, pire, fautes }
  })

  return { bouge, releve }
}

for (const ecran of ecrans) {
  for (const theme of ['light', 'dark']) {
    test(`bandes-opaques-${ecran.nom}-${theme}`, async ({ page }) => {
      await ecran.aller(page)
      const { bouge, releve } = await mesurer(page, theme)

      expect(releve.length, `aucune bande trouvée sur ${ecran.nom}`).toBeGreaterThan(0)
      // ⚠️ LE CONTRÔLE POSITIF D'ABORD. Sans défilement réel, tout ce qui suit
      // serait vrai sans rien prouver.
      expect(bouge, 'le contenu n’a pas défilé : la sonde ne prouverait rien').toBeGreaterThan(4)

      for (const b of releve) {
        expect(
          b.fautes,
          `${b.sel} laisse LIRE ce qui défile dessous — écart max ${b.pire} sur ${SEUIL} permis, ${b.fautes.length} points :\n${b.fautes.slice(0, 6).join('\n')}`,
        ).toEqual([])
      }
    })
  }
}

/**
 * ── 🔴 LA SONDE SAIT-ELLE ÉCHOUER ? ───────────────────────────────────────
 *
 * On remet le dégradé d'avant, à la main, sur la vraie page, et on exige que
 * la mesure le voie. Sans ce test, « quatre au vert » ne voudrait rien dire :
 * c'est exactement le piège de `fond.spec.cjs`, où un contrôle d'absence
 * n'avait jamais rien trouvé et validait un décor qu'on ne voyait pas.
 */
test('la-sonde-sait-echouer', async ({ page }) => {
  await page.goto('/gens', { waitUntil: 'domcontentloaded' })
  await page.addStyleTag({
    content: `[data-barre-action]{background:linear-gradient(to top,var(--color-fond) 60%,transparent) !important}`,
  })
  const { bouge, releve } = await mesurer(page, 'light')
  expect(bouge).toBeGreaterThan(4)

  const barre = releve.find((b) => b.sel === '[data-barre-action]')
  expect(barre, 'la barre d’action n’était pas là pour être abîmée').toBeTruthy()
  expect(
    barre.pire,
    `le dégradé d’avant est de retour et la sonde ne le voit pas : écart max ${barre?.pire}`,
  ).toBeGreaterThan(SEUIL)
})
