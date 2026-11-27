// LE GESTE VERS LE BAS RÉDUIT LE LECTEUR, COMME LE CHEVRON.
//
//   E2E_BASE=https://v2.atline.ai npx playwright test tests/geste-descendre.spec.cjs
//
// Patrice, le 21 novembre 2026 : *« le geste sur la page audio qui va vers le
// bas fait la même chose que le chevron qui réduit le lecteur ; comme ça on a
// un geste ET un clic »*.
//
// 🧭 ET C'EST « LA MÊME CHOSE » QUI SE MESURE, pas « ça marche ». Un geste qui
// arrive au bon endroit par un autre chemin — `replace` au lieu de `push` —
// passerait un test d'arrivée et laisserait un historique différent : le
// retour du téléphone n'aurait alors pas le même effet selon la façon dont on
// est sorti. On compare donc les deux sorties, pas seulement la destination.
//
// ⚠️ ET ON ÉPROUVE AUSSI CE QUI DOIT **NE PAS** DÉCLENCHER. Un geste qui part
// trop tôt est pire que pas de geste : il referme la page sous le doigt de
// quelqu'un qui voulait feuilleter les couvertures.
const { test, expect } = require('../fixtures.cjs')

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

// 🔬 LE PLI FINIT SUR LA PASTILLE (27 nov.), pas en ligne fine au ras du meuble.
// Ces trois nombres sont ceux de `geste-descendre.tsx` : la carte de la pastille
// fait 48 px (`h-12`) et flotte à `INTERSTICE` (8 px) au-dessus du meuble. Le pli
// s'arrête donc sur un rectangle de 48 px dont le bas est à `sol + INTERSTICE`,
// et la carte prend le relais sans saut. Avant, le bas montait jusqu'au meuble
// (`sol`) : la feuille se refermait sur ~17 px — « le trait vert fin avant la
// pastille » que Patrice voyait.
const HAUTEUR_PASTILLE = 48
const INTERSTICE = 8
const RESERVE = HAUTEUR_PASTILLE + INTERSTICE

/**
 * Glisser du doigt, en vrais événements tactiles.
 *
 * ⚠️ `lenteur` EXISTE POUR UNE RAISON PRÉCISE. Depuis que la réduction tient
 * au doigt, elle part aussi sur l'ÉLAN — et des événements envoyés dans une
 * boucle serrée ont un élan énorme, donc tout partirait. Un geste lent se
 * mesure en espaçant les pas, comme un vrai pouce.
 */
const glisser = (page, { de, vers, pas = 10, lenteur = 0 }) =>
  page.evaluate(
    async ({ de, vers, pas, lenteur }) => {
      const cible = document.elementFromPoint(de.x, de.y) || document.body
      const doigt = (x, y) =>
        new Touch({ identifier: 1, target: cible, clientX: x, clientY: y })
      const envoyer = (type, x, y) =>
        cible.dispatchEvent(
          new TouchEvent(type, {
            bubbles: true,
            cancelable: true,
            touches: type === 'touchend' ? [] : [doigt(x, y)],
            targetTouches: type === 'touchend' ? [] : [doigt(x, y)],
            changedTouches: [doigt(x, y)],
          }),
        )
      envoyer('touchstart', de.x, de.y)
      for (let i = 1; i <= pas; i++) {
        envoyer(
          'touchmove',
          de.x + ((vers.x - de.x) * i) / pas,
          de.y + ((vers.y - de.y) * i) / pas,
        )
        if (lenteur) await new Promise((r) => setTimeout(r, lenteur))
      }
      envoyer('touchend', vers.x, vers.y)
      // Le temps que la course finisse (220 ms) et que la page suive.
      await new Promise((r) => setTimeout(r, 420))
    },
    { de, vers, pas, lenteur },
  )

const ouvrirEcoute = async (page) => {
  await page.goto('/parcours', { waitUntil: 'domcontentloaded' })
  const href = await page.locator('a[data-module="2"]').getAttribute('href')
  await page.goto(href, { waitUntil: 'domcontentloaded' })
  // ⚠️ DEUX PORTES : la rangée « Écouter » s'efface quand le lecteur réduit
  // joue déjà ce module, et c'est alors la pastille qui ramène à la leçon.
  const ecouter = page.getByRole('link', { name: 'Écouter' })
  const pastille = page.locator('[data-pastille-vers-lecon]')
  await expect
    .poll(async () => (await ecouter.count()) + (await pastille.count()), { timeout: 20_000 })
    .toBeGreaterThan(0)
  await ((await ecouter.count()) ? ecouter : pastille).first().click()
  await expect(page.locator('[data-titre-ecoute]')).toBeVisible({ timeout: 20_000 })
  await page.waitForTimeout(700)
  return href
}

test('le geste vers le bas sort exactement comme le chevron', async ({ page, pageErrors }) => {
  test.setTimeout(300_000)
  const griefs = []

  // ── 1. Le chevron, pour savoir ce que « la même chose » veut dire.
  const couverture = await ouvrirEcoute(page)
  const avant = await page.evaluate(() => history.length)
  /**
   * ⚠️ LE CHEVRON PAR SON INTITULÉ, pas par son adresse. `a[href="/parcours/…"]`
   * attrape aussi **la couverture courante du carrousel**, qui mène au même
   * endroit — et depuis qu'il y a deux écrans montés, elle vient en premier.
   * La sonde cliquait une image dans un rail horizontal et expirait.
   */
  await page.getByLabel(/^Retour au module/).first().click()
  await expect.poll(() => new URL(page.url()).pathname, { timeout: 20_000 }).toBe(couverture)
  const parLeChevron = (await page.evaluate(() => history.length)) - avant

  // ── 2. Le geste.
  await ouvrirEcoute(page)
  const avant2 = await page.evaluate(() => history.length)
  await glisser(page, { de: { x: 195, y: 300 }, vers: { x: 195, y: 700 } })
  await expect
    .poll(() => new URL(page.url()).pathname, { timeout: 20_000 })
    .toBe(couverture)
  const parLeGeste = (await page.evaluate(() => history.length)) - avant2

  console.log(`  historique · chevron +${parLeChevron} · geste +${parLeGeste}`)
  if (parLeChevron !== parLeGeste)
    griefs.push(
      `le geste laisse un autre historique que le chevron (+${parLeGeste} contre +${parLeChevron})`,
    )

  // ── 3. Ce qui ne doit PAS sortir.
  await ouvrirEcoute(page)
  const ici = new URL(page.url()).pathname

  // Un glissement horizontal : c'est le carrousel, pas la sortie.
  await glisser(page, { de: { x: 250, y: 230 }, vers: { x: 100, y: 250 } })
  await page.waitForTimeout(400)
  if (new URL(page.url()).pathname !== ici)
    griefs.push('un glissement horizontal a refermé la page')

  // Un frôlement de 40 px : sous le minimum, quelle que soit sa vivacité.
  await page.goto(ici, { waitUntil: 'domcontentloaded' })
  await page.locator('[data-titre-ecoute]').waitFor({ state: 'visible', timeout: 20_000 })
  await page.waitForTimeout(500)
  await glisser(page, { de: { x: 195, y: 430 }, vers: { x: 195, y: 470 } })
  if (new URL(page.url()).pathname !== ici)
    griefs.push('un frôlement de 40 px a refermé la page')

  /**
   * 🔴 LÂCHÉ AVANT LE QUART, L'ÉCRAN REMONTE. Patrice : *« si je la lâche
   * avant le quart à partir du haut elle remonte, sinon elle continue »*.
   * ⚠️ LENTEMENT, SINON ON MESURE L'AUTRE RÈGLE : un geste rapide part sur
   * l'élan, et la sonde croirait avoir éprouvé la distance.
   */
  await glisser(page, { de: { x: 195, y: 300 }, vers: { x: 195, y: 450 }, pas: 12, lenteur: 40 })
  if (new URL(page.url()).pathname !== ici)
    griefs.push('lâché à 150 px — moins du quart — l’écran est quand même parti')
  const remonte = await page.evaluate(
    () => getComputedStyle(document.querySelector('[data-coquille]')).transform,
  )
  if (remonte !== 'none' && !/matrix\(1, 0, 0, 1, 0, 0\)/.test(remonte))
    griefs.push(`l’écran n’est pas remonté : transform ${remonte}`)

  // Et la feuille des options garde ses gestes.
  await page.locator('[data-options-ecoute]').click()
  await page.waitForTimeout(500)
  await glisser(page, { de: { x: 195, y: 700 }, vers: { x: 195, y: 830 } })
  await page.waitForTimeout(400)
  if (new URL(page.url()).pathname !== ici)
    griefs.push('un geste dans la feuille ouverte a refermé la page')

  /**
   * ── 🔴 4. LE REPLI : LA BARRE NE BOUGE PAS, LES DEUX BORDS SE REJOIGNENT ──
   *
   * Patrice, le 22 novembre 2026 : *« la bottom reste fixe et visible ;
   * pendant que le haut descend, le bas remonte jusqu'au-dessus de la
   * bottombar »*.
   *
   * 🧭 CE QUI SE MESURE EST LA FORME, PAS L'ARRIVÉE. Les trois sections
   * au-dessus prouvent qu'on sort, et sortiraient aussi vertes si l'écran
   * partait d'un bloc par le bas — ce qu'il faisait avant, et que Patrice a
   * refusé. La phrase porte sur ce qu'on VOIT pendant le geste, donc on relève
   * le masque et la position du meuble à chaque profondeur.
   *
   * ⚠️ ET LE RELEVÉ SE FAIT DANS LA PAGE. Sortir de `evaluate` entre deux pas
   * relâcherait le doigt : le geste est un seul fil, la sonde doit l'être
   * aussi.
   */
  await ouvrirEcoute(page)
  const releve = await page.evaluate(async () => {
    const x = 195
    const y0 = 300
    const cible = document.elementFromPoint(x, y0) || document.body
    const doigt = (y) => new Touch({ identifier: 1, target: cible, clientX: x, clientY: y })
    const envoyer = (type, y) =>
      cible.dispatchEvent(
        new TouchEvent(type, {
          bubbles: true,
          cancelable: true,
          touches: type === 'touchend' ? [] : [doigt(y)],
          targetTouches: type === 'touchend' ? [] : [doigt(y)],
          changedTouches: [doigt(y)],
        }),
      )
    /** Le meuble qui RESTE : celui du module, derrière la feuille. */
    const derriere = () => {
      const f = document.querySelector('[data-feuille-ecoute]')
      return [...document.querySelectorAll('[data-barre-bas]')].find((e) => !f?.contains(e))
    }
    const b0 = derriere()
    const sol = b0 ? Math.round(innerHeight - b0.getBoundingClientRect().top) : 0
    const nombres = (s) => (s.match(/-?[\d.]+/g) ?? []).map(Number)

    const pas = []
    envoyer('touchstart', y0)
    for (const dy of [60, 195, 400, 700]) {
      envoyer('touchmove', y0 + dy)
      await new Promise((r) => setTimeout(r, 40))
      const f = document.querySelector('[data-feuille-ecoute]')
      const b = derriere()
      pas.push({
        dy,
        masque: f ? nombres(getComputedStyle(f).clipPath) : null,
        barre: b ? Math.round(b.getBoundingClientRect().top) : null,
      })
    }
    // 🔴 ET LE PLI COMPLET : poussé à fond, il doit finir SUR LA PASTILLE — un
    // rectangle de 48 px au bas de l'écran — et NON se refermer en ligne fine au
    // ras du meuble (« le trait vert fin avant la pastille », 27 nov.). On ne
    // relâche pas ici : touchend reste au départ, donc rien ne navigue.
    envoyer('touchmove', y0 + innerHeight)
    await new Promise((r) => setTimeout(r, 40))
    const fFond = document.querySelector('[data-feuille-ecoute]')
    const profond = fFond ? nombres(getComputedStyle(fFond).clipPath) : null
    // Ce qui reste VISIBLE dans la fente au pli complet : on doit y voir les
    // commandes du lecteur, JAMAIS la topbar du plein (chevron « Retour au
    // module » + options). On liste les éléments dont la boîte coupe la fente.
    let dansLaFente = []
    if (profond && fFond) {
      const hautF = profond[0]
      const basF = innerHeight - profond[2]
      const vus = new Set()
      for (const e of fFond.querySelectorAll('*')) {
        const r = e.getBoundingClientRect()
        if (r.width < 6 || r.height < 6) continue
        if (r.bottom > hautF + 4 && r.top < basF - 4) {
          const sig = (e.getAttribute('aria-label') || e.textContent?.trim() || e.tagName).slice(0, 28)
          if (sig && !vus.has(sig)) {
            vus.add(sig)
            dansLaFente.push(sig)
          }
        }
      }
      dansLaFente = dansLaFente.slice(0, 10)
    }

    // On RELÂCHE AU POINT DE DÉPART : la sonde mesure la forme, pas la sortie
    // — qui est déjà prouvée plus haut. Sans ça elle partirait, et les
    // sections suivantes travailleraient sur un autre écran.
    envoyer('touchmove', y0)
    envoyer('touchend', y0)
    await new Promise((r) => setTimeout(r, 400))
    return { sol, pas, profond, dansLaFente, largeur: innerWidth, hauteur: innerHeight }
  })

  const course = releve.hauteur - releve.sol
  for (const p of releve.pas) {
    const [haut, , bas] = p.masque ?? []
    // Le bord haut est au doigt.
    if (Math.abs(haut - p.dy) > 2) griefs.push(`à ${p.dy} px, le bord haut est à ${haut}`)
    // Le bord bas a dégagé le meuble dès le quart, et attend ensuite AU BAS DE
    // LA PASTILLE (`sol + INTERSTICE`) — pas au ras du meuble : c'est là que la
    // carte prend le relais, et c'est ce qui tue le trait vert fin.
    const cible = releve.sol + INTERSTICE
    const attendu = Math.min(cible, (cible * p.dy) / (course * 0.25))
    if (Math.abs(bas - attendu) > 2)
      griefs.push(`à ${p.dy} px, le bord bas est à ${bas} au lieu de ${Math.round(attendu)}`)
    // Et le meuble n'a pas bougé d'un pixel.
    if (p.barre !== releve.pas[0].barre)
      griefs.push(`la barre du module a bougé pendant le repli : ${p.barre}`)
  }
  console.log(
    `  repli · sol ${releve.sol} · ${releve.pas
      .map((p) => `${p.dy}→[${p.masque?.[0]},${p.masque?.[2]}]`)
      .join(' ')} · barre fixe à ${releve.pas[0].barre}`,
  )

  // 🔴 LE PLI COMPLET FINIT SUR LA PASTILLE, PAS EN LIGNE FINE. C'est la sonde
  // qui garde le défaut que Patrice a vu : le haut s'arrête à `course - RESERVE`,
  // le bas à `sol + INTERSTICE`, et ce qui reste visible fait 48 px — la carte,
  // pas un trait.
  if (releve.profond) {
    const [haut, cote, bas] = releve.profond
    const visible = releve.hauteur - haut - bas
    const margeH = (releve.largeur - Math.min(releve.largeur, 430)) / 2 + 16
    console.log(
      `  pli complet · masque [${haut}, ${cote}, ${bas}] · visible ${visible}px · fente: ${releve.dansLaFente.join(' | ')}`,
    )
    if (Math.abs(haut - (course - RESERVE)) > 2)
      griefs.push(`pli complet : bord haut à ${haut} au lieu de ${Math.round(course - RESERVE)}`)
    if (Math.abs(bas - (releve.sol + INTERSTICE)) > 2)
      griefs.push(`pli complet : bord bas à ${bas} au lieu de ${releve.sol + INTERSTICE}`)
    // 🔴 LES CÔTÉS RENTRENT À LA GOUTTIÈRE DE LA PASTILLE, pas à 0 (sinon bande
    // pleine largeur avant la carte).
    if (Math.abs(cote - margeH) > 3)
      griefs.push(`pli complet : côtés à ${cote} au lieu de ${Math.round(margeH)} — bande pleine largeur ?`)
    if (Math.abs(visible - HAUTEUR_PASTILLE) > 2)
      griefs.push(`pli complet : ${visible} px visibles au lieu de ${HAUTEUR_PASTILLE} — ligne fine ?`)
    // 🔴 JAMAIS LA TOPBAR DU PLEIN DANS LA FENTE (le chevron de repli).
    if (releve.dansLaFente.some((s) => /Retour au module/i.test(s)))
      griefs.push('pli complet : la topbar (chevron « Retour au module ») est dans la fente')
  } else {
    griefs.push('pli complet : la feuille a disparu avant la mesure')
  }

  expect(griefs, `ce qui cloche :\n  · ${griefs.join('\n  · ')}`).toEqual([])
  expect(pageErrors, `exception client : ${pageErrors.join(' · ')}`).toEqual([])
})
