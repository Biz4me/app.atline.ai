// LE SON SURVIT-IL AU CHANGEMENT D'ÉCRAN ?
//
//     E2E_BASE=https://v2.atline.ai npx playwright test tests/pastille-ecoute.spec.cjs
//
// Patrice, le 20 novembre 2026 : *« je veux pouvoir écouter en travaillant dans
// Atline »*. Le lecteur vivait DANS la page d'écoute : changer d'écran le
// démontait et le son s'arrêtait net au milieu d'une phrase. Il vit maintenant
// dans la coquille, et une pastille suit la personne.
//
// 🔴 QUATRE FAITS, ET AUCUN NE SE VOIT SUR UNE CAPTURE. Que le son CONTINUE,
// que ce soit LA MÊME piste et non un rechargement qui repart du début, que la
// pastille ne chevauche aucun meuble du bas, et qu'elle ne flotte pas dans le
// vide là où il n'y a pas de meuble.
//
// ⚠️ ET TOUTE NAVIGATION SE FAIT AU CLIC, JAMAIS PAR `goto`. Un chargement de
// document détruit l'élément : le son s'arrêterait pour une raison qui n'est
// pas celle qu'on mesure, et la sonde accuserait l'app d'un défaut qu'elle
// n'a pas.
const { test, expect } = require('../fixtures.cjs')
const { lancer, ouvrirEcoute } = require('../son.cjs')

test.use({ viewport: { width: 390, height: 844 } })

const PASTILLE = '[data-pastille-ecoute]'
const BAS = '[data-barre-bas] a'

/**
 * Quitter la leçon vers la couverture du module.
 *
 * 🔴 CET ÉCRAN EST UNE PLEINE PAGE, DONC SANS BARRE DU BAS. C'est le cas qui a
 * fait rater la première version de cette sonde — elle cherchait la barre des
 * lieux ici et attendait pour toujours. Et c'est aussi le cas intéressant pour
 * la pastille : sans meuble, elle doit se poser au ras du bas et non flotter à
 * 64 px du vide.
 */
async function auModule(page) {
  await page.getByRole('link', { name: /Retour au module/ }).click()
  await page.locator(PASTILLE).waitFor({ state: 'visible', timeout: 15_000 })
}

/** Puis l'étagère, qui porte la barre des cinq lieux. */
async function aLEtagere(page) {
  await page.getByRole('link', { name: 'Retour à Apprendre' }).click()
  await page.locator(PASTILLE).waitFor({ state: 'visible', timeout: 15_000 })
  await page.locator('[data-barre-bas]').waitFor({ state: 'visible', timeout: 15_000 })
}

const etat = (page) =>
  page.evaluate(() => {
    const a = document.querySelector('audio')
    const p = document.querySelector('[data-pastille-ecoute]')
    return {
      src: a.currentSrc,
      t: a.currentTime,
      arrete: a.paused,
      pastille: !!p,
      texte: p?.textContent.trim() ?? null,
    }
  })

test('on quitte la leçon, le son continue, et la pastille prend le relais', async ({ page }) => {
  await ouvrirEcoute(page)
  await lancer(page)

  // 🔴 PAS DE PASTILLE SUR LA PAGE DE LA LEÇON QU'ON ÉCOUTE : le lecteur
  // entier y est, et deux commandes pour un même son sont une hésitation.
  expect(
    await page.locator(PASTILLE).count(),
    'la pastille ne doit pas doubler le lecteur sur sa propre page',
  ).toBe(0)

  const depart = await etat(page)
  await auModule(page)
  const module = await etat(page)
  await aLEtagere(page)

  // Puis un VRAI autre lieu, par la barre du bas : c'est la demande, pas
  // seulement « sortir de la leçon ».
  const liens = page.locator(BAS)
  const nb = await liens.count()
  expect(nb, 'aucun lien dans la barre du bas : la sonde n’éprouverait rien').toBeGreaterThan(1)
  // ⚠️ On évite la case qui ouvre le menu : elle poserait un voile par-dessus
  // la pastille, et on mesurerait sa disparition au lieu de sa survie.
  let vers = null
  for (let i = nb - 1; i >= 0 && !vers; i--) {
    const h = await liens.nth(i).getAttribute('href')
    if (h && !h.includes('menu=')) vers = { i, h }
  }
  expect(vers, 'aucune case de la barre ne mène ailleurs qu’au menu').toBeTruthy()
  await liens.nth(vers.i).click()
  await expect.poll(() => page.url(), { timeout: 15_000 }).toContain(vers.h.split('?')[0])
  await page.locator(PASTILLE).waitFor({ state: 'visible', timeout: 15_000 })

  const ailleurs = await etat(page)
  console.log(JSON.stringify({ vers: vers.h, depart, module, ailleurs }, null, 1))

  const griefs = []
  for (const [nom, e] of [
    ['la couverture du module', module],
    [`l’écran ${vers.h}`, ailleurs],
  ]) {
    if (e.arrete) griefs.push(`le son s’est arrêté en arrivant sur ${nom}`)
    if (!e.pastille) griefs.push(`aucune pastille sur ${nom}`)
    else if (!e.texte?.includes('Leçon'))
      griefs.push(`sur ${nom}, la pastille ne dit pas ce qu’elle joue : « ${e.texte} »`)
    // 🔴 LA MÊME PISTE, ET PAS UN RECHARGEMENT QUI REPART. Sans ce contrôle, un
    // lecteur remonté à neuf sur chaque écran passerait pour un lecteur qui
    // survit : il jouerait, simplement depuis le début.
    if (e.src !== depart.src) griefs.push(`sur ${nom}, la source a changé : l’élément a été rechargé`)
  }
  if (ailleurs.t <= depart.t)
    griefs.push(
      `la tête de lecture n’a pas avancé de bout en bout : ${depart.t.toFixed(1)} puis ${ailleurs.t.toFixed(1)}`,
    )

  expect(griefs, `ce qui cloche :\n  · ${griefs.join('\n  · ')}`).toEqual([])
})

/**
 * ── 🔴 OÙ ELLE SE POSE SE MESURE, ÇA NE S'ÉCRIT PAS ─────────────────────────
 *
 * Le mobilier du bas n'est pas le même d'un écran à l'autre : la barre des cinq
 * lieux, plus parfois le geste du jour au-dessus d'elle, et **sur une pleine
 * page rien du tout**. Une hauteur écrite en dur ferait flotter la pastille à
 * 64 px du vide sur les trois écrans du livre, et la ferait chevaucher le geste
 * du jour ailleurs. L'invariant est « au-dessus de tout ce qui est en bas », et
 * il se vérifie en pixels.
 *
 * ⚠️ LA SONDE DIT CE QU'ELLE A RENCONTRÉ. Première version : elle parcourait
 * une liste vide et passait au vert sans avoir rien éprouvé — un contrôle
 * d'absence qui n'a jamais vu la chose. Les deux comptes du bas sont là pour
 * que ce silence-là ne puisse plus passer pour un succès.
 */
test('la pastille ne chevauche aucun meuble, et ne flotte pas sans meuble', async ({ page }) => {
  await ouvrirEcoute(page)
  await lancer(page)

  const geo = () =>
    page.evaluate(() => {
      const boite = (s) => {
        const e = document.querySelector(s)
        return e ? e.getBoundingClientRect() : null
      }
      const p = boite('[data-pastille-ecoute]')
      const bas = boite('[data-barre-bas]')
      const action = boite('[data-barre-action]')
      return {
        pastilleBas: Math.round(p.bottom),
        ecran: window.innerHeight,
        barreHaut: bas ? Math.round(bas.top) : null,
        actionHaut: action ? Math.round(action.top) : null,
      }
    })

  const vus = []
  await auModule(page)
  vus.push({ ou: 'couverture du module (pleine page)', ...(await geo()) })

  /**
   * ── LA LISEUSE, parce que c'est LÀ que la demande se réalise ──────────────
   *
   * *« je veux pouvoir écouter en travaillant dans Atline »* commence par le
   * cas le plus évident : écouter la leçon en suivant le texte des yeux. Cet
   * écran est une pleine page qui porte sa propre barre d'outils — donc la
   * configuration de meubles la plus serrée de l'app.
   */
  /**
   * ⚠️ `[data-lecon]` ET NON UNE FORME D'ADRESSE. Première version : un motif
   * `/parcours/<x>/<y>`, qui a attrapé `/parcours/<module>/carte` — la carte du
   * module — et l'a étiquetée « liseuse » dans le journal. La sonde passait au
   * vert **en se trompant sur ce qu'elle avait mesuré**, ce qui est pire qu'un
   * échec : elle affirmait avoir éprouvé l'écran du texte sans y être allée.
   * Le repère est posé par `chemin.tsx` sur les rangées de LEÇON, et sur elles
   * seules.
   */
  const rangees = page.locator('[data-lecon]')
  const versLecon = (await rangees.count()) > 0 ? await rangees.first().getAttribute('href') : null
  if (versLecon) {
    await rangees.first().click()
    await expect.poll(() => page.url(), { timeout: 15_000 }).toContain(versLecon)
    await page.locator(PASTILLE).waitFor({ state: 'visible', timeout: 15_000 })
    vus.push({ ou: `liseuse ${versLecon}`, ...(await geo()) })
    /**
     * ⚠️ ON SORT PAR LE VRAI GESTE, PAS PAR `goBack()`. Le retour du navigateur
     * remontait jusqu'à la PAGE D'ÉCOUTE, où la pastille est volontairement
     * absente — la sonde attendait donc un élément qui ne doit pas être là, et
     * accusait l'app d'un défaut qui était le sien. Les liens de leçon portent
     * `replace`, exprès, pour que le geste de retour du téléphone sorte du
     * livre au lieu de refaire huit leçons à l'envers : une sonde qui s'appuie
     * sur l'historique s'appuie donc sur ce que l'app a justement choisi de ne
     * pas empiler.
     */
    await page.getByRole('link', { name: /Retour au module/ }).click()
    await page.locator(PASTILLE).waitFor({ state: 'visible', timeout: 15_000 })
  }

  await aLEtagere(page)
  vus.push({ ou: 'étagère', ...(await geo()) })

  const cases = page.locator(BAS)
  const nb = await cases.count()
  expect(nb, 'aucun lien dans la barre du bas : la sonde n’éprouverait rien').toBeGreaterThan(1)
  for (let i = 0; i < nb; i++) {
    const h = await cases.nth(i).getAttribute('href')
    if (!h || h.includes('menu=')) continue
    await cases.nth(i).click()
    await expect.poll(() => page.url(), { timeout: 15_000 }).toContain(h.split('?')[0])
    await page.locator(PASTILLE).waitFor({ state: 'visible', timeout: 15_000 })
    vus.push({ ou: h, ...(await geo()) })
  }
  console.log(JSON.stringify(vus, null, 1))

  const griefs = []
  for (const v of vus) {
    if (v.barreHaut !== null && v.pastilleBas > v.barreHaut)
      griefs.push(`${v.ou} : la pastille descend à ${v.pastilleBas}, la barre du bas commence à ${v.barreHaut}`)
    if (v.actionHaut !== null && v.pastilleBas > v.actionHaut)
      griefs.push(`${v.ou} : la pastille descend à ${v.pastilleBas}, le geste du jour commence à ${v.actionHaut}`)
    // Sans aucun meuble, elle doit être PRÈS du bas : c'est le défaut nommé
    // dans `ConteneurAction` — un geste qui flotte à 64 px du vide.
    if (v.barreHaut === null && v.actionHaut === null && v.ecran - v.pastilleBas > 44)
      griefs.push(
        `${v.ou} : aucun meuble en bas et la pastille s’arrête ${v.ecran - v.pastilleBas} px au-dessus du bord`,
      )
  }
  const avecGeste = vus.filter((v) => v.actionHaut !== null).length
  const sansMeuble = vus.filter((v) => v.barreHaut === null && v.actionHaut === null).length
  console.log(
    `éprouvé sur ${vus.length} écran(s) · ${avecGeste} avec un geste du jour · ${sansMeuble} sans aucun meuble`,
  )
  /**
   * ⚠️ CE QUE CETTE SONDE N'ÉPROUVE PAS, ET IL FAUT LE DIRE. Le repli « aucun
   * meuble en bas » — la marge gestuelle du téléphone — ne s'est présenté sur
   * AUCUN écran : même les pleines pages du livre portent une barre d'action,
   * posée au ras du bas. Ce chemin du code reste donc défensif et non mesuré.
   *
   * 🧭 Une première version EXIGEAIT ce cas et échouait de ne pas le trouver :
   * c'était demander à l'app d'avoir un écran qu'elle n'a pas. Ce qui protège
   * vraiment du test vide, c'est de compter les écrans VISITÉS et ceux qui
   * portaient un geste du jour — les deux chiffres ci-dessous.
   */
  expect(vus.length, 'trop peu d’écrans visités pour que ce test prouve quoi que ce soit').toBeGreaterThan(3)
  expect(avecGeste, 'aucun écran visité ne portait de geste du jour : le cas serré n’est pas éprouvé').toBeGreaterThan(0)

  expect(griefs, `ce qui cloche :\n  · ${griefs.join('\n  · ')}`).toEqual([])
})

/**
 * ── 🔴 UN MEUBLE FLOTTANT MANGE LA FIN DE CE QU'IL SURVOLE ─────────────────
 *
 * La pastille est `fixed` : au milieu d'un texte qui défile, elle le recouvre,
 * et c'est normal — tous les lecteurs du monde font ça. Ce qui n'est PAS
 * normal, c'est qu'une fois défilé jusqu'en bas, les dernières lignes restent
 * dessous : elles deviennent alors **définitivement illisibles**, puisqu'il n'y
 * a plus rien à faire défiler pour les dégager.
 *
 * 🧭 ET ÇA NE SE VOIT PAS EN REGARDANT L'ÉCRAN : il faut défiler jusqu'au bout
 * ET comparer deux boîtes. La capture, elle, montrerait un écran parfaitement
 * normal.
 */
test('la pastille ne mange pas la fin du texte de la leçon', async ({ page }) => {
  await ouvrirEcoute(page)
  await lancer(page)
  await auModule(page)

  const rangees = page.locator('[data-lecon]')
  expect(await rangees.count(), 'aucune rangée de leçon sur la couverture du module').toBeGreaterThan(0)
  const vers = await rangees.first().getAttribute('href')
  await rangees.first().click()
  await expect.poll(() => page.url(), { timeout: 15_000 }).toContain(vers)
  await page.locator(PASTILLE).waitFor({ state: 'visible', timeout: 15_000 })

  // Jusqu'en bas, et on attend que le défilement soit VRAIMENT fini — un
  // défilement doux rend la main avant d'être arrivé.
  const boite = () =>
    page.evaluate(() => {
      const e = document.scrollingElement
      e.scrollTop = e.scrollHeight
      const p = document.querySelector('[data-pastille-ecoute]').getBoundingClientRect()
      const blocs = [...document.querySelectorAll('main p, main li, main h2, main h3')].filter(
        (b) => b.textContent.trim().length > 20,
      )
      const d = blocs.at(-1)?.getBoundingClientRect()
      return {
        reste: Math.round(e.scrollHeight - e.scrollTop - e.clientHeight),
        pastilleHaut: Math.round(p.top),
        texteBas: d ? Math.round(d.bottom) : null,
        extrait: blocs.at(-1)?.textContent.trim().slice(0, 60) ?? null,
      }
    })
  await expect.poll(async () => (await boite()).reste, { timeout: 15_000 }).toBeLessThan(4)

  const m = await boite()
  console.log(JSON.stringify(m, null, 1))
  expect(m.texteBas, 'aucun bloc de texte trouvé : la sonde n’éprouverait rien').not.toBeNull()
  expect(
    m.texteBas,
    `le dernier texte descend à ${m.texteBas} et la pastille commence à ${m.pastilleHaut} : « ${m.extrait} » est caché pour de bon`,
  ).toBeLessThanOrEqual(m.pastilleHaut)
})

/** Loin de la formation : un écran qui n'a rien à voir avec la leçon. */
async function ailleurs(page) {
  await auModule(page)
  await aLEtagere(page)
  const lien = page.locator(`${BAS}[href="/gens"]`).first()
  expect(await lien.count(), 'pas de case Contacts dans la barre du bas').toBeGreaterThan(0)
  await lien.click()
  await expect.poll(() => page.url(), { timeout: 15_000 }).toContain('/gens')
  await page.locator(PASTILLE).waitFor({ state: 'visible', timeout: 15_000 })
}

const pisteJouee = (page) =>
  page.evaluate(() => ({
    src: document.querySelector('audio')?.currentSrc ?? null,
    arrete: document.querySelector('audio')?.paused,
    texte: document.querySelector('[data-pastille-ecoute]')?.textContent.trim() ?? null,
  }))

/**
 * ── 🔴 CHANGER DE PISTE N'EST PAS CHANGER DE PAGE ──────────────────────────
 *
 * Patrice : *« sur le lecteur en arrière-plan je n'ai pas le module et je ne
 * peux pas passer à la leçon suivante ou précédente »*. Les deux sauts ajoutés
 * pour ça ne valent que s'ils laissent la personne où elle est : on écoutait
 * EN FAISANT AUTRE CHOSE, et l'éjecter vers l'écran d'écoute annulerait tout
 * le chantier.
 */
test('les sauts de la pastille changent la piste sans déplacer l’écran', async ({ page }) => {
  await ouvrirEcoute(page)
  await lancer(page)
  await ailleurs(page)

  const avant = await pisteJouee(page)
  const adresse = page.url()
  console.log(JSON.stringify({ adresse, ...avant }, null, 1))

  const griefs = []
  // Elle vit sur des écrans sans aucun rapport avec la formation : sans le
  // module, « Leçon 1 » ne dit pas de quel livre.
  if (!avant.texte?.includes('Module ')) griefs.push(`la pastille ne dit pas le module : « ${avant.texte} »`)

  /**
   * 🔴 LA LIGNE DU RANG NE DOIT JAMAIS ÊTRE COUPÉE. C'est la mesure qui a
   * tranché le format : dans une colonne de 136 px, le pire cas des onze
   * modules occupe 95 px depuis qu'il ne porte plus le total. Un rang tronqué
   * — « Module 11 · Leç… » — se lit comme un écran cassé, là où un TITRE
   * tronqué se lit comme un titre long. Les deux lignes n'ont pas le même
   * droit à déborder.
   */
  const rang = await page.evaluate(() => {
    const e = document.querySelector('[data-pastille-ecoute] a span span')
    return e ? { texte: e.textContent.trim(), visible: e.clientWidth, reel: e.scrollWidth } : null
  })
  console.log(JSON.stringify({ rang }, null, 1))
  if (!rang) griefs.push('ligne du rang introuvable')
  else if (rang.reel > rang.visible)
    griefs.push(`le rang « ${rang.texte} » est coupé : ${rang.reel} px pour ${rang.visible} disponibles`)

  await page.locator('[data-pastille-suivant]').click()
  await expect
    .poll(() => page.evaluate(() => document.querySelector('audio')?.currentSrc), { timeout: 20_000 })
    .not.toBe(avant.src)
  const apres = await pisteJouee(page)
  console.log(JSON.stringify({ adresse: page.url(), ...apres }, null, 1))

  if (page.url() !== adresse) griefs.push(`⏭ a déplacé l’écran : ${adresse} → ${page.url()}`)
  if (!apres.texte?.includes('Leçon 2')) griefs.push(`la pastille annonce encore « ${apres.texte} »`)
  await expect
    .poll(() => page.evaluate(() => !document.querySelector('audio')?.paused), { timeout: 20_000 })
    .toBe(true)

  // Et le retour en arrière ramène bien la première, toujours sans bouger.
  await page.locator('[data-pastille-precedent]').click()
  await expect
    .poll(() => page.evaluate(() => document.querySelector('audio')?.currentSrc), { timeout: 20_000 })
    .toBe(avant.src)
  if (page.url() !== adresse) griefs.push(`⏮ a déplacé l’écran : ${adresse} → ${page.url()}`)
  // 🔴 Au premier bout du module, « précédent » doit être ÉTEINT et non retiré :
  // une pastille qui change de forme entre deux leçons déplace les autres
  // boutons sous le pouce.
  const eteint = await page.locator('[data-pastille-precedent]').isDisabled()
  if (!eteint) griefs.push('sur la leçon 1, ⏮ n’est pas éteint')
  if ((await page.locator('[data-pastille-precedent]').count()) !== 1)
    griefs.push('⏮ a été retiré au lieu d’être éteint')

  expect(griefs, `ce qui cloche :\n  · ${griefs.join('\n  · ')}`).toEqual([])
})

/**
 * ── 🔴 LE DÉFAUT LIVRÉ LE MATIN MÊME ───────────────────────────────────────
 *
 * L'enchaînement appelait `router.replace` SANS CONDITION : une leçon qui se
 * terminait pendant qu'on travaillait dans Contacts **éjectait vers la page
 * d'écoute**. C'est l'exact contraire de ce que « écouter en travaillant dans
 * Atline » promet, et ça ne se voit qu'en laissant une piste aller au bout
 * depuis un autre écran.
 */
test('l’enchaînement ne déplace pas l’écran où l’on travaille', async ({ page }) => {
  await ouvrirEcoute(page)
  await lancer(page)
  await ailleurs(page)

  const avant = await pisteJouee(page)
  const adresse = page.url()
  await page.evaluate(() => {
    const a = document.querySelector('audio')
    a.currentTime = a.duration - 1.2
  })

  await expect
    .poll(() => page.evaluate(() => document.querySelector('audio')?.currentSrc), { timeout: 30_000 })
    .not.toBe(avant.src)
  const apres = await pisteJouee(page)
  console.log(JSON.stringify({ adresse, apres: page.url(), texte: apres.texte }, null, 1))

  expect(page.url(), `l’enchaînement a éjecté de ${adresse} vers ${page.url()}`).toBe(adresse)
  expect(apres.texte, 'la pastille n’a pas suivi la leçon enchaînée').toContain('Leçon 2')
})

/**
 * ── 🔴 DEUX CHOSES QUI NE SE VOIENT PAS À L'ŒIL ────────────────────────────
 *
 * La croix est passée dans l'angle, en débordant dans la gouttière. Deux
 * risques, tous deux invisibles sur une capture : qu'elle MORDE sur le bouton
 * « suivante » juste en dessous — on viserait l'un et on toucherait l'autre —
 * et qu'elle sorte de l'écran.
 *
 * Et le titre ne défile que s'il dépasse vraiment : un défilement qui ne part
 * jamais, ou qui part sur un titre court, ne se remarque pas non plus.
 */
test('la croix en angle ne mord pas sur le bouton suivante', async ({ page }) => {
  await ouvrirEcoute(page)
  await lancer(page)
  await auModule(page)

  const g = await page.evaluate(() => {
    const b = (s) => {
      const e = document.querySelector(s)
      return e ? e.getBoundingClientRect() : null
    }
    const croix = b('[data-pastille-fermer]')
    const suiv = b('[data-pastille-suivant]')
    const titre = document.querySelector('[data-pastille-ecoute] a span span:last-child')
    const inter = (a, c) => ({
      x: Math.max(0, Math.min(a.right, c.right) - Math.max(a.left, c.left)),
      y: Math.max(0, Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top)),
    })
    return {
      croix: { x: Math.round(croix.x), droite: Math.round(croix.right), haut: Math.round(croix.top) },
      ecran: window.innerWidth,
      morsure: inter(croix, suiv),
      colonneTitre: Math.round(titre.clientWidth),
    }
  })
  console.log(JSON.stringify(g, null, 1))

  const griefs = []
  // Un chevauchement de quelques pixels est sans conséquence — aucun doigt ne
  // vise à ce point. Au-delà, on touche une commande en croyant en viser une
  // autre, et c'est le genre de défaut qu'on met des jours à nommer.
  if (g.morsure.x * g.morsure.y > 16)
    griefs.push(`la croix mord ${g.morsure.x}×${g.morsure.y} px sur « suivante »`)
  if (g.croix.droite > g.ecran) griefs.push(`la croix sort de l’écran de ${g.croix.droite - g.ecran} px`)
  if (g.croix.haut < -20) griefs.push(`la croix flotte ${-g.croix.haut} px au-dessus de la pastille`)
  // 🔴 ELLE A QUITTÉ LA RANGÉE, donc le titre doit avoir récupéré sa place.
  if (g.colonneTitre < 160)
    griefs.push(`la colonne du titre ne fait que ${g.colonneTitre} px : la croix pèse encore sur la rangée`)

  expect(griefs, `ce qui cloche :\n  · ${griefs.join('\n  · ')}`).toEqual([])
})

test('le titre défile une fois quand il ne tient pas', async ({ page }) => {
  await ouvrirEcoute(page)
  await lancer(page)
  await auModule(page)

  const t = await page.evaluate(() => {
    const boite = document.querySelector('[data-pastille-ecoute] a span span:last-child')
    const mobile = boite?.querySelector('.titre-pastille')
    const st = mobile ? getComputedStyle(mobile) : null
    return {
      texte: boite?.textContent.trim() ?? null,
      colonne: boite ? Math.round(boite.clientWidth) : null,
      texteLarge: mobile ? Math.round(mobile.offsetWidth) : Math.round(boite?.scrollWidth ?? 0),
      defile: !!mobile,
      duree: st?.animationDuration ?? null,
      passages: st?.animationIterationCount ?? null,
    }
  })
  console.log(JSON.stringify(t, null, 1))

  const griefs = []
  if (!t.defile) griefs.push(`le titre ne défile pas alors qu’il demande ${t.texteLarge} px pour ${t.colonne}`)
  // ⚠️ UNE SEULE FOIS. Une pastille qui bouge en permanence dans le coin de
  // l'œil pendant qu'on travaille serait pire que le titre coupé.
  if (t.passages !== '1') griefs.push(`le titre défile ${t.passages} fois au lieu d’une`)
  if (t.texteLarge <= t.colonne) griefs.push('le titre tient : ce test n’éprouve rien sur cette leçon')

  expect(griefs, `ce qui cloche :\n  · ${griefs.join('\n  · ')}`).toEqual([])
})

/**
 * ── 🔴 UN CURSEUR DE DEUX PIXELS, ET TROIS PIÈGES ──────────────────────────
 *
 * Patrice voulait pouvoir se déplacer dans la leçon depuis la pastille. Le
 * trait fait deux pixels : la prise est donc une zone de 14 px posée dans le
 * couloir vide sous les boutons. Trois choses à prouver, et aucune ne se voit :
 *
 *   · que le geste déplace VRAIMENT la lecture, et au bon endroit ;
 *   · qu'il ne ferme pas la pastille au passage — le glissement qui la ferme
 *     vit sur la boîte juste au-dessus, et deux gestes horizontaux se
 *     superposent ;
 *   · que la zone ne mord pas sur les boutons, sinon on vise la lecture et on
 *     change de leçon.
 */
test('on déplace la lecture en tirant le curseur de la pastille', async ({ page }) => {
  await ouvrirEcoute(page)
  await lancer(page)
  await auModule(page)

  const d = await page.evaluate(() => document.querySelector('audio').duration)
  const r = await page.locator('[data-pastille-curseur]').boundingBox()
  expect(r, 'pas de curseur sur la pastille').toBeTruthy()
  const y = r.y + r.height / 2
  const cible = 0.7

  await page.mouse.move(r.x + r.width * 0.2, y)
  await page.mouse.down()
  // Le temps doit apparaître À LA PLACE DU RANG pendant le geste : sans lui on
  // ne récolte qu'une proportion, et « à peu près un tiers » fait quatre
  // minutes sur une leçon de onze.
  await page.mouse.move(r.x + r.width * 0.45, y)
  await page.mouse.move(r.x + r.width * cible, y)
  /**
   * ⚠️ ON ATTEND QUE LA BOULE AIT FINI DE GROSSIR. Première version : on la
   * lisait juste après le mouvement et elle mesurait **10,33 px** — en pleine
   * transition de cent millisecondes. Le test passait par chance, à un tiers
   * de pixel du seuil. Une mesure prise sur une cible en mouvement ment, même
   * quand elle donne le bon verdict.
   */
  /**
   * ⚠️ UNE SEULE LECTURE, ET C'EST ELLE QU'ON JUGE. Version précédente : on
   * attendait que la boule ait grossi, PUIS on relisait dans un second appel.
   * Deux lectures, deux instants — et la seconde retombait parfois sur 12 px,
   * la taille au repos. Le test échouait au hasard en accusant l'app de ne pas
   * grossir la boule, alors qu'elle l'avait fait entre les deux mesures.
   *
   * 🧭 La valeur qu'on affirme doit être CELLE QUI A SATISFAIT L'ATTENTE, pas
   * une autre prise juste après.
   */
  let pendant = null
  await expect
    .poll(
      async () => {
        pendant = await page.evaluate(() => ({
          rang: document.querySelector('[data-pastille-ecoute] a span span')?.textContent.trim() ?? null,
          boule: Math.round(document.querySelector('[data-pastille-boule]')?.getBoundingClientRect().width ?? 0),
        }))
        return pendant.boule
      },
      { timeout: 5_000 },
    )
    .toBeGreaterThan(12)
  await page.mouse.up()

  const apres = await page.evaluate(() => ({
    t: document.querySelector('audio').currentTime,
    rang: document.querySelector('[data-pastille-ecoute] a span span')?.textContent.trim() ?? null,
    pastille: !!document.querySelector('[data-pastille-ecoute]'),
  }))
  console.log(JSON.stringify({ duree: Math.round(d), vise: Math.round(d * cible), pendant, apres }, null, 1))

  const griefs = []
  // 🔴 LE GESTE NE DOIT PAS FERMER LA PASTILLE. C'est le piège de deux gestes
  // horizontaux superposés : le plus local doit gagner.
  if (!apres.pastille) griefs.push('tirer le curseur a fermé la pastille')
  // Deux pour cent de tolérance : la souris vise au pixel, pas à la seconde.
  const ecart = Math.abs(apres.t - d * cible)
  if (ecart > d * 0.03)
    griefs.push(`arrivé à ${Math.round(apres.t)} s au lieu de ${Math.round(d * cible)} (écart ${Math.round(ecart)} s)`)
  if (!/^\d+:\d\d \/ \d+:\d\d$/.test(pendant.rang ?? ''))
    griefs.push(`pendant le geste, la ligne affiche « ${pendant.rang} » au lieu du temps`)
  if (!apres.rang?.startsWith('Module ')) griefs.push(`après le geste, la ligne reste à « ${apres.rang} »`)
  // Le seul accusé de réception qu'on ait sur une boule de dix pixels.
  if (pendant.boule < 13) griefs.push(`la boule ne grossit pas sous le doigt (${pendant.boule} px)`)

  expect(griefs, `ce qui cloche :\n  · ${griefs.join('\n  · ')}`).toEqual([])
})

/**
 * ── 🔴 LA BOULE DOIT ÊTRE ENTIÈREMENT DANS SA ZONE DE PRISE ────────────────
 *
 * Le défaut que Patrice a vu sur son téléphone pendant que la sonde, à la
 * souris, passait : la boule débordait de la zone **des deux côtés**. Trois
 * pixels sous elle, et au début d'une leçon sa moitié gauche sortait du rail.
 * On vise le seul repère visible, on tombe à moitié dehors, et dehors c'est le
 * glissement de fermeture qui prend le geste — la pastille tressaille, l'audio
 * ne bouge pas.
 *
 * 🧭 ON ÉPROUVE LES TROIS ENDROITS DU RAIL, parce que le défaut n'existait
 * qu'aux extrémités : au milieu, tout allait bien.
 */
test('la boule reste dans sa zone de prise, du début à la fin', async ({ page }) => {
  await ouvrirEcoute(page)
  await lancer(page)
  await auModule(page)

  const d = await page.evaluate(() => document.querySelector('audio').duration)
  const releve = async (nom) => {
    const m = await page.evaluate(() => {
      const r = (s) => {
        const e = document.querySelector(s)
        const b = e.getBoundingClientRect()
        return { g: Math.round(b.left), d: Math.round(b.right), h: Math.round(b.top), b: Math.round(b.bottom) }
      }
      return { boule: r('[data-pastille-boule]'), zone: r('[data-pastille-curseur]') }
    })
    const hors = [
      m.boule.g < m.zone.g && `${m.zone.g - m.boule.g} px à gauche`,
      m.boule.d > m.zone.d && `${m.boule.d - m.zone.d} px à droite`,
      m.boule.h < m.zone.h && `${m.zone.h - m.boule.h} px au-dessus`,
      m.boule.b > m.zone.b && `${m.boule.b - m.zone.b} px en dessous`,
    ].filter(Boolean)
    return { nom, ...m, hors }
  }

  const vus = [await releve('au début')]
  for (const [nom, p] of [['au milieu', 0.5], ['à la fin', 0.995]]) {
    await page.evaluate((p) => {
      document.querySelector('audio').currentTime = document.querySelector('audio').duration * p
    }, p)
    await expect
      .poll(() => page.evaluate(() => document.querySelector('audio').currentTime), { timeout: 10_000 })
      .toBeGreaterThan(d * p - 2)
    vus.push(await releve(nom))
  }
  console.log(JSON.stringify(vus, null, 1))

  const griefs = vus.filter((v) => v.hors.length).map((v) => `${v.nom} : la boule sort de ${v.hors.join(' et ')}`)
  expect(griefs, `ce qui cloche :\n  · ${griefs.join('\n  · ')}`).toEqual([])
})

test('la prise du curseur ne mord pas sur les boutons', async ({ page }) => {
  await ouvrirEcoute(page)
  await lancer(page)
  await auModule(page)

  const g = await page.evaluate(() => {
    const b = (s) => {
      const e = document.querySelector(s)
      return e ? e.getBoundingClientRect() : null
    }
    const z = b('[data-pastille-curseur]')
    /**
     * 🔴 LE HAUT DES COMMANDES, PAS LE HAUT DU MEUBLE. La barre d'action
     * porte 24 px de rembourrage avant ses boutons : comparer au cadre faisait
     * crier la sonde alors que 18 px séparaient la prise du premier bouton.
     * Ce qu'on protège, ce sont les CIBLES, pas les boîtes qui les contiennent.
     */
    const meuble = document.querySelector('[data-barre-action]') || document.querySelector('[data-barre-bas]')
    const cibles = meuble ? [...meuble.querySelectorAll('a, button')].map((e) => e.getBoundingClientRect().top) : []
    return {
      zone: { haut: Math.round(z.top), bas: Math.round(z.bottom), h: Math.round(z.height) },
      play: Math.round(b('[data-pastille-basculer]').bottom),
      suivant: Math.round(b('[data-pastille-suivant]').bottom),
      meubleHaut: meuble ? Math.round(meuble.getBoundingClientRect().top) : null,
      cibleHaut: cibles.length ? Math.round(Math.min(...cibles)) : null,
    }
  })
  console.log(JSON.stringify(g, null, 1))

  const griefs = []
  const plusBas = Math.max(g.play, g.suivant)
  // 🔴 EN HAUT ELLE S'ARRÊTE AUX BOUTONS : viser la lecture et changer de
  // leçon est le genre de défaut qu'on met des jours à nommer.
  if (g.zone.haut < plusBas)
    griefs.push(`la prise commence à ${g.zone.haut}, soit ${plusBas - g.zone.haut} px DANS les boutons`)
  /**
   * 🔴 ET EN BAS ELLE S'ARRÊTE AVANT LES COMMANDES DU MEUBLE. Depuis que la
   * pastille est COLLÉE à la barre, sa zone de prise déborde forcément sur le
   * cadre de celle-ci — c'est la conséquence voulue de « collée ». Ce qui
   * compte est qu'elle ne morde pas sur les BOUTONS : mesuré, la prise finit
   * à 766 et le premier bouton commence à 784, les 24 px de rembourrage de la
   * barre tenant lieu de marge.
   */
  if (g.cibleHaut !== null && g.zone.bas > g.cibleHaut)
    griefs.push(`la prise descend à ${g.zone.bas}, le premier bouton du meuble commence à ${g.cibleHaut}`)
  if (g.zone.h < 18) griefs.push(`la prise ne fait que ${g.zone.h} px : trop fine pour un doigt`)

  expect(griefs, `ce qui cloche :\n  · ${griefs.join('\n  · ')}`).toEqual([])
})

/**
 * ── 🔴 LA LEÇON SE TAIT AVANT QUE LE MICRO S'OUVRE ─────────────────────────
 *
 * Dernier morceau de la demande d'origine. Depuis que le son survit aux
 * changements d'écran, une leçon peut tourner pendant qu'on se met à parler :
 * on ne dicte pas par-dessus un cours, et le micro l'entendrait autant que la
 * personne.
 *
 * 🧭 LA SONDE N'A PAS BESOIN D'AUTORISER LE MICRO, et c'est révélateur de
 * l'ordre choisi : le silence est demandé AVANT `getUserMedia`. Si le
 * correctif était placé après, ce test échouerait faute de permission — ce qui
 * est exactement la garantie qu'on veut.
 */
test('la leçon se tait quand on commence à dicter', async ({ page }) => {
  await ouvrirEcoute(page)
  await lancer(page)
  await auModule(page)
  await aLEtagere(page)

  const atlas = page.locator(`${BAS}[href="/atlas"]`).first()
  expect(await atlas.count(), 'pas de case Atlas dans la barre du bas').toBeGreaterThan(0)
  await atlas.click()
  await expect.poll(() => page.url(), { timeout: 15_000 }).toContain('/atlas')
  await page.locator(PASTILLE).waitFor({ state: 'visible', timeout: 15_000 })

  const dicter = page.locator('[data-dicter]')
  await dicter.waitFor({ state: 'visible', timeout: 15_000 })
  expect(
    await page.evaluate(() => document.querySelector('audio')?.paused),
    'la leçon devrait encore jouer avant qu’on touche au micro',
  ).toBe(false)

  // On maintient, comme le geste réel le demande.
  const b = await dicter.boundingBox()
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
  await page.mouse.down()
  await expect
    .poll(() => page.evaluate(() => document.querySelector('audio')?.paused), { timeout: 10_000 })
    .toBe(true)
  await page.mouse.up()

  // ⚠️ ET ELLE NE REPART PAS TOUTE SEULE. Un son qui reprend dans l'oreille au
  // moment où l'on relâche serait une agression : la pastille est là, avec son
  // bouton.
  expect(
    await page.evaluate(() => document.querySelector('audio')?.paused),
    'la leçon ne doit pas repartir seule à la fin de la dictée',
  ).toBe(true)
})

/**
 * ── 🔴 UN RAFRAÎCHISSEMENT NE DOIT PAS EFFACER CE QU'ON ÉCOUTE ─────────────
 *
 * Patrice : *« si l'audio est en arrière-plan et que je suis sur la page
 * contact, si j'actualise la page le lecteur disparaît »*. L'état du lecteur
 * vit en mémoire, et un rechargement de document la vide. Tout le chantier dit
 * que le son suit la personne ; un simple rafraîchissement ne doit pas le
 * contredire.
 *
 * ⚠️ LE SON, LUI, S'ARRÊTE — et c'est inévitable : le document est détruit.
 * Ce qu'on mesure est que la pastille REVIENT, sur la bonne leçon, à l'arrêt.
 */
test('le lecteur survit à un rafraîchissement de la page', async ({ page }) => {
  await ouvrirEcoute(page)
  await lancer(page)
  await ailleurs(page)

  const avant = await pisteJouee(page)
  const adresse = page.url()
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.locator(PASTILLE).waitFor({ state: 'visible', timeout: 20_000 })

  const apres = await pisteJouee(page)
  console.log(JSON.stringify({ adresse, avant: avant.texte, apres: apres.texte, src: apres.src }, null, 1))

  const griefs = []
  if (apres.texte !== avant.texte)
    griefs.push(`la pastille revient sur « ${apres.texte} » au lieu de « ${avant.texte} »`)
  if (apres.src !== avant.src) griefs.push('la pastille est revenue sur une autre piste')
  // 🔴 À L'ARRÊT. Personne n'a rien demandé en rafraîchissant, et un son qui
  // repart seul dans l'oreille est une agression — c'est la même règle que la
  // reprise d'une leçon commencée.
  if (apres.arrete !== true) griefs.push('le son est reparti tout seul après le rafraîchissement')

  expect(griefs, `ce qui cloche :\n  · ${griefs.join('\n  · ')}`).toEqual([])
})

/**
 * ── 🔴 « LIRE » DOIT OUVRIR LA LEÇON QU'ON ÉCOUTE ──────────────────────────
 *
 * Patrice : *« si je suis sur le lecteur audio en arrière-plan et que j'ouvre
 * la liseuse, elle devrait s'ouvrir sur la leçon en cours de lecture »*. La
 * couverture du module calcule côté serveur la leçon où le PARCOURS s'est
 * arrêté : juste à froid, faux dès qu'une leçon joue. Deux idées de « où j'en
 * suis » qui ne se parlaient pas.
 */
test('« Lire » et « Écouter » suivent la leçon qui joue', async ({ page }) => {
  await ouvrirEcoute(page)
  await lancer(page)
  await auModule(page)

  // On avance d'une leçon depuis la pastille : le serveur, lui, continue de
  // penser à la leçon « à reprendre ».
  const avant = await pisteJouee(page)
  await page.locator('[data-pastille-suivant]').click()
  await expect
    .poll(() => page.evaluate(() => document.querySelector('audio')?.currentSrc), { timeout: 20_000 })
    .not.toBe(avant.src)

  const joue = await page.evaluate(() => {
    const s = document.querySelector('audio').currentSrc
    return s.match(/\/api\/lecon\/([^/]+)\//)?.[1] ?? null
  })
  const liens = await page.evaluate(() =>
    ['Lire', 'Écouter'].map((n) => {
      const a = [...document.querySelectorAll('a')].find((e) => e.textContent.trim() === n)
      return { nom: n, href: a?.getAttribute('href') ?? null }
    }),
  )
  console.log(JSON.stringify({ leconQuiJoue: joue, liens }, null, 1))

  const griefs = []
  if (!joue) griefs.push('impossible de lire l’identifiant de la leçon jouée')
  for (const l of liens) {
    if (!l.href) griefs.push(`pas de lien « ${l.nom} » sur la couverture du module`)
    else if (joue && !l.href.includes(joue))
      griefs.push(`« ${l.nom} » mène à ${l.href} alors que la leçon ${joue} joue`)
  }
  expect(griefs, `ce qui cloche :\n  · ${griefs.join('\n  · ')}`).toEqual([])
})

test('on ferme la pastille en la faisant glisser vers la droite', async ({ page }) => {
  await ouvrirEcoute(page)
  await lancer(page)
  await auModule(page)

  const b = await page.locator(PASTILLE).boundingBox()
  expect(b, 'pastille introuvable').toBeTruthy()
  const y = b.y + b.height / 2
  // ⚠️ PLUSIEURS PAS, et non un saut : la prise ne s'arme qu'après huit pixels
  // et seulement si le doigt va plus à l'horizontale qu'à la verticale. Un
  // unique `move` sauterait ce seuil sans jamais le franchir.
  await page.mouse.move(b.x + 40, y)
  await page.mouse.down()
  for (const p of [20, 60, 110, 170, 230]) await page.mouse.move(b.x + 40 + p, y)
  await page.mouse.up()

  await expect(page.locator(PASTILLE)).toHaveCount(0, { timeout: 10_000 })
  expect(
    await page.evaluate(() => document.querySelector('audio')?.paused ?? true),
    'le glissement doit aussi faire taire le son',
  ).toBe(true)
})

test('la pastille met en pause, et sa croix met fin', async ({ page }) => {
  await ouvrirEcoute(page)
  await lancer(page)
  await auModule(page)

  await page.locator('[data-pastille-basculer]').click()
  await expect
    .poll(() => page.evaluate(() => document.querySelector('audio')?.paused), { timeout: 10_000 })
    .toBe(true)

  // Et elle repart : c'est une bascule, pas un bouton d'arrêt.
  await page.locator('[data-pastille-basculer]').click()
  await expect
    .poll(() => page.evaluate(() => !document.querySelector('audio')?.paused), { timeout: 15_000 })
    .toBe(true)

  /**
   * 🔴 LA CROIX EST LE SEUL ENDROIT OÙ L'ON DIT « J'AI FINI ». Puisque plus
   * aucune sortie d'écran n'arrête le son, sans elle on serait obligé de
   * mettre en pause avant de partir — et la pastille suivrait pour toujours.
   */
  await page.locator('[data-pastille-fermer]').click()
  await expect(page.locator(PASTILLE)).toHaveCount(0, { timeout: 10_000 })
  expect(
    await page.evaluate(() => document.querySelector('audio')?.paused ?? true),
    'la croix doit aussi faire taire le son, pas seulement cacher la pastille',
  ).toBe(true)
})

/**
 * ── 🔴 LA PASTILLE ET LA CARTE D'ENTRAÎNEMENT SONT DU MÊME GABARIT ─────────
 *
 * Patrice, capture à l'appui : *« la carte entraînement du bas et le lecteur
 * sont de hauteur différente, et cela me fait dire que le lecteur doit avoir
 * la même hauteur que la carte »*. Relevé : 78 px contre 64, pour une largeur
 * rigoureusement identique. Deux cartes de même largeur empilées, de hauteurs
 * voisines mais différentes : le bruit qu'il nomme à chaque fois.
 *
 * ⚠️ ET C'EST POUR ÇA QUE CETTE SONDE EXISTE. La hauteur de la carte
 * d'entraînement est une CONSÉQUENCE de son contenu ; celle de la pastille est
 * un NOMBRE ÉCRIT. Rien dans le code ne les relie, donc rien n'empêcherait la
 * première de bouger sans la seconde — sauf une mesure qui les compare.
 */
test('la pastille a le gabarit de la carte d’entraînement, et lui est collée', async ({ page }) => {
  await ouvrirEcoute(page)
  await lancer(page)
  await auModule(page)
  await page.evaluate(() => scrollTo(0, document.scrollingElement.scrollHeight))

  const m = await page.evaluate(() => {
    const r = (e) => {
      if (!e) return null
      const b = e.getBoundingClientRect()
      return { haut: Math.round(b.height), large: Math.round(b.width), bas: Math.round(b.bottom) }
    }
    const exo = [...document.querySelectorAll('a, div')].find((e) => {
      const t = e.textContent.trim()
      const b = e.getBoundingClientRect()
      return t.startsWith('Rejouer ça à l’entraînement') && b.height > 40 && b.height < 160
    })
    const past = document.querySelector('[data-pastille-ecoute]')
    const meuble = document.querySelector('[data-barre-action]') || document.querySelector('[data-barre-bas]')
    return {
      exercice: r(exo),
      carte: r(past?.querySelector('.relative > div:nth-child(2)')),
      boule: r(document.querySelector('[data-pastille-boule]')),
      meubleHaut: meuble ? Math.round(meuble.getBoundingClientRect().top) : null,
      zPastille: past ? Number(getComputedStyle(past).zIndex) : null,
      zMeuble: meuble ? Number(getComputedStyle(meuble).zIndex) : null,
    }
  })
  console.log(JSON.stringify(m, null, 1))

  const griefs = []
  // 🔴 SANS LA CARTE, CE TEST N'ÉPROUVE RIEN. Tous les modules n'ont pas
  // d'entraînement ; mieux vaut échouer que passer au vert sur une comparaison
  // qui n'a pas eu lieu.
  if (!m.exercice) griefs.push('carte d’entraînement introuvable : la comparaison n’a pas eu lieu')
  else {
    if (m.carte.haut !== m.exercice.haut)
      griefs.push(`hauteurs différentes : pastille ${m.carte.haut}, carte ${m.exercice.haut}`)
    if (m.carte.large !== m.exercice.large)
      griefs.push(`largeurs différentes : pastille ${m.carte.large}, carte ${m.exercice.large}`)
  }
  // Collée : le bas de la carte touche le haut du meuble.
  if (m.meubleHaut === null) griefs.push('aucun meuble en bas : « collée » ne veut rien dire ici')
  else if (Math.abs(m.carte.bas - m.meubleHaut) > 1)
    griefs.push(`pas collée : la carte finit à ${m.carte.bas}, le meuble commence à ${m.meubleHaut}`)

  /**
   * 🔴 ET LA BOULE PASSE DEVANT. Elle déborde de 4 px sous la carte, donc
   * collée au meuble elle le chevauche. Les deux étaient en `z-30` et c'est
   * l'ordre du DOM qui tranchait — ça marchait, et rien ne l'écrivait.
   */
  if (m.boule && m.meubleHaut !== null && m.boule.bas > m.meubleHaut) {
    if (!(m.zPastille > m.zMeuble))
      griefs.push(`la boule déborde sur le meuble mais z ${m.zPastille} ≤ ${m.zMeuble} : sa moitié basse peut disparaître`)
  }

  expect(griefs, `ce qui cloche :\n  · ${griefs.join('\n  · ')}`).toEqual([])
})
