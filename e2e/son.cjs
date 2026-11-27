// PILOTER UN <audio> SANS SE MENTIR
//
// Trois règles, apprises chacune au prix d'une mesure fausse. Elles vivent ici
// et non recopiées dans chaque sonde : une règle subtile en deux copies finit
// toujours par n'en avoir qu'une de juste, sans qu'on sache laquelle.
const { expect } = require('@playwright/test')

/**
 * ── 🔴 UN SEUL `<audio>`, ET IL N'EST PLUS DANS LE LECTEUR ──────────────────
 *
 * Ce sélecteur valait `.lecteur-ecoute audio` jusqu'au 20 novembre 2026, quand
 * le son a déménagé dans la coquille pour survivre aux changements d'écran. Il
 * vit maintenant à la racine, hors de toute page — c'est tout le point.
 *
 * 🧭 ET C'EST LE FILET QUI L'A DIT. Quatre sondes sont tombées sur ce seul
 * sélecteur à la première exécution après le déménagement, en nommant la
 * cause ; sans elles, le symptôme aurait été « le son s'arrête parfois »,
 * trois jours plus tard, sans rien pour le rattacher à ce chantier.
 *
 * ⚠️ NON BORNÉ, DONC, ET C'EST VÉRIFIÉ PLUTÔT QUE SUPPOSÉ : l'application ne
 * rend qu'UN élément de son, celui de `lecteur-global.tsx`.
 */
const AUDIO = 'audio'

/**
 * ── 🔴 « LA DURÉE EST CONNUE » NE VEUT PAS DIRE « C'EST LA BONNE PISTE » ────
 *
 * D'une leçon à l'autre, la navigation est côté client : React garde **le même
 * nœud `<audio>`** et ne change que son `src`. Entre le clic et ce changement,
 * le nœud porte encore la piste PRÉCÉDENTE — déjà chargée, donc de durée
 * parfaitement finie. Une sonde qui attend « une durée » voit là son feu vert,
 * pose son déplacement sur l'ancienne piste, et le chargement de la nouvelle le
 * remet à zéro. Relevé deux fois de suite : 200 s demandés, 13,8 s mesurés.
 *
 * 🧭 LE NOM DE LA RESSOURCE FAIT DONC PARTIE DE CE QU'ON VÉRIFIE. C'est la
 * même leçon que les tuiles de la carte, où le nom de l'archive devait changer
 * avec son contenu : sans lui, on mesure l'ancienne en croyant tenir la neuve.
 *
 * ⚠️ ET JAMAIS `waitFor('attached')` SEUL AVANT UN DÉPLACEMENT : avant
 * `loadedmetadata`, poser `currentTime` est ignoré **en silence**.
 */
async function attendrePiste(page, avant = null) {
  await page.locator(AUDIO).waitFor({ state: 'attached', timeout: 20_000 })
  await page.waitForFunction(
    ({ s, avant }) => {
      const a = document.querySelector(s)
      if (!a || !a.currentSrc) return false
      if (avant && a.currentSrc === avant) return false
      return Number.isFinite(a.duration) && a.duration > 0
    },
    { s: AUDIO, avant },
    { timeout: 30_000 },
  )
  return page.evaluate((s) => document.querySelector(s).currentSrc, AUDIO)
}

/**
 * Mettre le son en marche, et savoir qu'il marche.
 *
 * ── 🔴 NI `paused`, NI L'ÉVÉNEMENT `playing` ───────────────────────────────
 *
 * Deux définitions essayées, toutes deux fausses, et chacune d'une façon
 * différente :
 *
 *   · **`paused === false`** est vrai DÈS l'appel à `play()`, alors que le son
 *     ne part qu'au premier octet décodé. Une sonde qui lisait l'état du
 *     lecteur dans cet intervalle accusait l'app de ne pas l'annoncer.
 *   · **l'événement `playing`** ne part qu'UNE FOIS, et rien ne garantit qu'on
 *     écoute déjà quand il part. Après un changement de piste il arrivait
 *     avant qu'on ait posé l'oreille : le témoin restait à faux pendant que le
 *     lecteur affichait « Mettre en pause » et avançait tranquillement.
 *
 * 🧭 ON MESURE DONC LE FAIT, PAS L'ANNONCE : la tête de lecture AVANCE. Un
 * fait se relit à volonté, un événement se manque.
 */
async function lancer(page) {
  await page.evaluate((s) => {
    window.__depart = document.querySelector(s).currentTime
  }, AUDIO)
  // ⚠️ On ne clique que si c'est à l'arrêt : la page porte `auto`, elle joue
  // peut-être déjà — et un clic de plus la mettrait en pause.
  if (await page.evaluate((s) => !!document.querySelector(s)?.paused, AUDIO))
    await page.locator('.lecteur-ecoute button[aria-label="Écouter la leçon"]').click()
  await expect
    .poll(
      () =>
        page.evaluate((s) => {
          const a = document.querySelector(s)
          return !a.paused && a.currentTime > window.__depart + 0.3
        }, AUDIO),
      { timeout: 25_000 },
    )
    .toBe(true)
}

const ou = (page) => page.evaluate((s) => document.querySelector(s)?.currentTime ?? -1, AUDIO)
const arrete = (page) => page.evaluate((s) => document.querySelector(s)?.paused, AUDIO)

/** La page d'écoute de la première leçon du module 1. */
/**
 * ── 🔴 DEUX PORTES, ET LA SECONDE EST NOUVELLE ────────────────────────────
 *
 * Depuis le 21 novembre 2026 au soir, la rangée « Écouter / Lire » de
 * l'accueil d'un module **s'efface quand le lecteur réduit joue ce
 * module-là** : il rend déjà les deux services, et trois meubles empilés
 * faisaient 226 px, soit un quart de l'écran.
 *
 * 🔴 CE HELPER CHERCHAIT « Écouter » ET RIEN D'AUTRE. Il tenait tant qu'un
 * test n'ouvrait l'écoute qu'une fois ; au deuxième passage la rangée
 * n'était plus là, et il attendait cinq minutes un lien qui ne reviendrait
 * jamais. Le produit allait bien, c'est la sonde qui ne connaissait qu'une
 * porte.
 *
 * 🧭 ON PREND CELLE QUI EST OUVERTE : la rangée quand elle est là, la
 * pastille sinon — qui mène précisément à la leçon qu'on écoute.
 */
async function ouvrirEcoute(page) {
  await page.goto('/parcours', { waitUntil: 'domcontentloaded' })
  const href = await page.locator('a[data-module="1"]').getAttribute('href')
  await page.goto(href, { waitUntil: 'domcontentloaded' })
  const ecouter = page.getByRole('link', { name: 'Écouter' })
  const pastille = page.locator('[data-pastille-vers-lecon]')
  await expect
    .poll(async () => (await ecouter.count()) + (await pastille.count()), { timeout: 20_000 })
    .toBeGreaterThan(0)
  await ((await ecouter.count()) ? ecouter : pastille).first().click()
  return attendrePiste(page)
}

/**
 * ── 🔬 ATTENDRE QUE LE MORPH `layoutId` SE POSE (27 novembre 2026) ──────────
 *
 * Le cadre d'écoute MORPHE (~500 ms) entre la pastille et le plein écran. En
 * quittant `/ecouter`, le plein (`PleinEcoute`, la feuille) reste MONTÉ pendant
 * tout le morph — il porte alors SA barre du livre et SON lien « Lire », qui
 * DOUBLENT ceux de l'écran de dessous. Mesurer avant la pose lit un transitoire :
 * colonne du titre à 362 px au lieu de 203, DEUX `[data-barre-bas]`, DEUX « Lire »,
 * et la carte réduite encore absente (auto-attendue à l'infini par un locator).
 *
 * 🔴 ON ATTEND LA POSITION, PAS SEULEMENT LA HAUTEUR. Le FOND (`data-pastille-carte`)
 * porte le morph : à hauteur figée (48), son BAS descend encore d'une frame
 * pendant que `bas` se recale. Le repos, c'est hauteur ET bas immobiles. Sans
 * pastille (`-1,-1`), il n'y a rien à attendre.
 *
 * 🧭 CENTRALISÉ ICI, ET PAS RECOPIÉ : toute sonde qui quitte `/ecouter` et
 * mesure doit `posee()` d'abord — c'est la même règle pour toutes.
 */
async function posee(page) {
  let avant = [-2, -2]
  await expect
    .poll(
      async () => {
        const v = await page.evaluate(() => {
          const e = document.querySelector('[data-pastille-carte]')
          if (!e) return [-1, -1]
          const r = e.getBoundingClientRect()
          return [Math.round(r.height), Math.round(r.bottom)]
        })
        if (v[0] === -1) return true
        const stable = v[0] === avant[0] && v[1] === avant[1] && v[0] > 0
        avant = v
        return stable
      },
      { timeout: 6000, intervals: [120, 120, 120, 120, 120, 120, 120] },
    )
    .toBe(true)
}

module.exports = { AUDIO, attendrePiste, lancer, ou, arrete, ouvrirEcoute, posee }
