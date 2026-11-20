// PILOTER UN <audio> SANS SE MENTIR
//
// Trois règles, apprises chacune au prix d'une mesure fausse. Elles vivent ici
// et non recopiées dans chaque sonde : une règle subtile en deux copies finit
// toujours par n'en avoir qu'une de juste, sans qu'on sache laquelle.
const { expect } = require('@playwright/test')

/** ⚠️ Borné au lecteur : la page peut porter d'autres sons. */
const AUDIO = '.lecteur-ecoute audio'

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
async function ouvrirEcoute(page) {
  await page.goto('/parcours', { waitUntil: 'domcontentloaded' })
  const href = await page.locator('a[data-module="1"]').getAttribute('href')
  await page.goto(href, { waitUntil: 'domcontentloaded' })
  const ecouter = page.getByRole('link', { name: 'Écouter' })
  await expect(ecouter).toBeVisible({ timeout: 20_000 })
  await ecouter.click()
  return attendrePiste(page)
}

module.exports = { AUDIO, attendrePiste, lancer, ou, arrete, ouvrirEcoute }
