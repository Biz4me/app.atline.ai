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

  const chevron = await chip.locator('svg').evaluate((s) => {
    const c = getComputedStyle(s)
    return { transform: c.transform, rotate: c.rotate }
  })
  expect(
    !chevron.transform.startsWith('matrix(-1, 0, 0, -1') && parseFloat(chevron.rotate) !== 180,
    `le chevron reste inversé après la fermeture : ${JSON.stringify(chevron)}`,
  ).toBe(true)
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
