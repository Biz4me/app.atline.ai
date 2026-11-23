// LE PANNEAU DE L'ACTIVITÉ — descend-il de sous la barre, et remonte-t-il ?
//
// Patrice, le 22 novembre 2026 : *« je veux une barre qui descend dans la
// grammaire de celle de la liseuse, qui descend ce coup, et c'est le chevron du
// switcher qui s'inverse — donc en recliquant sur le switcher ça remonte. Aussi
// il remonte en plus au geste, donc pas de texte "fermer". »*
//
// 🔴 CHAQUE CLAUSE DE CETTE PHRASE EST UNE MESURE ICI, et aucune n'est un
// jugement sur une capture. Ce qui se mesure, ce n'est pas le `z-index` : c'est
// **qui répond au doigt** — leçon payée le matin même sur le voile du lecteur.
//
//   E2E_BASE=https://v2.atline.ai E2E_COMME=test1@gmail.com \
//     npx playwright test tests/panneau-activite.spec.cjs

const { test, expect } = require('../fixtures.cjs')
const { lancer, ouvrirEcoute } = require('../son.cjs')

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

const CHIP = 'button:has([data-activite-nom])'
const PANNEAU = '[data-panneau]'

/** Ouvre l'accueil et rend la poignée du sélecteur, prête à être touchée. */
async function auSelecteur(page) {
  await page.goto('/accueil', { waitUntil: 'domcontentloaded' })
  const chip = page.locator(CHIP)
  await chip.waitFor({ state: 'visible', timeout: 20_000 })
  return chip
}

/**
 * 🔴 ON TERMINE LES ANIMATIONS AVANT DE MESURER. Le panneau descend en 0,24 s ;
 * mesuré pendant, son bord haut est au-dessus de la barre et tout paraît faux.
 * J'ai déjà failli corriger un défaut qui n'existait pas pour cette raison.
 */
async function animationsFinies(page) {
  await page.waitForFunction(
    () =>
      document
        .querySelectorAll('[data-panneau], [data-panneau] ~ *, [aria-label="Fermer"]')
        .length > 0 &&
      [...document.getAnimations()].every((a) => {
        try {
          return a.playState === 'finished' || a.playState === 'idle'
        } catch {
          return true
        }
      }),
    null,
    { timeout: 10_000 },
  )
}

test('le panneau descend de sous la barre, et laisse le switcher allumé', async ({ page }) => {
  const chip = await auSelecteur(page)

  /**
   * ── 🔴 ON MESURE L'EFFET, PAS UNE PROPRIÉTÉ CHOISIE D'AVANCE ──────────────
   *
   * Première version : `getComputedStyle(svg).transform`. Elle rendait `none`
   * sur un chevron bel et bien retourné — **Tailwind v4 écrit `rotate-180` dans
   * la propriété `rotate`**, pas dans `transform`. La sonde dénonçait un défaut
   * qui n'existait pas, et elle aurait dénoncé le même sur une rotation écrite
   * à la main dans l'autre propriété.
   *
   * 🧭 Une sonde qui nomme la propriété au lieu de l'effet se trompe de cible.
   */
  const tourne = (s) => {
    const c = getComputedStyle(s)
    const demiTour =
      c.transform.startsWith('matrix(-1, 0, 0, -1') || parseFloat(c.rotate) === 180
    return { demiTour, transform: c.transform, rotate: c.rotate, suivi: c.transitionProperty }
  }

  // ── Avant : le chevron ne doit PAS être tourné.
  const avant = await chip.locator('svg').evaluate(tourne)

  await chip.click()
  await page.locator(PANNEAU).waitFor({ state: 'visible', timeout: 10_000 })
  await animationsFinies(page)

  const m = await page.evaluate(() => {
    const barre = document.querySelector('[data-barre-haut]')
    const panneau = document.querySelector('[data-panneau]')
    const voile = document.querySelector('[aria-label="Fermer"]')
    const bas = document.querySelector('nav[aria-label="Navigation principale"]')
    const chip = document.querySelector('button:has([data-activite-nom])')
    const chevron = chip?.querySelector('svg')
    const r = (e) => (e ? e.getBoundingClientRect() : null)
    const b = r(barre)
    const p = r(panneau)
    const v = r(voile)
    const n = r(bas)
    const c = r(chip)
    /**
     * 🔴 LA SEULE PREUVE QUI VAILLE POUR « ÇA SE RECLIQUE » : qui répond au
     * doigt au centre de la pastille. Un `z-index` lu ne dit rien de l'ordre
     * de peinture réel — un parent transformé renverse tout sans qu'aucun
     * nombre ne change.
     */
    const aucentre = c ? document.elementFromPoint(c.x + c.width / 2, c.y + c.height / 2) : null
    return {
      barreBas: b ? Math.round(b.bottom) : null,
      panneauHaut: p ? Math.round(p.top) : null,
      panneauBas: p ? Math.round(p.bottom) : null,
      voileHaut: v ? Math.round(v.top) : null,
      barreDuBasHaut: n ? Math.round(n.top) : null,
      filet: panneau ? getComputedStyle(panneau).borderBottomWidth : null,
      flou: panneau ? getComputedStyle(panneau).backdropFilter : null,
      chevron: chevron
        ? (() => {
            const c = getComputedStyle(chevron)
            return {
              demiTour:
                c.transform.startsWith('matrix(-1, 0, 0, -1') || parseFloat(c.rotate) === 180,
              transform: c.transform,
              rotate: c.rotate,
              suivi: c.transitionProperty,
            }
          })()
        : null,
      rendLaMain: !!(aucentre && chip && chip.contains(aucentre)),
      texteFermer: [...(panneau?.querySelectorAll('*') ?? [])].some(
        (e) => e.children.length === 0 && e.textContent.trim() === 'Fermer',
      ),
    }
  })
  console.log(JSON.stringify(m, null, 1))

  const griefs = []
  if (m.panneauHaut === null) griefs.push('aucun panneau mesuré : rien n’est prouvé')
  if (m.barreBas === null) griefs.push('la barre du haut ne porte pas `data-barre-haut`')

  // ① Il sort de SOUS la barre du haut : son bord haut est le bas de la barre.
  if (Math.abs(m.panneauHaut - m.barreBas) > 1)
    griefs.push(`le panneau commence à ${m.panneauHaut} alors que la barre finit à ${m.barreBas}`)

  // ② Le voile part du même endroit : sinon il couvrirait le switcher.
  if (Math.abs(m.voileHaut - m.barreBas) > 1)
    griefs.push(`le voile commence à ${m.voileHaut} au lieu de ${m.barreBas}`)

  // ③ Et la preuve qui compte : la pastille répond encore au doigt.
  if (!m.rendLaMain) griefs.push('le switcher ne répond plus au doigt : impossible de recliquer')

  // ④ Il n'atteint jamais le meuble du bas — la sortie reste allumée.
  if (m.panneauBas > m.barreDuBasHaut)
    griefs.push(`le panneau descend à ${m.panneauBas}, sous la barre du bas à ${m.barreDuBasHaut}`)

  // ⑤ L'habillage de la liseuse : un filet et un flou.
  if (m.filet === '0px') griefs.push('le panneau n’a pas de filet en bas')
  if (!m.flou || m.flou === 'none') griefs.push('le panneau n’a pas le flou de la barre du bas')

  // ⑥ Le chevron s'inverse, et il ne l'était pas avant.
  if (avant.demiTour) griefs.push('le chevron était déjà tourné avant l’ouverture')
  if (!m.chevron) griefs.push('aucun chevron dans la pastille : rien n’est mesuré')
  else if (!m.chevron.demiTour)
    griefs.push(
      `le chevron n’est pas inversé — transform ${m.chevron.transform}, rotate ${m.chevron.rotate}`,
    )
  // ⚠️ ET LE DEMI-TOUR DOIT ÊTRE SUIVI, sinon il claque. `transition-transform`
  // ne couvre `rotate` que si Tailwind l'a bien listée : on le vérifie plutôt
  // que de le supposer.
  else if (!/rotate|transform|all/.test(m.chevron.suivi))
    griefs.push(`le demi-tour n’est pas animé : la transition suit « ${m.chevron.suivi} »`)

  // ⑦ Aucun texte « Fermer ».
  if (m.texteFermer) griefs.push('le panneau porte encore un texte « Fermer »')

  expect(griefs, griefs.join('\n  · ')).toEqual([])
})

test('recliquer sur le switcher le fait remonter', async ({ page }) => {
  const chip = await auSelecteur(page)
  await chip.click()
  await page.locator(PANNEAU).waitFor({ state: 'visible', timeout: 10_000 })
  await animationsFinies(page)

  // 🔴 LE MÊME BOUTON, PAS UNE SORTIE AILLEURS. C'est la bascule qu'il a
  // demandée : si le voile l'avait recouvert, ce clic atterrirait sur le voile
  // — qui referme aussi, et le test passerait au vert pour la mauvaise raison.
  // D'où le contrôle d'`elementFromPoint` du test précédent, qui tranche QUI
  // reçoit le doigt avant qu'on ne conclue.
  await chip.click()
  await expect(page.locator(PANNEAU)).toHaveCount(0, { timeout: 10_000 })

  /**
   * ── 🔴 ON ATTEND LA FIN DU DEMI-TOUR, ON NE LE LIT PAS AU VOL ─────────────
   *
   * Première version : une lecture unique juste après la disparition du
   * panneau. Elle a tenu trois fois puis dénoncé *« le chevron reste inversé :
   * rotate 180deg »* sur une app parfaitement juste — React avait bien retiré
   * la classe, mais la **transition de 200 ms n'avait pas encore avancé d'un
   * degré**, donc la valeur calculée valait encore exactement 180.
   *
   * 🧭 C'est le même piège que la mesure prise pendant la montée du panneau,
   * payé deux fois dans la même journée : **une valeur animée n'a pas de
   * valeur à un instant**, elle en a une à la fin. On interroge donc jusqu'à
   * ce qu'elle soit revenue, au lieu de la surprendre.
   *
   * ⚠️ Et c'est une attente sur un FAIT, pas un délai : si le chevron ne
   * revient jamais, la sonde échoue quand même.
   */
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const s = document.querySelector('button:has([data-activite-nom]) svg')
          if (!s) return null
          const c = getComputedStyle(s)
          return c.transform.startsWith('matrix(-1, 0, 0, -1') || parseFloat(c.rotate) === 180
        }),
      { timeout: 5_000, message: 'le chevron reste inversé après la fermeture' },
    )
    .toBe(false)
})

test('il remonte aussi au geste vers le haut', async ({ page }) => {
  const chip = await auSelecteur(page)
  await chip.click()
  await page.locator(PANNEAU).waitFor({ state: 'visible', timeout: 10_000 })
  await animationsFinies(page)

  /**
   * ⚠️ LE GESTE NE PART QUE DU BAS DE CE QUI DÉFILE — c'est la règle écrite
   * dans le composant, le miroir de celle de la liseuse. Le test l'HONORE au
   * lieu de la contourner : si le panneau défile, on descend d'abord.
   */
  const boite = await page.evaluate(() => {
    const p = document.querySelector('[data-panneau]')
    if (!p) return null
    p.scrollTop = p.scrollHeight
    const r = p.getBoundingClientRect()
    return {
      x: Math.round(r.x + r.width / 2),
      bas: Math.round(r.bottom),
      hauteur: Math.round(r.height),
      defile: p.scrollHeight > p.clientHeight + 2,
    }
  })
  expect(boite, 'aucun panneau à pousser').toBeTruthy()
  console.log(JSON.stringify(boite, null, 1))

  // On attrape le bord du bas, là où vit la poignée, et on pousse vers le haut
  // sur plus du quart de sa hauteur.
  const cdp = await page.context().newCDPSession(page)
  const x = boite.x
  const y0 = boite.bas - 8
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y0 }] })
  for (const part of [0.1, 0.25, 0.45, 0.7, 0.9]) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x, y: Math.round(y0 - boite.hauteur * part) }],
    })
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })

  await expect(page.locator(PANNEAU)).toHaveCount(0, { timeout: 10_000 })
})

/**
 * ── 🔴 LA BUTÉE : IL S'ARRÊTE SUR LE MEUBLE LE PLUS HAUT ───────────────────
 *
 * Patrice : *« quand le menu activité descend, il vient en butée du lecteur
 * quand il y a le lecteur, et en butée de la bottombar quand il n'y a pas le
 * lecteur »*.
 *
 * 🔴 ET C'ÉTAIT UN DÉFAUT LIVRÉ : la hauteur maximale soustrayait la barre du
 * bas **écrite en dur**, donc avec le lecteur affiché le panneau lui passait
 * dessus. Cette sonde existe parce qu'un nombre recopié ne connaît pas les
 * meubles qui arrivent après lui.
 *
 * 🧭 ELLE MESURE LES DEUX CAS DANS LE MÊME PASSAGE, et c'est le point : une
 * seule règle doit les couvrir. Sans lecteur, le panneau bute sur la barre ;
 * avec, sur le lecteur — et aucune des deux mesures n'est écrite dans la
 * sonde, les deux sont relevées sur l'écran.
 */
test('le panneau bute sur le lecteur, et sur la barre quand il n’y en a pas', async ({ page }) => {
  // ── Sans lecteur : il doit s'arrêter sur la barre des lieux.
  const chip = await auSelecteur(page)
  await chip.click()
  await page.locator(PANNEAU).waitFor({ state: 'visible', timeout: 10_000 })
  await animationsFinies(page)
  const sans = await page.evaluate(() => {
    const p = document.querySelector('[data-panneau]')
    const b = document.querySelector('nav[aria-label="Navigation principale"]')
    return {
      /**
       * 🔴 CE QU'ON COMPARE EST UN BAS, PAS UNE HAUTEUR. Première version :
       * `maxHeight` contre l'ordonnée du meuble — 715 contre 780, et la sonde
       * criait sur une app juste. Le panneau commence à 65 : **65 + 715 = 780**,
       * pile le haut de la barre. 🧭 Un plafond ne se compare qu'à une
       * distance, jamais à une position.
       */
      bas: Math.round(p.getBoundingClientRect().top + parseFloat(getComputedStyle(p).maxHeight)),
      plafond: Math.round(parseFloat(getComputedStyle(p).maxHeight)),
      meuble: Math.round(b.getBoundingClientRect().top),
      lecteur: !!document.querySelector('[data-pastille-ecoute]'),
    }
  })
  console.log('SANS LECTEUR :', JSON.stringify(sans))

  // ── Avec lecteur : il doit s'arrêter sur LUI, plus haut.
  await ouvrirEcoute(page)
  await lancer(page)
  await page.goto('/accueil', { waitUntil: 'domcontentloaded' })
  await page.locator('[data-pastille-ecoute]').waitFor({ state: 'visible', timeout: 20_000 })
  const chip2 = page.locator(CHIP)
  await chip2.waitFor({ state: 'visible', timeout: 20_000 })
  await chip2.click()
  await page.locator(PANNEAU).waitFor({ state: 'visible', timeout: 10_000 })
  await animationsFinies(page)
  const avec = await page.evaluate(() => {
    const p = document.querySelector('[data-panneau]')
    const l = document.querySelector('[data-pastille-ecoute]')
    const b = document.querySelector('nav[aria-label="Navigation principale"]')
    return {
      bas: Math.round(p.getBoundingClientRect().top + parseFloat(getComputedStyle(p).maxHeight)),
      plafond: Math.round(parseFloat(getComputedStyle(p).maxHeight)),
      lecteurHaut: Math.round(l.getBoundingClientRect().top),
      meuble: Math.round(b.getBoundingClientRect().top),
      placePubliee: getComputedStyle(document.documentElement)
        .getPropertyValue('--pastille-haut')
        .trim(),
    }
  })
  console.log('AVEC LECTEUR :', JSON.stringify(avec))

  const griefs = []
  if (sans.lecteur) griefs.push('un lecteur traînait déjà : le premier cas n’a pas été mesuré')
  // ① Sans lecteur, le panneau ne peut pas descendre plus bas que la barre.
  if (Math.abs(sans.bas - sans.meuble) > 1)
    griefs.push(`sans lecteur, il peut descendre à ${sans.bas} et la barre est à ${sans.meuble}`)
  // ② Avec lecteur, il bute sur LUI — donc plus haut que la barre.
  if (Math.abs(avec.bas - avec.lecteurHaut) > 1)
    griefs.push(`avec lecteur, il peut descendre à ${avec.bas} et le lecteur est à ${avec.lecteurHaut}`)
  // ③ Et la différence n'est pas nulle : sinon la règle n'aurait rien changé.
  if (avec.plafond >= sans.plafond)
    griefs.push(`le lecteur n’a pas relevé le plancher : ${sans.plafond} → ${avec.plafond}`)

  expect(griefs, `ce qui cloche :\n  · ${griefs.join('\n  · ')}`).toEqual([])
})
