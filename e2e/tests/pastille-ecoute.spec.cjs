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
const { test, expect, toucher } = require('../fixtures.cjs')
const { lancer, ouvrirEcoute } = require('../son.cjs')

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

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
test('l’ordre du bas : barre, lecteur, bouton — et le lecteur pleine largeur', async ({ page }) => {
  await ouvrirEcoute(page)
  await lancer(page)

  const geo = () =>
    page.evaluate(() => {
      const boite = (s) => {
        const e = document.querySelector(s)
        return e ? e.getBoundingClientRect() : null
      }
      /**
       * ⚠️ `data-pastille-carte` ET PLUS UN RANG D'ENFANT. Elle visait
       * `.relative > div:nth-child(2)` : en retirant la croix le 21 novembre
       * 2026, les enfants se sont décalés d'un cran et cette sonde mesurait
       * la POIGNÉE du curseur — qui déborde de six pixels sous la carte. Elle
       * annonçait un lecteur qui mord sur la barre du bas, alors qu'il lui
       * est collé au pixel.
       */
      const p = boite('[data-pastille-carte]')
      const bas = boite('[data-barre-bas]')
      const action = boite('[data-barre-action]')
      return {
        pastilleHaut: Math.round(p.top),
        pastilleBas: Math.round(p.bottom),
        large: Math.round(p.width),
        ecran: window.innerHeight,
        barreHaut: bas ? Math.round(bas.top) : null,
        barreLarge: bas ? Math.round(bas.width) : null,
        actionBas: action ? Math.round(action.bottom) : null,
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
    /**
     * 🔴 L'ORDRE A CHANGÉ LE 20 NOVEMBRE 2026 : **barre du bas, lecteur,
     * bouton**. Patrice : *« sur les pages où nous avons le bouton au-dessus
     * de la bottom, la règle change »*. Cette sonde décrivait l'ordre
     * d'avant — le lecteur par-dessus tout le mobilier — et c'est son travail
     * de tomber quand la règle bouge.
     */
    if (v.actionBas !== null && v.pastilleHaut < v.actionBas - 1)
      griefs.push(`${v.ou} : le geste du jour finit à ${v.actionBas} et le lecteur commence à ${v.pastilleHaut}`)
    if (v.barreHaut !== null && v.pastilleBas > v.barreHaut + 1)
      griefs.push(`${v.ou} : le lecteur descend à ${v.pastilleBas}, la barre du bas commence à ${v.barreHaut}`)
    /**
     * ── 🔴 DOUZE PIXELS, ET PLUS « COLLÉ » — 22 novembre 2026 ──────────────
     *
     * Cette sonde exigeait le contact : *« un meuble posé sur un autre forme
     * une seule pièce »*. C'était juste tant que la pastille ÉTAIT un meuble,
     * d'un bord à l'autre. Patrice en a fait une **carte** — grammaire
     * d'« Ajouter un contact » : seize de gouttière, douze au-dessus du
     * meuble, coins arrondis. Un meuble se colle ; une carte se pose.
     *
     * ⚠️ ET LES DEUX NOMBRES SE TIENNENT. Collée, une carte arrondie aurait
     * ses coins du bas rognés par la barre : on n'aurait vu le rayon qu'en
     * haut, ce qui se lit comme un défaut de dessin, pas comme une intention.
     */
    const AIR = 12
    if (v.barreHaut !== null && Math.abs(v.barreHaut - v.pastilleBas - AIR) > 1)
      griefs.push(
        `${v.ou} : ${v.barreHaut - v.pastilleBas} px entre le lecteur et la barre du bas, au lieu de ${AIR}`,
      )
    // ⚠️ LA LARGEUR UTILE, c'est-à-dire celle de la barre moins ses deux
    // gouttières de seize : la carte s'aligne sur le CONTENU du meuble, pas
    // sur son cadre.
    if (v.barreLarge !== null && Math.abs(v.large - (v.barreLarge - 32)) > 1)
      griefs.push(
        `${v.ou} : lecteur ${v.large} px de large pour une barre de ${v.barreLarge} ` +
          `(on attend ${v.barreLarge - 32})`,
      )
    // Sans aucun meuble, il reste près du bord — le défaut nommé dans
    // `ConteneurAction` : un geste qui flotte à 64 px du vide.
    if (v.barreHaut === null && v.ecran - v.pastilleBas > 44)
      griefs.push(`${v.ou} : aucun meuble en bas et le lecteur s’arrête ${v.ecran - v.pastilleBas} px au-dessus du bord`)
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
// 🔴 RETIRÉ LE 25 NOVEMBRE 2026 : LE MINI NE CHANGE PLUS DE LEÇON. Les ⏮/⏭ ont
// quitté la pastille — le saut de leçon se fait dans le lecteur plein, à un tap
// de là. Ce test cliquait `[data-pastille-suivant]`/`-precedent`, qui n'existent
// plus. Sa part encore vraie (le mini DIT le thème du module) est tenue par
// « les deux lignes défilent sans raccord visible ». On le passe donc, sans le
// réécrire pour une capacité disparue.
test.skip('les sauts de la pastille changent la piste sans déplacer l’écran', async ({ page }) => {
  await ouvrirEcoute(page)
  await lancer(page)
  /**
   * ⚠️ LU AVANT DE PARTIR. `ailleurs` emmène sur un écran qui n'a aucun
   * rapport avec la formation — et dont la barre du haut dit « Contacts ».
   * Le thème se lit donc ici, pendant qu'on est encore dans le livre.
   */
  const theme = await page.evaluate(() => document.querySelector('h1')?.textContent.trim() ?? null)
  await ailleurs(page)

  const avant = await pisteJouee(page)
  const adresse = page.url()
  console.log(JSON.stringify({ adresse, ...avant }, null, 1))

  const griefs = []
  // Elle vit sur des écrans sans aucun rapport avec la formation : sans le
  // module, « Leçon 1 » ne dit pas de quel livre.
  /**
   * 🔴 LE MÊME MOT QUE LA BARRE DU HAUT, ET PLUS « Module N » — 22 nov. 2026.
   * Patrice : *« on ne met plus Module 2, on met le titre raccourci qu'on a
   * dans les top bar »*. On ne récrit donc pas le libellé attendu ici : on lit
   * celui que l'écran affiche et on exige que la pastille dise le même. Deux
   * écritures du même nom finissent toujours par diverger.
   */
  if (!theme) griefs.push('pas de titre dans la barre du haut : la comparaison n’a pas eu lieu')
  else if (!avant.texte?.includes(theme))
    griefs.push(`la pastille ne dit pas « ${theme} » comme la barre du haut : « ${avant.texte} »`)

  /**
   * ── 🔴 CETTE SONDE EXIGEAIT UN RANG JAMAIS COUPÉ. PLUS MAINTENANT ─────────
   *
   * Elle vérifiait que « Module 11 · Leçon 8 » tienne entier, parce qu'un rang
   * tronqué se lit comme un écran cassé là où un titre tronqué se lit comme un
   * titre long. C'était juste tant que la ligne portait le RANG.
   *
   * 🧭 LE 20 NOVEMBRE 2026, ELLE PORTE LE TITRE DU MODULE, ET AUCUN DES ONZE
   * NE TIENT — de 335 à 584 px pour une colonne de 170. La ligne défile donc,
   * et « coupé » n'est plus un défaut : c'est le mécanisme. Ce qui reste vrai,
   * et ce qu'on garde, c'est qu'elle doit DIRE le module.
   *
   * ⚠️ ET CE N'EST PAS UN ASSOUPLISSEMENT GRATUIT : la complétude du texte est
   * maintenant tenue ailleurs, par la sonde du raccord, qui prouve que les
   * deux exemplaires sont identiques et que la piste vaut exactement leur
   * somme. Une sonde a remplacé l'autre, elle ne s'est pas évaporée.
   */
  const rang = await page.evaluate(() => {
    const e = document.querySelector('[data-pastille-ligne="rang"]')
    return e ? { texte: e.textContent.trim().slice(0, 60), defile: !!e.querySelector('.titre-pastille') } : null
  })
  console.log(JSON.stringify({ rang }, null, 1))
  if (!rang) griefs.push('ligne du rang introuvable')
  else if (theme && !rang.texte.includes(theme))
    griefs.push(`la ligne du rang ne dit pas « ${theme} » : « ${rang.texte} »`)

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
 * ── 🔴 CE QUE LA RANGÉE REND AU TITRE ─────────────────────────────────────
 *
 * Cette sonde gardait la CROIX : qu'elle ne morde pas sur « suivante », et
 * qu'elle ne sorte pas de l'écran. **La croix a été retirée le 21 novembre
 * 2026** — les lecteurs réduits de Deezer, Spotify et Apple Music n'en ont
 * pas, et la nôtre se ferme en glissant vers la droite.
 *
 * 🧭 CE QU'ELLE PROTÉGEAIT DE PLUS SURVIT, et c'est la seule raison de garder
 * ce test : **la colonne du titre**. Elle manquait 202 px ; la croix lui en
 * rendait 34 en passant dans l'angle, la pochette et la croix lui en rendent
 * 78 en partant. Ce chiffre est le seul qui dise si la rangée a vraiment
 * lâché la place qu'on croit lui avoir prise.
 */
test('la rangée a rendu sa place au titre', async ({ page }) => {
  await ouvrirEcoute(page)
  await lancer(page)
  await auModule(page)

  const g = await page.evaluate(() => {
    /**
     * 🔴 PAR SON NOM, ET PLUS PAR SA POSITION. `a span span:last-child`
     * attrapait le RUBAN ANIMÉ dès que la première ligne défilait : relevé le
     * 22 novembre, cette sonde annonçait **1254 px de colonne sur un écran de
     * 390**, et passait donc au vert quoi qu'il arrive. Une sonde qui mesure
     * autre chose que son sujet ne peut pas avoir raison.
     */
    const titre = document.querySelector('[data-pastille-colonne]')
    return {
      colonneTitre: titre ? Math.round(titre.clientWidth) : null,
      // 🔴 LA VIGNETTE EST REVENUE, ET C'EST VOULU (25 novembre 2026). La
      // pochette avait été retirée pour rendre de la place au titre ; Patrice
      // l'a fait revenir en petit (40 px) pour que le mini DISE ce qu'on écoute.
      // On ne guette donc plus son absence mais sa PRÉSENCE — et la colonne
      // reste large (192 px mesurés, bien au-dessus du plancher).
      vignette: !!document.querySelector('[data-pastille-vignette]'),
      croix: !!document.querySelector('[data-pastille-fermer]'),
      lire: !!document.querySelector('[data-pastille-lire]'),
    }
  })
  console.log(JSON.stringify(g, null, 1))

  const griefs = []
  /**
   * 🔴 138, ET LE CHIFFRE EST ENFIN PRIS SUR LA BONNE BOÎTE. Relevé le
   * 22 novembre sur la colonne nommée, à 390 px d'écran : **146**. Tout y est
   * structurel — les 326 px utiles de la carte moins les quatre commandes
   * (32 + 36 + 32 + 32) et leurs écarts — et rien ne dépend du texte.
   *
   * ⚠️ ELLE A PERDU 32 PX LE MÊME JOUR, et c'est le prix assumé de la
   * gouttière : la pastille est devenue une carte posée au lieu d'un bandeau
   * d'un bord à l'autre. Le titre défile de toute façon — il demande 338 px
   * et n'en a jamais eu la moitié.
   *
   * 🧭 CE QUE LE SEUIL GUETTE RESTE LE MÊME : le retour de la pochette ou de
   * la croix, qui coûteraient une quarantaine de pixels.
   */
  if (g.colonneTitre === null) griefs.push('colonne du titre introuvable : rien n’a été mesuré')
  else if (g.colonneTitre < 138)
    griefs.push(`la colonne du titre ne fait que ${g.colonneTitre} px`)
  if (!g.vignette) griefs.push('la vignette de la pochette manque dans la rangée')
  if (g.croix) griefs.push('la croix est revenue')
  if (!g.lire) griefs.push('« Lire » manque dans la pastille')

  expect(griefs, `ce qui cloche :\n  · ${griefs.join('\n  · ')}`).toEqual([])
})

/**
 * ── 🔴 LE RACCORD DES DEUX LIGNES ──────────────────────────────────────────
 *
 * Les deux lignes de la bande défilent : le titre du module, puis celui de la
 * leçon. Ce qu'il faut tenir n'est pas qu'elles bougent — ça se voit — mais
 * que leur RACCORD soit invisible.
 *
 * 🧭 UNE BOUCLE SE FAIT À DEUX EXEMPLAIRES et l'animation translate de la
 * moitié de la piste. Si cette moitié ne vaut pas exactement un exemplaire, le
 * texte SAUTE à chaque tour. Rien dans le code ne relie les deux : le `pr-10`
 * des copies et le `-50%` du keyframe vivent à cent lignes l'un de l'autre.
 * C'est donc ici, et nulle part ailleurs, que tient l'invariant
 * **piste = 2 × exemplaire**.
 *
 * ⚠️ ET C'EST AUSSI CETTE SONDE QUI GARANTIT LE TEXTE ENTIER. L'ancienne règle
 * « le rang n'est jamais coupé » est tombée le jour où cette ligne a porté le
 * titre du module : deux exemplaires identiques, dont la somme fait la piste,
 * prouvent que rien n'est perdu.
 */
test('les deux lignes défilent sans raccord visible', async ({ page }) => {
  await ouvrirEcoute(page)
  await lancer(page)
  await auModule(page)

  const lignes = await page.evaluate(() => {
    /**
     * ── 🔴 LES DEUX MARGES DE LA FENÊTRE, MESURÉES ────────────────────────
     *
     * Patrice, le 20 novembre 2026 : *« éloigner légèrement de l'illustration
     * et rapprocher des commandes pour avoir quelque chose de mieux centré »*.
     * Le texte sortait à 2 px de l'image et s'arrêtait à 8 px des boutons.
     *
     * 🧭 ON MESURE L'ÉCART AUX VOISINS, PAS LES CLASSES. Les 6 px naissent de
     * trois décisions qui s'additionnent — l'écart du lien, la marge négative
     * reprise sur la rangée, et la largeur de la pochette. Relire les classes
     * dirait ce qui est demandé ; seul l'écart réel dit ce qui est obtenu, et
     * c'est lui qui se décale le jour où la pochette change de taille.
     */
    const bord = (s) => {
      const e = document.querySelector(s)
      const b = e?.getBoundingClientRect()
      return b ? { g: Math.round(b.left), d: Math.round(b.right) } : null
    }
    /**
     * 🔴 LA VIGNETTE À GAUCHE, LE PLAY À DROITE (25 novembre 2026). La fenêtre
     * du texte est bornée par la POCHETTE (revenue en petit) d'un côté et par la
     * première commande de l'autre. Les ⏮/⏭ ont disparu du mini : la borne de
     * droite est le bouton PLAY (`data-pastille-basculer`), pas un saut. Mesuré :
     * 8 px de chaque côté — la fenêtre est centrée.
     */
    const image = bord('[data-pastille-vignette]')
    const bouton = bord('[data-pastille-basculer]')
    return ['rang', 'titre'].map((r) => {
      const boite = document.querySelector(`[data-pastille-ligne="${r}"]`)
      /**
       * 🔴 `[data-pastille-piste]`, ET SURTOUT PAS `.titre-pastille`. La classe
       * qui anime n'est posée que pendant le TOUR de la ligne : la chercher
       * faisait déclarer « ne défile pas » à celle qui attendait, et la sonde
       * ne comparait donc qu'une ligne sur deux en se taisant là-dessus. Le
       * repère, lui, existe dès que la boucle est montée.
       */
      const mobile = boite?.querySelector('[data-pastille-piste]')
      const st = mobile ? getComputedStyle(mobile) : null
      return {
        quoi: r,
        texte: boite?.textContent.trim().slice(0, 48) ?? null,
        colonne: boite ? Math.round(boite.clientWidth) : null,
        defile: !!mobile,
        /** Vrai seulement pour celle qui a la main à cet instant. */
        sonTour: !!mobile?.classList.contains('titre-pastille'),
        copies: mobile ? [...mobile.children].map((e) => Math.round(e.getBoundingClientRect().width)) : [],
        piste: mobile ? Math.round(mobile.getBoundingClientRect().width) : null,
        duree: st?.animationDuration ?? null,
        courbe: st?.animationTimingFunction ?? null,
        marcheGauche: boite && image ? Math.round(boite.getBoundingClientRect().left) - image.d : null,
        marcheDroite: boite && bouton ? bouton.g - Math.round(boite.getBoundingClientRect().right) : null,
      }
    })
  })
  console.log(JSON.stringify(lignes, null, 1))

  const griefs = []
  for (const l of lignes) {
    if (!l.texte) {
      griefs.push(`ligne « ${l.quoi} » introuvable`)
      continue
    }
    // ⚠️ Une ligne qui tient entière ne défile pas, et c'est voulu : il n'y a
    // rien à révéler. On ne lui reproche donc rien, on le dit.
    if (!l.defile) {
      console.log(`ligne « ${l.quoi} » : tient dans ${l.colonne} px, ne défile pas`)
      continue
    }
    // ⚠️ La courbe ne se lit que sur celle qui anime : hors tour, il n'y a
    // aucune animation, donc aucune courbe à juger.
    if (l.sonTour && l.courbe !== 'linear')
      griefs.push(`« ${l.quoi} » défile en « ${l.courbe} » : elle hoquette au raccord`)
    if (l.copies.length !== 2)
      griefs.push(`« ${l.quoi} » a ${l.copies.length} exemplaire(s) : un raccord invisible en demande deux`)
    else if (l.copies[0] !== l.copies[1])
      griefs.push(`« ${l.quoi} » : exemplaires de largeurs ${l.copies.join(' et ')}, le raccord sautera`)
    // 🔴 L'INVARIANT : la moitié de la piste vaut un exemplaire, au pixel.
    else if (Math.abs(l.piste - 2 * l.copies[0]) > 1)
      griefs.push(
        `« ${l.quoi} » : piste ${l.piste} px pour deux exemplaires de ${l.copies[0]} — ` +
          `le retour sautera de ${Math.abs(l.piste - 2 * l.copies[0])} px`,
      )
  }
  /**
   * 🔴 LA FENÊTRE EST CENTRÉE, ET UN PIXEL D'ÉCART SUFFIT À LE VOIR. Un texte
   * qui sort au ras de l'image puis s'arrête loin des boutons se lit comme un
   * défaut d'alignement, même sans savoir pourquoi.
   */
  for (const l of lignes) {
    if (l.marcheGauche === null || l.marcheDroite === null) {
      griefs.push(`« ${l.quoi} » : impossible de mesurer ses marges`)
      continue
    }
    if (Math.abs(l.marcheGauche - l.marcheDroite) > 1)
      griefs.push(
        `« ${l.quoi} » n’est pas centrée : ${l.marcheGauche} px de l’illustration, ` +
          `${l.marcheDroite} px des commandes`,
      )
    // ⚠️ Et elles ne doivent pas se refermer : à zéro, le texte toucherait ses
    // deux voisins, ce qui est précisément ce qu'on vient de corriger à gauche.
    if (l.marcheGauche < 3) griefs.push(`« ${l.quoi} » colle à l’illustration (${l.marcheGauche} px)`)
  }

  // 🔴 ET IL FAUT QU'UNE LIGNE AIT LA MAIN, sinon le carrousel est à l'arrêt
  // et personne ne le dirait.
  if (!lignes.some((l) => l.defile)) griefs.push('aucune des deux lignes ne défile : rien n’a été comparé')
  else {
    /**
     * ⚠️ ÇA SE GUETTE, ÇA NE SE CONSTATE PAS. Depuis que la ligne du module
     * est courte, elle n'a rien à faire défiler : pendant SON tour, aucune des
     * deux n'anime. Un relevé instantané tomberait donc régulièrement sur ce
     * creux et accuserait un carrousel qui tourne très bien. Ce qu'il faut
     * prouver, c'est qu'une ligne prend la main **dans un délai**.
     */
    await expect
      .poll(
        () =>
          page.evaluate(() =>
            ['rang', 'titre'].some((r) =>
              document
                .querySelector(`[data-pastille-ligne="${r}"] [data-pastille-piste]`)
                ?.classList.contains('titre-pastille'),
            ),
          ),
        {
          timeout: 15_000,
          message: 'aucune ligne n’a pris la main en 15 s : le carrousel est à l’arrêt',
        },
      )
      .toBe(true)
  }

  expect(griefs, `ce qui cloche :\n  · ${griefs.join('\n  · ')}`).toEqual([])
})

/**
 * ── 🔴 CHACUNE SON TOUR, ET JAMAIS LES DEUX ENSEMBLE ───────────────────────
 *
 * Patrice, le 20 novembre 2026, après avoir vu les deux lignes bouger en même
 * temps : *« et si on met la même vitesse, et dans ce cas elles défilent
 * chacune leur tour en commençant par module, et le tout en boucle »*.
 *
 * 🧭 CE QUE L'ALTERNANCE ACHÈTE : pendant qu'une ligne passe, l'AUTRE EST LE
 * POINT FIXE. Deux lignes mobiles à la fois ne laissent à l'œil aucun endroit
 * où se reposer. C'est donc « jamais les deux ensemble » qu'il faut tenir, pas
 * seulement « les deux bougent ».
 *
 * 🔴 ET C'EST UN MÉCANISME QUI PEUT S'ARRÊTER SANS UN MOT. La main se passe
 * par `animationend`, et une ligne qui n'a rien à faire défiler doit passer
 * son tour explicitement. Si ce passage casse, le carrousel se bloque sur une
 * ligne : tout a l'air normal, une capture d'écran ne montre rien, et l'autre
 * titre ne bouge plus jamais. Seule une sonde qui ATTEND peut le voir.
 *
 * ⚠️ ELLE DURE UNE MINUTE, ET C'EST LE PRIX DU CYCLE. Mesuré : 20 s pour le
 * module, 14 s pour la leçon, deux pauses de 1,4 s — environ 36 s. Échantillonner
 * moins longtemps ne prouverait pas que la main REVIENT.
 */
test('les deux lignes défilent chacune à son tour', async ({ page }) => {
  test.setTimeout(180_000)
  await ouvrirEcoute(page)
  await lancer(page)
  await auModule(page)

  /** Où en est chaque ligne : immobile, ou déplacée de tant de pixels. */
  const ou = () =>
    page.evaluate(() =>
      Object.fromEntries(
        ['rang', 'titre'].map((r) => {
          const e = document.querySelector(`[data-pastille-ligne="${r}"]`)
          const m = e?.querySelector('.titre-pastille')
          if (!m) return [r, null]
          const t = getComputedStyle(m).transform
          return [r, t === 'none' ? 0 : Math.round(Number(t.split(',')[4] || 0))]
        }),
      ),
    )

  const vus = []
  for (let i = 0; i < 26; i++) {
    vus.push({ s: i * 2, ...(await ou()) })
    if (i < 25) await page.waitForTimeout(2_000)
  }
  console.log(JSON.stringify(vus, null, 0).replace(/\},\{/g, '},\n{'))

  // « En mouvement » = déplacée. `null` veut dire qu'elle ne défile pas du tout.
  const bouge = (v) => v !== null && v < -2
  const griefs = []
  /**
   * ── 🔴 CE QU'ON PROUVE A CHANGÉ LE 22 NOVEMBRE 2026 ──────────────────────
   *
   * La ligne du module porte maintenant « Le pourquoi » et non plus
   * « Module 2 · Clarifier son POURQUOI et son projet de vie » : **elle tient
   * dans la colonne, donc elle ne défile plus jamais**. Exiger qu'elle bouge
   * reviendrait à exiger un défaut.
   *
   * 🧭 CE QUI RESTE À PROUVER EST LE VRAI SUJET : que la main CIRCULE. Une
   * ligne qui n'a rien à montrer doit passer son tour, et l'autre le prendre.
   * C'est exactement la panne du 22 novembre — la garde lisait les deux lignes
   * avant que la seconde ait parlé, et tout s'arrêtait sans un mot.
   */
  if (!vus.some((v) => bouge(v.titre))) griefs.push('la ligne de la leçon n’a jamais eu son tour en 50 s')
  const ensemble = vus.filter((v) => bouge(v.rang) && bouge(v.titre))
  if (ensemble.length)
    griefs.push(`les deux lignes bougent en même temps à ${ensemble.map((v) => `${v.s}s`).join(', ')}`)
  /**
   * 🔴 ON COMPTE LES REDÉMARRAGES, ET PAS LES CREUX — et c'est une correction
   * de sonde, pas de produit. Première version : chercher un relevé immobile
   * entre deux mouvements. Elle criait « la main ne revient pas » sur un
   * carrousel qui faisait trois tours : **le creux ne dure que 2,8 s et on
   * relève toutes les 2 s**, si bien qu'on tombait presque toujours sur la
   * dernière image du passage (−434) plutôt que sur l'arrêt.
   *
   * 🧭 CE QUI SE VOIT À COUP SÛR, C'EST LE RETOUR EN ARRIÈRE. Une ligne qui
   * défile ne fait que décroître ; quand elle remonte vers zéro, c'est qu'un
   * nouveau tour a commencé. Deux remontées prouvent que la main est partie
   * ET revenue deux fois, ce qu'un carrousel bloqué ne peut pas feindre.
   */
  let redemarrages = 0
  for (let i = 1; i < vus.length; i++) {
    const a = vus[i - 1].titre
    const b = vus[i].titre
    if (a !== null && b !== null && b > a + 50) redemarrages += 1
  }
  if (redemarrages < 2)
    griefs.push(
      `la leçon n’a redémarré que ${redemarrages} fois en 50 s : la main ne revient pas`,
    )

  expect(griefs, `ce qui cloche :\n  · ${griefs.join('\n  · ')}`).toEqual([])
})

/**
 * ── 🔴 LE TRAIT DIT OÙ ON EN EST, ET NE SE TIRE PLUS ──────────────────────
 *
 * Patrice, le 22 novembre 2026 : *« on a dit qu'on pouvait enlever la boule ;
 * s'il veut avancer, un simple geste pour agrandir en page coûte peu »*.
 *
 * 🔴 CE FICHIER PORTAIT TROIS SONDES POUR CETTE BOULE — qu'on puisse la
 * tirer, qu'elle reste dans sa zone de prise aux deux bouts, que cette zone
 * ne morde pas sur les boutons — plus un fichier entier, `pastille-doigt`,
 * né d'un défaut que la souris ne voyait pas. Tout ça disparaît avec elle.
 *
 * 🧭 ET CE QUI LES REMPLACE N'EST PAS « la boule n'est plus là ». Un contrôle
 * d'absence ne vaut rien tout seul. Ce qui se prouve ici, c'est que la bande
 * du bas a changé de MAIN : elle ne déplace plus la lecture, et le geste de
 * fermeture — qui perdait systématiquement contre la prise du curseur — la
 * gouverne maintenant jusqu'en bas.
 *
 * ⚠️ EN ÉVÉNEMENTS TACTILES RÉELS, par CDP, et c'est l'héritage de
 * `pastille-doigt` : une sonde à la souris y avait laissé passer un vrai
 * défaut, parce qu'un clic emprunte un autre chemin dans le navigateur.
 */
test('le trait dit où on en est, et ne se tire plus', async ({ page }) => {
  await ouvrirEcoute(page)
  await lancer(page)
  await auModule(page)

  const g = await page.evaluate(() => {
    const t = document.querySelector('[data-pastille-progression]')
    const a = document.querySelector('audio')
    const b = t?.getBoundingClientRect()
    return {
      trait: b ? { x: b.x, y: b.y, w: b.width, h: Math.round(b.height) } : null,
      annonce: t ? Number(t.getAttribute('aria-valuenow')) : null,
      role: t?.getAttribute('role') ?? null,
      boule: !!document.querySelector('[data-pastille-boule]'),
      t: a.currentTime,
      d: a.duration,
    }
  })

  const griefs = []
  // 🔴 SANS LE TRAIT, RIEN N'EST ÉPROUVÉ : mieux vaut échouer que passer au
  // vert sur une mesure qui n'a pas eu lieu.
  expect(g.trait, 'aucun trait de progression dans la pastille').toBeTruthy()

  // L'état reste énoncé ; il n'est simplement plus une promesse.
  if (g.role !== 'progressbar') griefs.push(`le trait s’annonce « ${g.role} » et non « progressbar »`)
  if (Math.abs(g.annonce - g.t) > 2)
    griefs.push(`le trait annonce ${g.annonce} s pour un son à ${Math.round(g.t)} s`)
  if (g.boule) griefs.push('la boule est revenue')

  // ── Tirer sur le trait ne déplace plus la lecture, et ferme la pastille.
  const cdp = await page.context().newCDPSession(page)
  const y = g.trait.y + g.trait.h / 2
  const x = g.trait.x + g.trait.w * 0.1
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
  for (const dx of [40, 110, 200, 280]) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx, y }] })
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await page.waitForTimeout(700)

  const apres = await page.evaluate(() => ({
    t: document.querySelector('audio')?.currentTime ?? null,
    pastille: !!document.querySelector('[data-pastille-ecoute]'),
  }))
  console.log(JSON.stringify({ avant: Math.round(g.t), ...apres, duree: Math.round(g.d) }, null, 1))

  /**
   * ⚠️ « N'A PAS SAUTÉ » ET NON « N'A PAS BOUGÉ » : le son continue de jouer
   * pendant le geste, donc il avance de quelques secondes. Ce qu'on refuse,
   * c'est le BOND que produirait un déplacement — ici 70 % de la leçon.
   */
  if (apres.t !== null && Math.abs(apres.t - g.t) > 8)
    griefs.push(`tirer sur le trait a déplacé la lecture de ${Math.round(apres.t - g.t)} s`)
  // 🔴 ET LA BANDE DU BAS A CHANGÉ DE MAIN : le glissement de fermeture, qui
  // perdait contre la prise du curseur, gouverne maintenant jusqu'en bas.
  if (apres.pastille)
    griefs.push('glisser vers la droite depuis le trait n’a pas fermé la pastille')

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

  // 🔴 LE MINI N'A PLUS DE ⏭ (25 novembre 2026) : on laisse la leçon
  // S'ENCHAÎNER sur la suivante en poussant la lecture à sa fin. La leçon qui
  // joue devient alors différente de celle « à reprendre » que le serveur a
  // calculée — c'est tout ce dont ce test a besoin pour éprouver que les liens
  // suivent ce qui JOUE, et non ce que le serveur a figé.
  const avant = await pisteJouee(page)
  await page.evaluate(() => {
    const a = document.querySelector('audio')
    a.currentTime = a.duration - 1.2
  })
  await expect
    .poll(() => page.evaluate(() => document.querySelector('audio')?.currentSrc), { timeout: 30_000 })
    .not.toBe(avant.src)

  const joue = await page.evaluate(() => {
    const s = document.querySelector('audio').currentSrc
    return s.match(/\/api\/lecon\/([^/]+)\//)?.[1] ?? null
  })
  /**
   * 🔴 LA RÈGLE A CHANGÉ DE PORTEUR LE 21 NOVEMBRE 2026, AU SOIR. Elle vivait
   * sur la rangée « Écouter / Lire » de la couverture du module — mais cette
   * rangée **s'efface quand le lecteur réduit joue ce module-là**, parce
   * qu'elle ne dirait plus rien de neuf : la pastille joue déjà, et elle
   * porte « Lire » depuis le même jour.
   *
   * 🧭 CE QUE LA SONDE TIENT N'A PAS BOUGÉ D'UN MOT : les deux entrées
   * doivent mener à la leçon QUI JOUE, pas à celle où le parcours s'est
   * arrêté. C'est l'objet qui les porte qui a changé.
   */
  const liens = await page.evaluate(() =>
    [
      ['Lire', '[data-pastille-lire]'],
      ['Écouter', '[data-pastille-vers-lecon]'],
    ].map(([nom, sel]) => ({ nom, href: document.querySelector(sel)?.getAttribute('href') ?? null })),
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

test('la pastille met en pause, et le glissement met fin', async ({ page }) => {
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
   * ── 🔴 LA CROIX A ÉTÉ RETIRÉE, LE GLISSEMENT RESTE ──────────────────────
   *
   * Patrice, le 21 novembre 2026 : *« les gens connaissent les lecteurs
   * réduits de Deezer, iTunes et Spotify, donc on peut enlever la croix »*.
   * Aucun des trois n'en a.
   *
   * 🧭 MAIS « J'AI FINI » DOIT RESTER DISABLE QUELQUE PART, et c'est tout
   * l'enjeu : plus aucune sortie d'écran n'arrête le son, donc sans un geste
   * de fin la pastille suivrait pour toujours. La sonde éprouve donc la
   * SORTIE, pas le bouton — **glisser vers la droite** — et vérifie qu'elle
   * fait taire le son, pas seulement disparaître la bande.
   */
  /**
   * ⚠️ À LA SOURIS, ET PAS EN ÉVÉNEMENTS TACTILES FABRIQUÉS. Le glissement de
   * la pastille écoute les POINTEURS — c'est écrit dans son fichier, et pour
   * une raison trouvée à la mesure : traîner une image dans un lien annule la
   * séquence par un `pointercancel`. Des `TouchEvent` synthétiques ne
   * produisent aucun événement de pointeur, donc la sonde glissait dans le
   * vide et accusait la pastille de ne pas se fermer.
   */
  const b = await page.locator(PASTILLE).boundingBox()
  await page.mouse.move(b.x + 60, b.y + b.height / 2)
  await page.mouse.down()
  for (let x = 80; x <= 320; x += 20) await page.mouse.move(b.x + x, b.y + b.height / 2)
  await page.mouse.up()

  await expect(page.locator(PASTILLE)).toHaveCount(0, { timeout: 10_000 })
  expect(
    await page.evaluate(() => document.querySelector('audio')?.paused ?? true),
    'le glissement doit aussi faire taire le son',
  ).toBe(true)
})


/**
 * ── 🔴 LA PASTILLE FAIT LA HAUTEUR DE LA BARRE DES LIEUX ───────────────────
 *
 * Patrice, le 22 novembre 2026 au soir : *« tente la hauteur de la bottombar
 * pour la hauteur du lecteur, j'y tiens, on va voir ce que ça donne »*, puis,
 * la capture sous les yeux : **« ça me va »**. La pastille vaut donc **64**.
 *
 * ── 🔴 CETTE SONDE A ÉPINGLÉ TROIS VOISINS EN TROIS JOURS ─────────────────
 *
 * La carte d'entraînement (78) le 20 novembre, la barre d'ACTION (84) le 22 au
 * matin, la barre des LIEUX (64) le 22 au soir. Ce n'est pas de l'hésitation :
 * chaque voisin répondait à une question différente, et c'est la question qui
 * a changé.
 *
 * ⚠️ ET LE 84 AVAIT UNE VRAIE RAISON, QUI EST MAINTENANT UN COÛT ASSUMÉ. Sur
 * la couverture d'un module, la rangée « Écouter / Lire » s'efface quand le
 * lecteur joue ce module, et la pastille se pose exactement à sa place : deux
 * objets au même emplacement devraient faire la même taille. À 64, **ce bas
 * d'écran-là change de vingt pixels** selon qu'on écoute ou non. Patrice l'a
 * su avant de trancher — c'est écrit dans `lecteur-global.tsx`. 🔴 Ne pas
 * « corriger » ce saut en remettant 84 : ce serait défaire une décision.
 *
 * 🧭 ET ON MESURE LÀ OÙ LES DEUX EXISTENT ENSEMBLE. `/parcours` porte la barre
 * des cinq lieux, donc la comparaison de hauteur s'y fait — et c'est aussi là
 * qu'on éprouve les douze pixels, d'une seule visite.
 *
 * ⚠️ LA LARGEUR, ELLE, RESTE COMPARÉE À LA BARRE D'ACTION sur `/gens` : c'est
 * la grammaire d'« Ajouter un contact » — seize de gouttière de chaque côté —
 * et elle n'a pas bougé.
 */
test('la pastille a la hauteur de la barre des lieux, à douze pixels du meuble', async ({ page }) => {
  await ouvrirEcoute(page)
  await lancer(page)
  await auModule(page)
  await page.goto('/gens', { waitUntil: 'domcontentloaded' })
  await page.locator('[data-pastille-ecoute]').waitFor({ state: 'visible', timeout: 15_000 })
  await page.locator('[data-barre-action]').waitFor({ state: 'visible', timeout: 15_000 })
  await page.waitForTimeout(400)

  const m = await page.evaluate(() => {
    const r = (e) => {
      if (!e) return null
      const b = e.getBoundingClientRect()
      return { haut: Math.round(b.height), large: Math.round(b.width), bas: Math.round(b.bottom) }
    }
    const past = document.querySelector('[data-pastille-ecoute]')
    return {
      action: r(document.querySelector('[data-barre-action]')),
      carte: r(past?.querySelector('[data-pastille-carte]')),
    }
  })

  /**
   * 🔴 « COLLÉE » SE MESURE LÀ OÙ IL Y A QUELQUE CHOSE SOUS ELLE, et ce n'est
   * pas la couverture d'un module : elle n'a pas de barre du bas, la pastille
   * s'y pose simplement sur la marge gestuelle. On va donc éprouver le contact
   * à l'étagère.
   */
  /**
   * ⚠️ PAR L'ADRESSE, ET PLUS PAR LA FLÈCHE. On vient de `/gens`, qui n'a
   * aucun « Retour à Apprendre » : `aLEtagere` y attendait un lien qui
   * n'existe pas et expirait au bout d'une minute.
   */
  await page.goto('/parcours', { waitUntil: 'domcontentloaded' })
  await page.locator('[data-pastille-ecoute]').waitFor({ state: 'visible', timeout: 15_000 })
  await page.locator('[data-barre-bas]').waitFor({ state: 'visible', timeout: 15_000 })
  await page.waitForTimeout(400)
  const c = await page.evaluate(() => {
    const past = document.querySelector('[data-pastille-ecoute]')
    const meuble = document.querySelector('[data-barre-bas]')
    const carte = past?.querySelector('[data-pastille-carte]')
    return {
      carteBas: carte ? Math.round(carte.getBoundingClientRect().bottom) : null,
      carteHaut: carte ? Math.round(carte.getBoundingClientRect().height) : null,
      meubleHaut: meuble ? Math.round(meuble.getBoundingClientRect().top) : null,
      meubleEpais: meuble ? Math.round(meuble.getBoundingClientRect().height) : null,
    }
  })
  console.log(JSON.stringify({ ...m, etagere: c }, null, 1))

  const griefs = []
  // 🔴 SANS LA BARRE, CE TEST N'ÉPROUVE RIEN. Mieux vaut échouer que passer au
  // vert sur une comparaison qui n'a pas eu lieu.
  if (!m.action) griefs.push('barre d’action introuvable sur /gens : la comparaison n’a pas eu lieu')
  else if (!m.carte) griefs.push('pastille introuvable sur /gens')
  else {
    /**
     * ⚠️ LA LARGEUR UTILE, ET PLUS LE BORD À BORD. La pastille a cessé d'être
     * un bandeau le 22 novembre : elle est une carte posée dans la gouttière,
     * comme « Ajouter un contact ». Mesuré à 390 px d'écran : barre 390,
     * carte 358 — les mêmes seize de chaque côté.
     */
    if (Math.abs(m.carte.large - (m.action.large - 32)) > 1)
      griefs.push(
        `le lecteur (${m.carte.large}) ne tient pas la largeur utile de la barre ` +
          `(${m.action.large} − 32 = ${m.action.large - 32})`,
      )
  }
  /**
   * ── 🔴 À DOUZE PIXELS DU MEUBLE, ET PLUS COLLÉE — 22 novembre 2026 ───────
   *
   * Elle l'était : le bas de la carte touchait le haut de la barre. Patrice a
   * demandé la grammaire d'« Ajouter un contact » pour les bords, et cette
   * grammaire tient en deux nombres — seize de gouttière, **douze au-dessus
   * du meuble**. Une carte arrondie collée au meuble aurait ses coins du bas
   * rognés par lui : le rayon ne se verrait qu'en haut.
   *
   * 🧭 ET ÇA RÈGLE UN VIEUX LITIGE AU PASSAGE. La boule déborde de 5 px sous
   * la carte ; collée, elle entrait DANS la barre et il fallait prouver
   * qu'elle passait devant. Mesuré depuis : boule à 773, barre à 780 — elles
   * ne se touchent plus. Le contrôle de recouvrement reste, mais il n'a plus
   * d'occasion de servir.
   */
  const SOUS_LA_CARTE = 12
  if (c.meubleHaut === null)
    griefs.push('aucune barre du bas à l’étagère : ni la hauteur ni la distance ne se mesurent ici')
  /**
   * 🔴 LA HAUTEUR SE COMPARE ICI, ET À LA BARRE DES LIEUX. Aucun des deux
   * nombres n'est écrit dans cette sonde : la pastille porte 64 par une
   * constante, la barre par `HAUTEUR_BARRE`, et rien dans le code ne les
   * relie. C'est cette mesure, et elle seule, qui les tient égales.
   */
  if (c.meubleEpais !== null && c.carteHaut !== null && c.carteHaut !== c.meubleEpais)
    griefs.push(
      `hauteurs différentes : pastille ${c.carteHaut}, barre des lieux ${c.meubleEpais}`,
    )
  if (c.meubleHaut !== null && Math.abs(c.meubleHaut - c.carteBas - SOUS_LA_CARTE) > 1)
    griefs.push(
      `la carte finit à ${c.carteBas} pour une barre à ${c.meubleHaut} : ` +
        `${c.meubleHaut - c.carteBas} px au lieu de ${SOUS_LA_CARTE}`,
    )

  /**
   * 🔴 LE CONTRÔLE DE RECOUVREMENT A ÉTÉ RETIRÉ AVEC LA BOULE — 22 nov. 2026.
   *
   * Il prouvait qu'elle passait DEVANT la barre du bas, parce qu'elle
   * débordait de 5 px sous la carte et que les deux partageaient `z-40`. Deux
   * décisions du même jour l'ont vidé de son objet : la boule n'existe plus,
   * et la carte s'est écartée de douze pixels du meuble. Plus rien ne dépasse,
   * donc plus rien à départager.
   */
  expect(griefs, `ce qui cloche :\n  · ${griefs.join('\n  · ')}`).toEqual([])
})

/**
 * ── 🔴 UN VOILE QUI LAISSE UNE CHOSE ALLUMÉE N'EST PAS UN VOILE ────────────
 *
 * Patrice, le 22 novembre 2026, capture à l'appui — les options de lecture
 * ouvertes dans la liseuse, la pastille peinte PAR-DESSUS le panneau :
 * *« le filtre doit passer par-dessus le lecteur également »*.
 *
 * 🧭 ET LA CAUSE ÉTAIT UNE RÈGLE QUI AVAIT SURVÉCU À SA RAISON. La pastille
 * était montée à `z-40` le jour où elle était COLLÉE au meuble : la boule du
 * curseur débordait dessous, il fallait qu'elle passe devant la barre du bas.
 * La boule est partie le matin même et la carte s'est écartée de douze
 * pixels ; il ne restait qu'un nombre qui gagnait contre les feuilles, qui
 * vivent à 39.
 *
 * 🔴 CE QUI SE MESURE N'EST PAS LE `z-index`, C'EST QUI RÉPOND AU DOIGT.
 * Comparer deux nombres ne prouverait rien : un parent qui porte une
 * transformation crée un contexte d'empilement et renverse l'ordre sans que
 * les nombres bougent. `elementFromPoint` suit la peinture réelle — on
 * interroge donc les trois choses qu'on pourrait vouloir toucher dans la
 * pastille, et aucune ne doit répondre.
 *
 * ⚠️ LA PORTE DE LA LISEUSE EST DANS LA PASTILLE. La rangée « Écouter /
 * Lire » de la couverture s'efface quand le lecteur joue ce module-là : on
 * passe par son bouton livre, qui mène à la leçon qu'on écoute.
 */
test('le filtre de lecture passe par-dessus la pastille', async ({ page }) => {
  await ouvrirEcoute(page)
  await lancer(page)
  await auModule(page)

  await page.locator('[data-pastille-lire]').click()
  await page.locator('[data-options-lecture]').waitFor({ state: 'visible', timeout: 20_000 })
  await page.locator(PASTILLE).waitFor({ state: 'visible', timeout: 20_000 })

  await toucher(
    page.locator('[data-options-lecture]'),
    page.locator('[data-options-lecture][aria-expanded="true"]'),
  )
  await page
    .locator('[role="dialog"][aria-label="Options de lecture"]')
    .waitFor({ state: 'visible', timeout: 10_000 })

  /**
   * ⚠️ ON ATTEND QUE LE PANNEAU SOIT ARRIVÉ, et c'est un FAIT qu'on attend,
   * pas un délai. Le panneau monte depuis le bas (`monte`, 240 ms) : mesuré
   * dès qu'il est « visible », il est encore en route, et les points du bas
   * de l'écran rencontrent le voile au lieu de lui. L'assertion tenait quand
   * même — ni l'un ni l'autre n'est la pastille — mais la sonde racontait
   * alors un état qui n'existe qu'un quart de seconde.
   */
  await page.waitForFunction(
    () =>
      document
        .querySelector('[role="dialog"][aria-label="Options de lecture"]')
        ?.getAnimations()
        .every((a) => a.playState === 'finished') ?? false,
    null,
    { timeout: 10_000 },
  )

  const v = await page.evaluate(() => {
    const plan = (s) => {
      const e = document.querySelector(s)
      return e ? getComputedStyle(e).zIndex : null
    }
    const points = [
      ['le titre', '[data-pastille-colonne]'],
      ['le bouton livre', '[data-pastille-lire]'],
      ['le trait de progression', '[data-pastille-progression]'],
    ].map(([nom, sel]) => {
      const c = document.querySelector(sel)
      const b = c?.getBoundingClientRect()
      if (!b?.width) return { nom, absent: true }
      const e = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)
      return {
        nom,
        dansLaPastille: !!e?.closest('[data-pastille-ecoute]'),
        // Ce qu'on rencontre à sa place : le voile, ou le panneau s'il couvre
        // déjà ce point.
        voile: e?.getAttribute('aria-label') === 'Fermer',
        panneau: !!e?.closest('[role="dialog"]'),
        rencontre: e ? e.tagName.toLowerCase() : null,
      }
    })
    return {
      points,
      planPastille: plan('[data-pastille-ecoute]'),
      planVoile: plan('button[aria-label="Fermer"]'),
      planPanneau: plan('[role="dialog"][aria-label="Options de lecture"]'),
    }
  })
  console.log(JSON.stringify(v, null, 1))

  const griefs = []
  // 🔴 SANS LES TROIS CIBLES, RIEN N'EST ÉPROUVÉ : une sonde qui parcourt une
  // liste vide passe au vert sans avoir rencontré son sujet.
  for (const p of v.points) {
    if (p.absent) griefs.push(`${p.nom} est introuvable dans la pastille : rien n’a été mesuré là`)
    else if (p.dansLaPastille) griefs.push(`${p.nom} répond encore au doigt : le voile ne le couvre pas`)
    else if (!p.voile && !p.panneau)
      griefs.push(`à la place de ${p.nom} on rencontre un <${p.rencontre}>, ni le voile ni le panneau`)
  }

  expect(griefs, `ce qui cloche :\n  · ${griefs.join('\n  · ')}`).toEqual([])
})
