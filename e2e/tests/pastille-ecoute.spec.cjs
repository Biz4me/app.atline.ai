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
